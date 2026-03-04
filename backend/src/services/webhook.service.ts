// ============================================================================
// WEBHOOK QUEUE SERVICE
// ============================================================================
// Reliable event delivery with retry logic & dead-letter handling

import type { Pool } from 'pg';

/**
 * Enqueue webhooks for delivery based on event type
 * Webhooks are delivered asynchronously by the worker
 */
export async function enqueueWebhookDeliveries(pool: Pool, event: any): Promise<void> {
  try {
    // Find all active webhooks subscribed to this event type
    const result = await pool.query(
      `SELECT id FROM webhooks
       WHERE is_active = true AND $1 = ANY(events)`,
      [event.type]
    );

    for (const wh of result.rows) {
      // Insert delivery record
      await pool.query(
        `INSERT INTO webhook_deliveries (webhook_id, event_type, payload, next_attempt_at)
         VALUES ($1, $2, $3, NOW())`,
        [wh.id, event.type, JSON.stringify(event)]
      );
    }
  } catch (err) {
    console.error('Webhook enqueue error:', err);
    throw err;
  }
}

/**
 * Get pending webhook deliveries
 */
export async function getPendingDeliveries(
  pool: Pool,
  limit: number = 20
): Promise<any[]> {
  const result = await pool.query(
    `SELECT d.*, w.url, w.secret_key FROM webhook_deliveries d
     JOIN webhooks w ON w.id = d.webhook_id
     WHERE d.delivered_at IS NULL
       AND d.failed_at IS NULL
       AND d.next_attempt_at <= NOW()
     ORDER BY d.attempt_count ASC, d.next_attempt_at ASC
     LIMIT $1
     FOR UPDATE SKIP LOCKED`,
    [limit]
  );

  return result.rows;
}

/**
 * Mark delivery as successful
 */
export async function markDeliverySuccess(pool: Pool, deliveryId: string): Promise<void> {
  await pool.query(
    `UPDATE webhook_deliveries SET delivered_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [deliveryId]
  );
}

/**
 * Mark delivery as failed (sent to dead letter)
 */
export async function markDeliveryFailed(pool: Pool, deliveryId: string, error: string): Promise<void> {
  await pool.query(
    `UPDATE webhook_deliveries SET failed_at = NOW(), last_error = $2, updated_at = NOW()
     WHERE id = $1`,
    [deliveryId, error]
  );
}

/**
 * Retry a delivery with exponential backoff
 */
export async function retryDelivery(pool: Pool, deliveryId: string, error: string): Promise<void> {
  const result = await pool.query(
    `SELECT attempt_count, max_attempts FROM webhook_deliveries WHERE id = $1`,
    [deliveryId]
  );

  if (result.rows.length === 0) return;

  const { attempt_count, max_attempts } = result.rows[0];

  if (attempt_count >= max_attempts) {
    await markDeliveryFailed(pool, deliveryId, error);
    return;
  }

  // Exponential backoff: 2^attemptCount seconds (max 60 seconds)
  const delaySeconds = Math.min(Math.pow(2, attempt_count), 60);

  await pool.query(
    `UPDATE webhook_deliveries
     SET attempt_count = attempt_count + 1,
         next_attempt_at = NOW() + INTERVAL '${delaySeconds} seconds',
         last_error = $2,
         updated_at = NOW()
     WHERE id = $1`,
    [deliveryId, error]
  );
}
