// ============================================================================
// WEBHOOK DELIVERY WORKER
// ============================================================================
// Processes queued webhook deliveries with exponential backoff
// Runs every 10 seconds

import type { Pool } from 'pg';
import crypto from 'crypto';
import { getPendingDeliveries, markDeliverySuccess, retryDelivery } from '../services/webhook.service';

/**
 * Start webhook delivery worker
 * Processes ~20 deliveries every 10 seconds
 */
export function startWebhookWorker(pool: Pool): void {
  console.log('Starting webhook delivery worker (interval: 10s)');

  setInterval(async () => {
    try {
      const deliveries = await getPendingDeliveries(pool, 20);

      if (deliveries.length > 0) {
        console.log(`Processing ${deliveries.length} webhook deliveries`);
      }

      for (const delivery of deliveries) {
        await processDelivery(pool, delivery);
      }
    } catch (err) {
      console.error('Webhook worker error:', err);
    }
  }, 10000); // 10 seconds
}

/**
 * Process a single webhook delivery
 */
async function processDelivery(pool: Pool, delivery: any): Promise<void> {
  const { id, url, secret_key, payload, event_type, attempt_count } = delivery;

  try {
    // Create HMAC signature
    const signature = crypto.createHmac('sha256', secret_key).update(JSON.stringify(payload)).digest('hex');

    // Deliver webhook
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-Event': event_type,
        'X-Webhook-Delivery': id,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (response.ok) {
      await markDeliverySuccess(pool, id);
      console.log(`✓ Webhook delivered: ${url} (${event_type})`);
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (err: any) {
    const errorMsg = err.message || 'Unknown error';

    console.warn(
      `✗ Webhook delivery failed (attempt ${attempt_count + 1}): ${url} - ${errorMsg}`
    );

    // Retry with exponential backoff
    await retryDelivery(pool, id, errorMsg);
  }
}
