// ============================================================================
// DISPATCH WORKER
// ============================================================================
// Polls queued requests, runs matching, and creates offers to top candidate

// Load environment variables first
import * as dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import { findMatches } from '../domain/matching/matcher';
import { logAudit } from '../services/audit.service';
import { emitRealtimeEventToDb } from '../realtime/emitToDb';

const POLL_INTERVAL = parseInt(process.env.WORKER_POLL_INTERVAL || '15000', 10);
const OFFER_TIMEOUT = 3 * 60 * 1000; // 3 minutes in milliseconds

export class DispatchWorker {
  constructor(private pool: Pool) {}

  async start(): Promise<void> {
    console.log('🚀 Dispatch worker started');
    console.log(`⏱️ Poll interval: ${POLL_INTERVAL}ms, Offer timeout: ${OFFER_TIMEOUT}ms`);

    // Start polling
    this.poll();

    // Periodic polling
    setInterval(() => this.poll(), POLL_INTERVAL);
  }

  private async poll(): Promise<void> {
    try {
      await this.processQueuedRequests();
      await this.handleExpiredOffers();
    } catch (err) {
      console.error('❌ Dispatch worker error:', err);
    }
  }

  private async processQueuedRequests(): Promise<void> {
    const queued = await this.pool.query(
      `SELECT id FROM care_requests 
       WHERE status = 'queued' 
       ORDER BY urgency DESC, created_at ASC
       LIMIT 10`
    );

    for (const request of queued.rows) {
      await this.processRequest(request.id);
    }
  }

  private async processRequest(requestId: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      // Lock the request row to prevent concurrent assignment
      const request = await client.query(
        `SELECT * FROM care_requests WHERE id = $1 FOR UPDATE`,
        [requestId]
      );

      if (request.rows.length === 0) {
        return;
      }

      const requestRow = request.rows[0];

      // Check if already has an active offer
      const activeOffer = await client.query(
        `SELECT id FROM visit_assignments 
         WHERE request_id = $1 AND offer_expires_at > NOW() AND accepted_at IS NULL AND declined_at IS NULL`,
        [requestId]
      );

      if (activeOffer.rows.length > 0) {
        // Already has an active offer
        return;
      }

      // Find top match
      const matches = await findMatches(this.pool, requestId);

      if (!matches.topCandidate) {
        console.log(`⚠️  No matches found for request ${requestId}`);
        return;
      }

      const topProfessional = matches.topCandidate.professionalId;

      // Create offer
      const offerExpiresAt = new Date(Date.now() + OFFER_TIMEOUT);

      const assignment = await client.query(
        `INSERT INTO visit_assignments (request_id, professional_id, offer_expires_at)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [requestId, topProfessional, offerExpiresAt]
      );

      // Publish real-time event to database for relay
      await emitRealtimeEventToDb(this.pool, 'OFFER_CREATED', {
        requestId,
        offerId: assignment.rows[0].id,
        professionalId: topProfessional,
        clientId: requestRow.client_id,
        offerExpiresAt: offerExpiresAt.toISOString(),
      });

      // Update request status
      await client.query(
        `UPDATE care_requests SET status = 'offered', updated_at = NOW() WHERE id = $1`,
        [requestId]
      );

      // Emit status change event for Admin dashboard + Client notifications
      await emitRealtimeEventToDb(this.pool, 'REQUEST_STATUS_CHANGED', {
        requestId,
        professionalId: topProfessional,
        clientId: requestRow.client_id,
        oldStatus: 'queued',
        newStatus: 'offered',
      });

      // Create notification
      const professional = await client.query(
        `SELECT email FROM users WHERE id = $1`,
        [topProfessional]
      );

      if (professional.rows.length > 0) {
        await client.query(
          `INSERT INTO notification_outbox (channel, to_address, template, payload_json)
           VALUES ($1, $2, $3, $4)`,
          [
            'email',
            professional.rows[0].email,
            'offer_created',
            JSON.stringify({
              requestId,
              serviceType: requestRow.service_type,
              address: requestRow.address_text,
              preferredStart: requestRow.preferred_start,
              offerExpiresAt,
              score: matches.topCandidate.score,
            }),
          ]
        );
      }

      // Audit log
      await logAudit(client, {
        actionType: 'OFFER_CREATED',
        entityType: 'visit_assignments',
        entityId: assignment.rows[0].id,
        metadata: {
          requestId,
          professionalId: topProfessional,
          matchScore: matches.topCandidate.score,
        },
      });

      console.log(
        `✅ Offer created: ${requestId} → ${topProfessional} (score: ${matches.topCandidate.score.toFixed(1)})`
      );
    } finally {
      client.release();
    }
  }

  private async handleExpiredOffers(): Promise<void> {
    const expired = await this.pool.query(
      `SELECT id, request_id, professional_id FROM visit_assignments 
       WHERE offer_expires_at < NOW() 
       AND accepted_at IS NULL 
       AND declined_at IS NULL`
    );

    for (const assignment of expired.rows) {
      // Fetch clientId from the request
      const requestData = await this.pool.query(
        `SELECT client_id FROM care_requests WHERE id = $1`,
        [assignment.request_id]
      );
      const clientId = requestData.rows[0]?.client_id;

      await this.pool.query(
        `UPDATE visit_assignments 
         SET declined_at = NOW(), decline_reason = 'timeout'
         WHERE id = $1`,
        [assignment.id]
      );

      // Publish real-time event to database for relay
      await emitRealtimeEventToDb(this.pool, 'OFFER_EXPIRED', {
        requestId: assignment.request_id,
        offerId: assignment.id,
        professionalId: assignment.professional_id,
        clientId,
      });

      // Requeue the request
      await this.pool.query(
        `UPDATE care_requests SET status = 'queued' WHERE id = $1`,
        [assignment.request_id]
      );

      console.log(
        `⏳ Offer expired and request requeued: ${assignment.request_id}`
      );

      // Try next candidate
      setImmediate(() => this.processRequest(assignment.request_id));
    }
  }
}

// ============================================================================
// MAIN EXECUTION (when run as standalone process)
// ============================================================================

if (require.main === module) {
  (async () => {
    try {
      const { pool } = await import('../db');
      const worker = new DispatchWorker(pool);
      
      await worker.start();

      // Handle graceful shutdown
      process.on('SIGTERM', async () => {
        console.log('SIGTERM received, shutting down worker...');
        try {
          await pool.end();
          console.log('Database connections closed');
        } catch (err) {
          console.error('Error closing database:', err);
        }
        process.exit(0);
      });

      process.on('SIGINT', async () => {
        console.log('\nSIGINT received, shutting down worker...');
        try {
          await pool.end();
          console.log('Database connections closed');
        } catch (err) {
          console.error('Error closing database:', err);
        }
        process.exit(0);
      });

    } catch (err) {
      console.error('Failed to start dispatch worker:', err);
      process.exit(1);
    }
  })();
}

export default DispatchWorker;
