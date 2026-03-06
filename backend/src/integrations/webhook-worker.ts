import type { Pool } from 'pg';
import { signWebhookPayload } from './webhook-signing';

function getBackoffSeconds(attempt: number): number {
  const schedule = [15, 60, 300, 900, 1800, 3600]; // 15s, 1m, 5m, 15m, 30m, 60m
  return schedule[Math.min(attempt - 1, schedule.length - 1)];
}

export function startWebhookWorker(pool: Pool) {
  const intervalMs = Number(process.env.WEBHOOK_WORKER_INTERVAL_MS || 5000);
  const batchSize = Number(process.env.WEBHOOK_WORKER_BATCH_SIZE || 10);

  console.log(`[WebhookWorker] Started. interval=${intervalMs}ms batch=${batchSize}`);

  const tick = async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const picked = await client.query(
        `SELECT
           d.id,
           d.subscription_id,
           d.event_type,
           d.payload,
           d.attempt_count,
           d.max_attempts,
           s.target_url,
           s.secret
         FROM webhook_deliveries d
         JOIN webhook_subscriptions s ON s.id = d.subscription_id
         WHERE d.status IN ('pending', 'failed')
           AND d.next_attempt_at <= now()
           AND s.is_active = true
         ORDER BY d.created_at ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED`,
        [batchSize]
      );

      if (picked.rows.length === 0) {
        await client.query('ROLLBACK');
        return;
      }

      const ids = picked.rows.map((r: any) => r.id);
      await client.query(
        `UPDATE webhook_deliveries
         SET status = 'processing',
             updated_at = now()
         WHERE id = ANY($1::uuid[])`,
        [ids]
      );

      await client.query('COMMIT');

      for (const row of picked.rows) {
        const payloadString = JSON.stringify(row.payload ?? {});
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Webhook-Event': row.event_type,
          'X-Webhook-Delivery': row.id,
        };

        if (row.secret) {
          headers['X-Webhook-Signature'] = signWebhookPayload(row.secret, payloadString);
        }

        let ok = false;
        let statusCode: number | null = null;
        let errorText: string | null = null;

        try {
          const response = await fetch(row.target_url, {
            method: 'POST',
            headers,
            body: payloadString,
          });

          statusCode = response.status;
          ok = response.ok;
          if (!ok) {
            const body = await response.text().catch(() => '');
            errorText = `HTTP ${response.status}${body ? `: ${body.slice(0, 400)}` : ''}`;
          }
        } catch (err: any) {
          errorText = err?.message || 'Network error';
        }

        const client2 = await pool.connect();
        try {
          await client2.query('BEGIN');

          if (ok) {
            await client2.query(
              `UPDATE webhook_deliveries
               SET status = 'delivered',
                   delivered_at = now(),
                   last_http_status = $2,
                   updated_at = now()
               WHERE id = $1`,
              [row.id, statusCode]
            );
          } else {
            const nextAttemptCount = Number(row.attempt_count || 0) + 1;

            if (nextAttemptCount >= Number(row.max_attempts || 6)) {
              await client2.query(
                `UPDATE webhook_deliveries
                 SET status = 'dead',
                     attempt_count = $2,
                     last_error = $3,
                     last_http_status = $4,
                     updated_at = now()
                 WHERE id = $1`,
                [row.id, nextAttemptCount, errorText, statusCode]
              );

              await client2.query(
                `INSERT INTO webhook_dead_letters
                 (delivery_id, subscription_id, event_type, payload, last_error, last_http_status, attempt_count, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
                [
                  row.id,
                  row.subscription_id,
                  row.event_type,
                  JSON.stringify(row.payload ?? {}),
                  errorText,
                  statusCode,
                  nextAttemptCount,
                ]
              );
            } else {
              const delaySeconds = getBackoffSeconds(nextAttemptCount);

              await client2.query(
                `UPDATE webhook_deliveries
                 SET status = 'failed',
                     attempt_count = $2,
                     last_error = $3,
                     last_http_status = $4,
                     next_attempt_at = now() + ($5 || ' seconds')::interval,
                     updated_at = now()
                 WHERE id = $1`,
                [row.id, nextAttemptCount, errorText, statusCode, String(delaySeconds)]
              );
            }
          }

          await client2.query('COMMIT');
        } catch (err) {
          try { await client2.query('ROLLBACK'); } catch {}
          console.error('[WebhookWorker] Persist error:', err);
        } finally {
          client2.release();
        }
      }
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch {}
      console.error('[WebhookWorker] Tick error:', err);
    } finally {
      client.release();
    }
  };

  tick();
  setInterval(tick, intervalMs);
}
