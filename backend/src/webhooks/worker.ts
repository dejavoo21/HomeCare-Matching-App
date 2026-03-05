// ============================================================================
// WEBHOOK WORKER - Process job queue with exponential backoff + DLQ
// ============================================================================

import { Pool, PoolClient } from 'pg';

/**
 * Calculate exponential backoff in seconds
 * 5s, 10s, 20s, 40s, 80s, 160s, 320s, 600s (max)
 */
function backoffSeconds(attempts: number): number {
  return Math.min(5 * Math.pow(2, Math.max(0, attempts)), 600);
}

/**
 * Start webhook worker loop (runs every 1.5 seconds)
 * Uses FOR UPDATE SKIP LOCKED to prevent duplicate processing
 */
export function startWebhookWorker(pool: Pool) {
  const tick = async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');

      // Lock next job for processing
      const pick = await client.query(
        `SELECT id, event_type, target_url, payload, attempts, max_attempts
         FROM webhook_jobs
         WHERE status = 'queued'
           AND next_attempt_at <= now()
         ORDER BY created_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED`
      );

      if (pick.rows.length === 0) {
        await client.query('ROLLBACK');
        return;
      }

      const job = pick.rows[0];

      // Mark as processing
      await client.query(
        `UPDATE webhook_jobs
         SET status = 'processing', updated_at = now()
         WHERE id = $1`,
        [job.id]
      );

      await client.query('COMMIT');

      // Send webhook (outside transaction to avoid lock)
      let success = false;
      let errorText = '';

      try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 8000); // 8s timeout

        try {
          const resp = await fetch(job.target_url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'homecare-matching-app/webhook-v1',
            },
            body: JSON.stringify(job.payload),
            signal: ctrl.signal,
          });

          clearTimeout(timeout);

          if (resp.ok) {
            success = true;
          } else {
            errorText = `HTTP ${resp.status}`;
          }
        } catch (e) {
          clearTimeout(timeout);
          throw e;
        }
      } catch (e: any) {
        success = false;
        errorText = e?.code === 'ABORT_ERR' ? 'timeout' : (e?.message || 'network_error');
      }

      // Update job result
      await handleJobResult(pool, job.id, job.event_type, job.target_url, job.payload, job.attempts, job.max_attempts, success, errorText);
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {}
      console.error('❌ Webhook worker tick error:', err);
    } finally {
      client.release();
    }
  };

  // Run frequently to catch scheduled retries
  setInterval(tick, 1500);
  console.log('✅ Webhook worker started (1.5s polling)');
}

/**
 * Update job after delivery attempt
 */
async function handleJobResult(
  pool: Pool,
  jobId: string,
  eventType: string,
  targetUrl: string,
  payload: any,
  currentAttempts: number,
  maxAttempts: number,
  success: boolean,
  errorText: string
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (success) {
      // Success: mark as succeeded
      await client.query(
        `UPDATE webhook_jobs
         SET status = 'succeeded', updated_at = now()
         WHERE id = $1`,
        [jobId]
      );
    } else {
      const newAttempts = currentAttempts + 1;

      if (newAttempts >= maxAttempts) {
        // Max retries exhausted: move to dead-letter queue
        await client.query(
          `INSERT INTO webhook_dead_letters
           (webhook_job_id, event_type, target_url, payload, attempts, max_attempts, last_error)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [jobId, eventType, targetUrl, payload, newAttempts, maxAttempts, errorText]
        );

        await client.query(
          `UPDATE webhook_jobs
           SET status = 'dead', attempts = $2, last_error = $3, updated_at = now()
           WHERE id = $1`,
          [jobId, newAttempts, errorText]
        );

        console.warn(`⚠️  Webhook job ${jobId} moved to DLQ after ${newAttempts} attempts: ${errorText}`);
      } else {
        // Retry with exponential backoff
        const delaySeconds = backoffSeconds(newAttempts);
        await client.query(
          `UPDATE webhook_jobs
           SET status = 'queued',
               attempts = $2,
               last_error = $3,
               next_attempt_at = now() + ($4::numeric || 'seconds')::interval,
               updated_at = now()
           WHERE id = $1`,
          [jobId, newAttempts, errorText, delaySeconds]
        );

        console.log(`🔄 Webhook job ${jobId} scheduled for retry in ${delaySeconds}s (attempt ${newAttempts}/${maxAttempts})`);
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    console.error('Failed to update job result:', err);
  } finally {
    client.release();
  }
}
