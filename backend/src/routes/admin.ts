// ============================================================================
// ADMIN ROUTES
// ============================================================================

import { Router, Response } from 'express';
import { Pool } from 'pg';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import { UserRole } from '../types/index';
import { emitRealtimeEventToDb } from '../realtime/emitToDb';
import { writeAudit } from '../audit/audit';

export function createAdminRouter(pool: Pool) {
  const router = Router();

  // Dashboard and Professional endpoints (existing routes)
  setupDashboardRoutes(router, pool);
  
  // Phase 3: Offer and Activity endpoints
  setupActivityRoutes(router, pool);
  setupOfferRoutes(router, pool);
  
  // Phase 3.2: Audit trail
  setupAuditRoutes(router, pool);
  
  // Phase 3.3A: Webhook reliability
  setupWebhookRoutes(router, pool);
  
  // Phase 4: Admin request management endpoints
  setupRequestAdminRoutes(router, pool);

  // Phase 5: Global search
  setupSearchRoutes(router, pool);

  return router;
}

// ============================================================================
// DASHBOARD ROUTES
// ============================================================================

function setupDashboardRoutes(router: Router, pool: Pool) {
  /**
   * Get admin dashboard data (Postgres-based)
   * GET /admin/dashboard
   */
  router.get(
    '/dashboard',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (_req: AuthRequest, res: Response): Promise<void> => {
      try {
        // For development, return mock data to display UI
        if (process.env.NODE_ENV === 'development') {
          res.json({
            success: true,
            data: {
              stats: {
                totalUsers: 3,
                totalRequests: 3,
                queuedRequests: 1,
                offeredRequests: 2,
                acceptedRequests: 0,
                enRouteRequests: 0,
                completedRequests: 0,
                cancelledRequests: 0,
              },
              userBreakdown: {
                nurses: 2,
                doctors: 1,
                clients: 3,
              },
            },
          });
          return;
        }

        const usersCount = await pool.query(`SELECT COUNT(*)::int AS n FROM users`);
        const reqCount = await pool.query(`SELECT COUNT(*)::int AS n FROM care_requests`);

        const statusCounts = await pool.query(
          `SELECT status, COUNT(*)::int AS n
           FROM care_requests
           GROUP BY status`
        );

        const breakdown = await pool.query(
          `SELECT role, COUNT(*)::int AS n
           FROM users
           GROUP BY role`
        );

        const byStatus: Record<string, number> = {};
        statusCounts.rows.forEach((r: any) => (byStatus[String(r.status).toLowerCase()] = r.n));

        const byRole: Record<string, number> = {};
        breakdown.rows.forEach((r: any) => (byRole[String(r.role).toLowerCase()] = r.n));

        res.json({
          success: true,
          data: {
            stats: {
              totalUsers: usersCount.rows[0].n,
              totalRequests: reqCount.rows[0].n,
              queuedRequests: byStatus.queued || 0,
              offeredRequests: byStatus.offered || 0,
              acceptedRequests: byStatus.accepted || 0,
              enRouteRequests: byStatus.en_route || 0,
              completedRequests: byStatus.completed || 0,
              cancelledRequests: byStatus.cancelled || 0,
            },
            userBreakdown: {
              nurses: byRole.nurse || 0,
              doctors: byRole.doctor || 0,
              clients: byRole.client || 0,
            },
          },
        });
      } catch (err) {
        console.error('Admin dashboard error:', err);
        res.status(500).json({ error: 'Failed to load dashboard' });
      }
    }
  );

  /**
   * Get all healthcare professionals (Postgres-based)
   * GET /admin/professionals
   */
  router.get(
    '/professionals',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (_req: AuthRequest, res: Response): Promise<void> => {
      try {
        // Mock data for development
        if (process.env.NODE_ENV === 'development') {
          const mockProfessionals = [
            {
              id: 'prof-1',
              name: 'Dr. Sarah Smith',
              email: 'dr.smith@homecare.local',
              role: 'doctor',
              location: '(555) 123-4567',
              isActive: true,
            },
            {
              id: 'prof-2',
              name: 'Nurse John Johnson',
              email: 'nurse.john@homecare.local',
              role: 'nurse',
              location: '(555) 234-5678',
              isActive: true,
            },
            {
              id: 'prof-3',
              name: 'Nurse Maria Garcia',
              email: 'nurse.maria@homecare.local',
              role: 'nurse',
              location: '(555) 345-6789',
              isActive: true,
            },
          ];

          res.json({ success: true, data: mockProfessionals });
          return;
        }

        const result = await pool.query(
          `SELECT id, name, email, role, phone, is_active
           FROM users
           WHERE role IN ('nurse', 'doctor')
           ORDER BY name`
        );

        const professionals = result.rows.map((p: any) => ({
          id: p.id,
          name: p.name,
          email: p.email,
          role: p.role,
          location: p.phone || null,
          isActive: p.is_active,
        }));

        res.json({ success: true, data: professionals });
      } catch (err) {
        console.error('Error fetching professionals:', err);
        res.status(500).json({ error: 'Failed to fetch professionals' });
      }
    }
  );

  /**
   * Get all clients (Postgres-based)
   * GET /admin/clients
   */
  router.get(
    '/clients',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (_req: AuthRequest, res: Response): Promise<void> => {
      try {
        const result = await pool.query(
          `SELECT id, name, email, phone, is_active
           FROM users
           WHERE role = 'client'
           ORDER BY name`
        );

        res.json({
          success: true,
          data: result.rows.map((c: any) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            location: c.phone || null,
            isActive: c.is_active,
          })),
        });
      } catch (err) {
        console.error('Error fetching clients:', err);
        res.status(500).json({ error: 'Failed to fetch clients' });
      }
    }
  );

  /**
   * Deactivate a user (Postgres-based)
   * PUT /admin/users/:id/deactivate
   */
  router.put(
    '/users/:id/deactivate',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const result = await pool.query(
          `UPDATE users SET is_active = false WHERE id = $1 RETURNING *`,
          [req.params.id]
        );

        if (result.rows.length === 0) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        res.json({ success: true, message: 'User deactivated' });
      } catch (err) {
        console.error('Error deactivating user:', err);
        res.status(500).json({ error: 'Failed to deactivate user' });
      }
    }
  );

  /**
   * Reactivate a user (Postgres-based)
   * PUT /admin/users/:id/reactivate
   */
  router.put(
    '/users/:id/reactivate',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const result = await pool.query(
          `UPDATE users SET is_active = true WHERE id = $1 RETURNING *`,
          [req.params.id]
        );

        if (result.rows.length === 0) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        res.json({ success: true, message: 'User reactivated' });
      } catch (err) {
        console.error('Error reactivating user:', err);
        res.status(500).json({ error: 'Failed to reactivate user' });
      }
    }
  );

  /**
   * Get dispatch queue
   * GET /admin/queue
   */
  router.get(
    '/queue',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        res.json({
          success: true,
          data: {
            queue: [],
            total: 0,
          },
        });
      } catch (err) {
        console.error('Error fetching queue:', err);
        res.status(500).json({ error: 'Failed to fetch queue' });
      }
    }
  );

  /**
   * Get audit logs
   * GET /admin/audit-logs
   */
  router.get(
    '/audit-logs',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        res.json({
          success: true,
          data: [],
        });
      } catch (err) {
        console.error('Error fetching audit logs:', err);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
      }
    }
  );

  /**
   * Get system health and statistics
   * GET /admin/stats
   */
  router.get(
    '/stats',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        res.json({
          success: true,
          data: {
            queuedRequests: 0,
            offeredRequests: 0,
            assignedRequests: 0,
            completedRequests: 0,
            totalProfessionals: 0,
            totalClients: 0,
            avgQueueTimeSeconds: 0,
            pendingNotifications: 0,
          },
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
      }
    }
  );
}

