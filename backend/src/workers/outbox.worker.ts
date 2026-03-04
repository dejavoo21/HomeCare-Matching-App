// ============================================================================
// OUTBOX WORKER - Process transaction-safe events
// ============================================================================

import { Pool } from 'pg';
import { outboxEventsTotal } from '../monitoring/metrics';

/**
 * Outbox event handler - called for each processed event
 * Implement per-event-type logic here
 */
export type OutboxEventHandler = (event: {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload: any;
}) => Promise<void>;

let workerRunning = false;
let eventHandlers: Map<string, OutboxEventHandler> = new Map();

/**
 * Register an event type handler
 * @param eventType Name of the event (e.g., 'OFFER_CREATED', 'REQUEST_ACCEPTED')
 * @param handler Async function to process the event
 */
export function registerOutboxHandler(eventType: string, handler: OutboxEventHandler): void {
  eventHandlers.set(eventType, handler);
  console.log(`[Outbox] Registered handler for ${eventType}`);
}

/**
 * Start the outbox worker
 * Runs every 2 seconds, processes up to 50 unprocessed events
 * @param pool Database connection pool
 */
export function startOutboxWorker(pool: Pool): void {
  if (workerRunning) {
    console.log('[Outbox] Worker already running');
    return;
  }

  workerRunning = true;
  console.log('[Outbox] Worker started');

  setInterval(async () => {
    try {
      await processOutboxEvents(pool);
    } catch (error) {
      console.error('[Outbox] Worker error:', error);
    }
  }, 2000); // Run every 2 seconds
}

/**
 * Process pending events from the outbox
 * Uses database-level locking (SKIP LOCKED) for concurrency safety
 */
export async function processOutboxEvents(pool: Pool): Promise<void> {
  try {
    // Fetch up to 50 unprocessed events with database-level lock
    const result = await pool.query(
      `SELECT id, aggregate_type, aggregate_id, event_type, payload
       FROM event_outbox
       WHERE processed_at IS NULL
         AND failed_at IS NULL
       ORDER BY created_at ASC
       LIMIT 50
       FOR UPDATE SKIP LOCKED`
    );

    if (result.rows.length === 0) {
      return;
    }

    console.log(`[Outbox] Processing ${result.rows.length} events`);

    // Process each event
    for (const event of result.rows) {
      try {
        // Find handler for this event type
        const handler = eventHandlers.get(event.event_type);

        if (!handler) {
          console.warn(`[Outbox] No handler for event type: ${event.event_type}`);
          // Mark as processed anyway (with warning) to avoid infinite loop
          await pool.query(
            `UPDATE event_outbox SET processed_at = NOW() WHERE id = $1`,
            [event.id]
          );
          outboxEventsTotal.inc({ event_type: event.event_type, status: 'no_handler' });
          continue;
        }

        // Execute handler
        await handler(event);

        // Mark as processed
        await pool.query(
          `UPDATE event_outbox SET processed_at = NOW() WHERE id = $1`,
          [event.id]
        );

        outboxEventsTotal.inc({ event_type: event.event_type, status: 'success' });
        console.log(`[Outbox] Processed ${event.event_type} (${event.id})`);
      } catch (error) {
        console.error(`[Outbox] Failed to process event ${event.id}:`, error);

        // Increment retry count
        const retryCount = (event.retry_count || 0) + 1;
        const MAX_RETRIES = 5;

        if (retryCount >= MAX_RETRIES) {
          // Move to dead-letter
          await pool.query(
            `UPDATE event_outbox 
             SET failed_at = NOW(), retry_count = $1, last_error = $2
             WHERE id = $3`,
            [retryCount, String(error), event.id]
          );
          outboxEventsTotal.inc({ event_type: event.event_type, status: 'dead_letter' });
          console.error(`[Outbox] Dead-lettered ${event.event_type} (${event.id}) after ${retryCount} attempts`);
        } else {
          // Increment retry count and try again next interval
          await pool.query(
            `UPDATE event_outbox 
             SET retry_count = $1, last_error = $2
             WHERE id = $3`,
            [retryCount, String(error), event.id]
          );
          outboxEventsTotal.inc({ event_type: event.event_type, status: 'retry' });
        }
      }
    }
  } catch (error) {
    console.error('[Outbox] Error fetching events:', error);
  }
}

/**
 * Enqueue a domain event into the outbox
 * Call this inside a database transaction with your domain changes
 *
 * Usage:
 * ```
 * const client = await pool.connect();
 * try {
 *   await client.query('BEGIN');
 *   // ... do domain changes ...
 *   await enqueueOutboxEvent(client, 'care_request', requestId, 'REQUEST_CREATED', payload);
 *   await client.query('COMMIT');
 * }
 * ```
 */
export async function enqueueOutboxEvent(
  client: any, // Could be Pool or Client
  aggregateType: string,
  aggregateId: string,
  eventType: string,
  payload: any
): Promise<string> {
  const result = await client.query(
    `INSERT INTO event_outbox (aggregate_type, aggregate_id, event_type, payload)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [aggregateType, aggregateId, eventType, JSON.stringify(payload)]
  );

  return result.rows[0].id;
}

/**
 * Get outbox statistics
 * Useful for monitoring dashboards
 */
export async function getOutboxStats(pool: Pool): Promise<any> {
  const result = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE processed_at IS NULL AND failed_at IS NULL) AS pending,
       COUNT(*) FILTER (WHERE processed_at IS NOT NULL) AS processed,
       COUNT(*) FILTER (WHERE failed_at IS NOT NULL) AS dead_lettered
     FROM event_outbox`
  );

  return result.rows[0];
}
