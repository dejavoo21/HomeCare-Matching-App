import type { Pool } from 'pg';

export async function enqueueWebhookDeliveries(
  pool: Pool,
  eventType: string,
  payload: any
): Promise<void> {
  const subs = await pool.query(
    `SELECT id
     FROM webhook_subscriptions
     WHERE is_active = true
       AND (
         event_types = '[]'::jsonb
         OR event_types ? $1
       )`,
    [eventType]
  );

  if (subs.rows.length === 0) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const row of subs.rows) {
      await client.query(
        `INSERT INTO webhook_deliveries
         (subscription_id, event_type, payload, status, attempt_count, max_attempts, next_attempt_at, created_at, updated_at)
         VALUES ($1, $2, $3, 'pending', 0, 6, now(), now(), now())`,
        [row.id, eventType, JSON.stringify(payload)]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    throw err;
  } finally {
    client.release();
  }
}