// ============================================================================
// PHASE 3: ACTIVITY ROUTES
// ============================================================================

function setupActivityRoutes(router: Router, pool: Pool) {
  /**
   * Get activity feed (last 20 events)
   * GET /admin/activity
   */
  router.get(
    '/activity',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (_req: AuthRequest, res: Response): Promise<void> => {
      try {
        const result = await pool.query(
          `SELECT id, type, created_at, payload
           FROM realtime_events
           ORDER BY created_at DESC
           LIMIT 20`
        );

        const events = result.rows.map((row: any) => ({
          id: row.id,
          type: row.type,
          timestamp: new Date(row.created_at).getTime(),
          ...(row.payload || {}),
        }));

        res.json({ success: true, data: events });
      } catch (err) {
        console.error('Error fetching activity feed:', err);
        res.status(500).json({ error: 'Failed to fetch activity feed' });
      }
    }
  );
}

// ============================================================================
// PHASE 3: OFFER ROUTES
// ============================================================================

function setupOfferRoutes(router: Router, pool: Pool) {
  /**
   * Create an offer to a professional for a care request
   * POST /admin/requests/:id/offer
   * Body: { professionalId: string }
   * Requires: offers:create, offers:override
   */
  router.post(
    '/requests/:id/offer',
    authMiddleware,
    requirePermission(pool, 'offers:create', 'offers:override'),
    async (req: AuthRequest, res: Response): Promise<void> => {
      const requestId = req.params.id;
      const { professionalId } = req.body || {};

      if (!professionalId) {
        res.status(400).json({ error: 'professionalId is required' });
        return;
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Lock request
        const rq = await client.query(
          `SELECT id, client_id, status
           FROM care_requests
           WHERE id = $1
           FOR UPDATE`,
          [requestId]
        );

        if (rq.rows.length === 0) {
          await client.query('ROLLBACK');
          res.status(404).json({ error: 'Request not found' });
          return;
        }

        const requestRow = rq.rows[0];
        const clientId = requestRow.client_id;

        // validate professional
        const pro = await client.query(
          `SELECT id, role, is_active
           FROM users
           WHERE id = $1`,
          [professionalId]
        );

        if (pro.rows.length === 0) {
          await client.query('ROLLBACK');
          res.status(404).json({ error: 'Professional not found' });
          return;
        }

        const role = String(pro.rows[0].role).toLowerCase();
        if (!pro.rows[0].is_active || (role !== 'nurse' && role !== 'doctor')) {
          await client.query('ROLLBACK');
          res.status(400).json({ error: 'Professional must be an active nurse/doctor' });
          return;
        }

        // if active offer exists, decline it (admin override)
        const activeOffer = await client.query(
          `SELECT id, professional_id
           FROM visit_assignments
           WHERE request_id = $1
             AND offer_expires_at > NOW()
             AND accepted_at IS NULL
             AND declined_at IS NULL
           LIMIT 1
           FOR UPDATE`,
          [requestId]
        );

        if (activeOffer.rows.length > 0) {
          const prev = activeOffer.rows[0];

          await client.query(
            `UPDATE visit_assignments
             SET declined_at = NOW(), decline_reason = $1
             WHERE id = $2`,
            ['admin_reassign', prev.id]
          );

          await emitRealtimeEventToDb(pool, 'OFFER_DECLINED', {
            offerId: prev.id,
            requestId,
            professionalId: prev.professional_id,
            clientId,
            declineReason: 'admin_reassign',
          });
        }

        // create new offer (3 minutes)
        const offerExpiresAt = new Date(Date.now() + 3 * 60 * 1000);

        const ins = await client.query(
          `INSERT INTO visit_assignments (request_id, professional_id, offer_expires_at)
           VALUES ($1, $2, $3)
           RETURNING id, offer_expires_at`,
          [requestId, professionalId, offerExpiresAt]
        );

        const offerId = ins.rows[0].id;
        const expiresIso = new Date(ins.rows[0].offer_expires_at).toISOString();

        // update request status
        await client.query(
          `UPDATE care_requests
           SET status='offered',
               professional_id=$2,
               updated_at=NOW()
           WHERE id=$1`,
          [requestId, professionalId]
        );

        await client.query('COMMIT');

        // emit events
        await emitRealtimeEventToDb(pool, 'REQUEST_STATUS_CHANGED', {
          requestId,
          clientId,
          oldStatus: requestRow.status,
          newStatus: 'offered',
        });

        await emitRealtimeEventToDb(pool, 'OFFER_CREATED', {
          offerId,
          requestId,
          professionalId,
          clientId,
          offerExpiresAt: expiresIso,
        });

        // Log audit event
        await writeAudit(pool, {
          actorUserId: req.user?.userId,
          actorRole: req.user?.role,
          action: 'REQUEST_OFFERED',
          entityType: 'care_request',
          entityId: requestId,
          severity: 'info',
          ip: req.ip,
          userAgent: req.get('user-agent') || null,
          metadata: { professionalId, offerId, offerExpiresAt: expiresIso },
        });

        res.json({
          success: true,
          data: { offerId, requestId, professionalId, offerExpiresAt: expiresIso },
        });
      } catch (err) {
        try { await client.query('ROLLBACK'); } catch {}
        console.error('Error creating offer:', err);
        res.status(500).json({ error: 'Failed to create offer' });
      } finally {
        client.release();
      }
    }
  );
}

