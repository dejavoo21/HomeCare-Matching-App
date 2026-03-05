// ============================================================================
// WEBHOOK QUEUE - Enqueue helpers
// ============================================================================

import { Pool } from 'pg';

/**
 * Enqueue a webhook for delivery with automatic retry
 * @param pool PostgreSQL pool
 * @param eventType Event type identifier
 * @param targetUrl Full webhook URL
 * @param payload JSON payload to send
 * @param maxAttempts Max retry attempts (default: 8)
 */
export async function enqueueWebhook(
  pool: Pool,
  eventType: string,
  targetUrl: string,
  payload: any,
  maxAttempts: number = 8
): Promise<string> {
  try {
    const result = await pool.query(
      `INSERT INTO webhook_jobs (event_type, target_url, payload, max_attempts)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [eventType, targetUrl, payload, maxAttempts]
    );
    return result.rows[0].id;
  } catch (err) {
    console.error('Failed to enqueue webhook:', err);
    throw err;
  }
}