// ============================================================================
// REQUEST ADMIN MANAGEMENT ROUTES
// ============================================================================

// ============================================================================
// REQUEST ACTION ROUTES (Phase 3)
// ============================================================================

const VALID_URGENCY = new Set(['low', 'medium', 'high', 'critical']);

// helper: normalize + validate
function norm(v: any) {
  return String(v ?? '').trim().toLowerCase();
}

function setupRequestAdminRoutes(router: Router, pool: Pool) {
  /**
   * Requeue request (admin)
   * POST /admin/requests/:id/requeue
   * Allowed from: offered, accepted, en_route (and even queued is idempotent)
   * Sets status -> queued
   * Clears professional_id and expires any active offers
   */
  router.post(
    '/requests/:id/requeue',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response): Promise<void> => {
      const requestId = req.params.id;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const rq = await client.query(
          `SELECT id, client_id, status, professional_id
           FROM care_requests
           WHERE id = $1
           FOR UPDATE`,
          [requestId]
        );

        if (rq.rows.length === 0) {
          await client.query('ROLLBACK');
          res.status(404).json({ error: 'Request not found' });
          return;
        }

        const row = rq.rows[0];
        const oldStatus = norm(row.status);

        // Expire any active offers (if exists)
        const activeOffer = await client.query(
          `SELECT id, professional_id
           FROM visit_assignments
           WHERE request_id = $1
             AND offer_expires_at > NOW()
             AND accepted_at IS NULL
             AND declined_at IS NULL
           LIMIT 1
           FOR UPDATE`,
          [requestId]
        );

        if (activeOffer.rows.length > 0) {
          const offer = activeOffer.rows[0];
          await client.query(
            `UPDATE visit_assignments
             SET declined_at = NOW(),
                 decline_reason = $1
             WHERE id = $2`,
            ['admin_requeue', offer.id]
          );

          await emitRealtimeEventToDb(pool, 'OFFER_DECLINED', {
            offerId: offer.id,
            requestId,
            professionalId: offer.professional_id,
            clientId: row.client_id,
            declineReason: 'admin_requeue',
          });
        }

        // Update request -> queued and clear assigned professional
        await client.query(
          `UPDATE care_requests
           SET status = 'queued',
               professional_id = NULL,
               updated_at = NOW()
           WHERE id = $1`,
          [requestId]
        );

        await client.query('COMMIT');

        await emitRealtimeEventToDb(pool, 'REQUEST_STATUS_CHANGED', {
          requestId,
          clientId: row.client_id,
          oldStatus,
          newStatus: 'queued',
          actorRole: 'admin',
          action: 'requeue',
        });

        // Log audit event
        await writeAudit(pool, {
          actorUserId: req.user?.userId,
          actorRole: req.user?.role,
          action: 'REQUEST_REQUEUED',
          entityType: 'care_request',
          entityId: requestId,
          severity: 'info',
          ip: req.ip,
          userAgent: req.get('user-agent') || null,
          metadata: { previousStatus: oldStatus, newStatus: 'queued' },
        });

        res.json({ success: true, data: { requestId, status: 'queued' } });
      } catch (err) {
        try { await client.query('ROLLBACK'); } catch {}
        console.error('Requeue error:', err);
        res.status(500).json({ error: 'Failed to requeue request' });
      } finally {
        client.release();
      }
    }
  );

  /**
   * Cancel request (admin)
   * POST /admin/requests/:id/cancel
   * Allowed from: queued, offered, accepted, en_route
   * Sets status -> cancelled
   * Expires any active offer
   */
  router.post(
    '/requests/:id/cancel',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response): Promise<void> => {
      const requestId = req.params.id;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const rq = await client.query(
          `SELECT id, client_id, status
           FROM care_requests
           WHERE id = $1
           FOR UPDATE`,
          [requestId]
        );

        if (rq.rows.length === 0) {
          await client.query('ROLLBACK');
          res.status(404).json({ error: 'Request not found' });
          return;
        }

        const row = rq.rows[0];
        const oldStatus = norm(row.status);

        if (oldStatus === 'completed' || oldStatus === 'cancelled') {
          await client.query('ROLLBACK');
          res.status(400).json({ error: `Cannot cancel a ${oldStatus} request` });
          return;
        }

        // Expire any active offer
        const activeOffer = await client.query(
          `SELECT id, professional_id
           FROM visit_assignments
           WHERE request_id = $1
             AND offer_expires_at > NOW()
             AND accepted_at IS NULL
             AND declined_at IS NULL
           LIMIT 1
           FOR UPDATE`,
          [requestId]
        );

        if (activeOffer.rows.length > 0) {
          const offer = activeOffer.rows[0];
          await client.query(
            `UPDATE visit_assignments
             SET declined_at = NOW(),
                 decline_reason = $1
             WHERE id = $2`,
            ['admin_cancel', offer.id]
          );

          await emitRealtimeEventToDb(pool, 'OFFER_DECLINED', {
            offerId: offer.id,
            requestId,
            professionalId: offer.professional_id,
            clientId: row.client_id,
            declineReason: 'admin_cancel',
          });
        }

        await client.query(
          `UPDATE care_requests
           SET status = 'cancelled',
               updated_at = NOW()
           WHERE id = $1`,
          [requestId]
        );

        await client.query('COMMIT');

        await emitRealtimeEventToDb(pool, 'REQUEST_STATUS_CHANGED', {
          requestId,
          clientId: row.client_id,
          oldStatus,
          newStatus: 'cancelled',
          actorRole: 'admin',
          action: 'cancel',
        });

        // Log audit event
        await writeAudit(pool, {
          actorUserId: req.user?.userId,
          actorRole: req.user?.role,
          action: 'REQUEST_CANCELLED',
          entityType: 'care_request',
          entityId: requestId,
          severity: 'warning',
          ip: req.ip,
          userAgent: req.get('user-agent') || null,
          metadata: { previousStatus: oldStatus, newStatus: 'cancelled' },
        });

        res.json({ success: true, data: { requestId, status: 'cancelled' } });
      } catch (err) {
        try { await client.query('ROLLBACK'); } catch {}
        console.error('Cancel error:', err);
        res.status(500).json({ error: 'Failed to cancel request' });
      } finally {
        client.release();
      }
    }
  );

  /**
   * Set urgency (admin)
   * POST /admin/requests/:id/urgency
   * Body: { urgency: 'low'|'medium'|'high'|'critical' }
   */
  router.post(
    '/requests/:id/urgency',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response): Promise<void> => {
      const requestId = req.params.id;
      const urgency = norm(req.body?.urgency);

      if (!VALID_URGENCY.has(urgency)) {
        res.status(400).json({ error: 'Invalid urgency value' });
        return;
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const rq = await client.query(
          `SELECT id, client_id, urgency, status
           FROM care_requests
           WHERE id = $1
           FOR UPDATE`,
          [requestId]
        );

        if (rq.rows.length === 0) {
          await client.query('ROLLBACK');
          res.status(404).json({ error: 'Request not found' });
          return;
        }

        const row = rq.rows[0];
        const oldUrgency = norm(row.urgency);

        await client.query(
          `UPDATE care_requests
           SET urgency = $2,
               updated_at = NOW()
           WHERE id = $1`,
          [requestId, urgency]
        );

        await client.query('COMMIT');

        await emitRealtimeEventToDb(pool, 'REQUEST_UPDATED', {
          requestId,
          clientId: row.client_id,
          field: 'urgency',
          oldValue: oldUrgency,
          newValue: urgency,
          actorRole: 'admin',
          action: 'set_urgency',
        });

        // Log audit event
        await writeAudit(pool, {
          actorUserId: req.user?.userId,
          actorRole: req.user?.role,
          action: 'REQUEST_URGENCY_CHANGED',
          entityType: 'care_request',
          entityId: requestId,
          severity: 'info',
          ip: req.ip,
          userAgent: req.get('user-agent') || null,
          metadata: { oldUrgency, newUrgency: urgency },
        });

        res.json({ success: true, data: { requestId, urgency } });
      } catch (err) {
        try { await client.query('ROLLBACK'); } catch {}
        console.error('Urgency error:', err);
        res.status(500).json({ error: 'Failed to update urgency' });
      } finally {
        client.release();
      }
    }
  );
}

// ============================================================================
// GLOBAL SEARCH ROUTES
// ============================================================================

function setupSearchRoutes(router: Router, pool: Pool) {
  /**
   * Global search across requests, users, and events
   * GET /admin/search?q=...&limit=...
   */
  router.get(
    '/search',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response): Promise<void> => {
      const q = String(req.query.q || '').trim();
      const limit = Math.min(parseInt(String(req.query.limit || '10'), 10) || 10, 25);

      if (!q) {
        res.json({ success: true, data: { query: q, results: [] } });
        return;
      }

      const like = `%${q}%`;

      try {
        const [reqs, users, events] = await Promise.all([
          pool.query(
            `SELECT 
               cr.id,
               cr.status,
               cr.urgency,
               cr.service_type,
               cr.address_text,
               cr.description,
               cr.created_at
             FROM care_requests cr
             WHERE
               cr.id::text ILIKE $1 OR
               cr.description ILIKE $1 OR
               cr.address_text ILIKE $1 OR
               cr.service_type::text ILIKE $1 OR
               cr.status::text ILIKE $1 OR
               cr.urgency::text ILIKE $1
             ORDER BY cr.created_at DESC
             LIMIT $2`,
            [like, limit]
          ),

          pool.query(
            `SELECT 
               u.id,
               u.name,
               u.email,
               u.role,
               u.is_active,
               u.created_at
             FROM users u
             WHERE
               u.id::text ILIKE $1 OR
               u.name ILIKE $1 OR
               u.email ILIKE $1 OR
               u.role ILIKE $1
             ORDER BY u.created_at DESC
             LIMIT $2`,
            [like, limit]
          ),

          pool.query(
            `SELECT 
               re.id,
               re.type,
               re.created_at,
               re.payload
             FROM realtime_events re
             WHERE
               re.id::text ILIKE $1 OR
               re.type ILIKE $1 OR
               re.payload::text ILIKE $1
             ORDER BY re.created_at DESC
             LIMIT $2`,
            [like, limit]
          ),
        ]);

        const results = [
          ...reqs.rows.map((r: any) => ({
            kind: 'request',
            id: r.id,
            title: r.description || r.service_type,
            subtitle: `${String(r.status).toUpperCase()} • ${String(r.urgency).toUpperCase()} • ${r.address_text || ''}`,
            meta: { status: r.status, urgency: r.urgency, serviceType: r.service_type },
            createdAt: r.created_at,
          })),
          ...users.rows.map((u: any) => ({
            kind: 'user',
            id: u.id,
            title: u.name,
            subtitle: `${u.email} • ${String(u.role).toUpperCase()} • ${u.is_active ? 'ACTIVE' : 'INACTIVE'}`,
            meta: { role: u.role, isActive: u.is_active },
            createdAt: u.created_at,
          })),
          ...events.rows.map((e: any) => ({
            kind: 'event',
            id: e.id,
            title: e.type,
            subtitle: (() => {
              const p = e.payload || {};
              const parts = [
                p.requestId ? `request ${String(p.requestId).slice(0, 8)}` : '',
                p.professionalId ? `pro ${String(p.professionalId).slice(0, 8)}` : '',
                p.clientId ? `client ${String(p.clientId).slice(0, 8)}` : '',
              ].filter(Boolean);
              return parts.join(' • ') || 'Realtime event';
            })(),
            meta: e.payload || {},
            createdAt: e.created_at,
          })),
        ]
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, limit);

        res.json({
          success: true,
          data: { query: q, results },
        });
      } catch (err) {
        console.error('Global search error:', err);
        res.status(500).json({ error: 'Search failed' });
      }
    }
  );
}

// ============================================================================
// AUDIT ROUTES (Phase 3.2)
// ============================================================================

function setupAuditRoutes(router: Router, pool: Pool) {
  /**
   * Get audit events with filtering
   * GET /admin/audit?limit=50&q=offer&severity=info&entityType=care_request
   */
  router.get(
    '/audit',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const limit = Math.min(parseInt(String(req.query.limit || '50'), 10) || 50, 200);
        const q = String(req.query.q || '').trim().toLowerCase();
        const severity = String(req.query.severity || '').trim().toLowerCase();
        const entityType = String(req.query.entityType || '').trim().toLowerCase();

        const filters: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (severity) {
          filters.push(`LOWER(severity) = $${paramIndex++}`);
          params.push(severity);
        }

        if (entityType) {
          filters.push(`LOWER(entity_type) = $${paramIndex++}`);
          params.push(entityType);
        }

        if (q) {
          filters.push(`(
            LOWER(action) LIKE $${paramIndex++} OR
            LOWER(entity_type) LIKE $${paramIndex++} OR
            CAST(entity_id AS text) ILIKE $${paramIndex++} OR
            CAST(actor_user_id AS text) ILIKE $${paramIndex++}
          )`);
          const like = `%${q}%`;
          params.push(like, like, like, like);
        }

        params.push(limit);

        const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
        const result = await pool.query(
          `SELECT id, actor_user_id, actor_role, action, entity_type, entity_id, severity, metadata, created_at
           FROM audit_events
           ${where}
           ORDER BY created_at DESC
           LIMIT $${paramIndex}`,
          params
        );

        res.json({ success: true, data: result.rows });
      } catch (err) {
        console.error('Audit fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch audit events' });
      }
    }
  );
}
// ============================================================================
// WEBHOOK ROUTES (Phase 3.3A)
// ============================================================================

function setupWebhookRoutes(router: Router, pool: Pool) {
  /**
   * Get webhook jobs (queued, processing, succeeded, failed)
   * GET /admin/webhooks/jobs?status=queued&limit=50
   */
  router.get(
    '/webhooks/jobs',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const limit = Math.min(parseInt(String(req.query.limit || '50'), 10) || 50, 200);
        const status = String(req.query.status || '').trim().toLowerCase();

        let where = '';
        const params: any[] = [limit];

        if (status && ['queued', 'processing', 'succeeded', 'failed', 'dead'].includes(status)) {
          where = `WHERE LOWER(status) = $2`;
          params.unshift(status);
        }

        const query = `
          SELECT id, event_type, status, attempts, max_attempts, last_error, next_attempt_at, created_at, updated_at
          FROM webhook_jobs
          ${where}
          ORDER BY created_at DESC
          LIMIT ${params.length === 2 ? '$2' : '$1'}
        `;

        const result = await pool.query(query, params);
        res.json({ success: true, data: result.rows });
      } catch (err) {
        console.error('Webhook jobs fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch webhook jobs' });
      }
    }
  );

  /**
   * Get dead-letter queue (failed webhooks)
   * GET /admin/webhooks/dead-letters?limit=50
   */
  router.get(
    '/webhooks/dead-letters',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const limit = Math.min(parseInt(String(req.query.limit || '50'), 10) || 50, 200);

        const result = await pool.query(
          `SELECT id, webhook_job_id, event_type, target_url, attempts, max_attempts, last_error, created_at
           FROM webhook_dead_letters
           ORDER BY created_at DESC
           LIMIT $1`,
          [limit]
        );

        res.json({ success: true, data: result.rows });
      } catch (err) {
        console.error('Dead-letter fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch dead-letter queue' });
      }
    }
  );

  /**
   * Requeue a dead-letter job for retry
   * POST /admin/webhooks/:id/requeue
   */
  router.post(
    '/webhooks/:id/requeue',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response): Promise<void> => {
      const jobId = req.params.id;

      try {
        // Get the dead-letter record
        const dlResult = await pool.query(
          `SELECT webhook_job_id, event_type, target_url, payload, attempts, max_attempts, last_error
           FROM webhook_dead_letters
           WHERE id = $1`,
          [jobId]
        );

        if (dlResult.rows.length === 0) {
          res.status(404).json({ error: 'Dead-letter job not found' });
          return;
        }

        const dl = dlResult.rows[0];

        // Reset job to queued
        if (dl.webhook_job_id) {
          await pool.query(
            `UPDATE webhook_jobs
             SET status = 'queued',
                 attempts = 0,
                 next_attempt_at = now(),
                 last_error = NULL,
                 updated_at = now()
             WHERE id = $1`,
            [dl.webhook_job_id]
          );
        } else {
          // Create new job if original was deleted
          await pool.query(
            `INSERT INTO webhook_jobs (event_type, target_url, payload, max_attempts, attempts, next_attempt_at)
             VALUES ($1, $2, $3, $4, $5, now())`,
            [dl.event_type, dl.target_url, dl.payload, dl.max_attempts, 0]
          );
        }

        // Log audit event
        await writeAudit(pool, {
          actorUserId: req.user?.userId,
          actorRole: req.user?.role,
          action: 'WEBHOOK_REQUEUED',
          entityType: 'webhook_job',
          entityId: dl.webhook_job_id || jobId,
          severity: 'info',
          ip: req.ip,
          userAgent: req.get('user-agent') || null,
          metadata: { eventType: dl.event_type, targetUrl: dl.target_url, attempts: dl.attempts },
        });

        res.json({ success: true, message: 'Webhook requeued for delivery' });
      } catch (err) {
        console.error('Webhook requeue error:', err);
        res.status(500).json({ error: 'Failed to requeue webhook' });
      }
    }
  );
}