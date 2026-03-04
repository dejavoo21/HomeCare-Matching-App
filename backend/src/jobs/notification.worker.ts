// ============================================================================
// NOTIFICATION WORKER
// ============================================================================
// Polls notification_outbox and attempts to send via integrations

import { Pool } from 'pg';
import { sendEmail } from '../integrations/notify/email';
import { sendSms } from '../integrations/notify/sms';

const POLL_INTERVAL = 5000; // 5 seconds
const MAX_ATTEMPTS = 5;
const RETRY_BACKOFF_MS = 10000; // 10 seconds

export class NotificationWorker {
  constructor(private pool: Pool) {}

  async start(): Promise<void> {
    console.log('📧 Notification worker started');

    // Start polling
    this.poll();

    // Periodic polling
    setInterval(() => this.poll(), POLL_INTERVAL);
  }

  private async poll(): Promise<void> {
    try {
      await this.processPending();
    } catch (err) {
      console.error('❌ Notification worker error:', err);
    }
  }

  private async processPending(): Promise<void> {
    const pending = await this.pool.query(
      `SELECT id, channel, to_address, template, payload_json, attempts
       FROM notification_outbox 
       WHERE status = 'pending' AND attempts < $1
       ORDER BY created_at ASC
       LIMIT 10`,
      [MAX_ATTEMPTS]
    );

    for (const notification of pending.rows) {
      await this.sendNotification(notification);
    }
  }

  private async sendNotification(notification: any): Promise<void> {
    try {
      let success = false;

      if (notification.channel === 'email') {
        success = await sendEmail(
          notification.to_address,
          notification.template,
          notification.payload_json
        );
      } else if (notification.channel === 'sms') {
        success = await sendSms(
          notification.to_address,
          notification.template,
          notification.payload_json
        );
      }

      if (success) {
        await this.pool.query(
          `UPDATE notification_outbox 
           SET status = 'sent', sent_at = NOW() 
           WHERE id = $1`,
          [notification.id]
        );
        console.log(`✅ Sent ${notification.channel}: ${notification.id}`);
      } else {
        throw new Error('Failed to send');
      }
    } catch (err) {
      const attempts = notification.attempts + 1;

      if (attempts >= MAX_ATTEMPTS) {
        await this.pool.query(
          `UPDATE notification_outbox 
           SET status = 'failed', attempts = $1, last_error = $2
           WHERE id = $3`,
          [attempts, String(err), notification.id]
        );
        console.error(
          `❌ Failed after ${MAX_ATTEMPTS} attempts: ${notification.id}`
        );
      } else {
        // Retry later
        await this.pool.query(
          `UPDATE notification_outbox 
           SET attempts = $1, last_error = $2
           WHERE id = $3`,
          [attempts, String(err), notification.id]
        );
        console.log(
          `🔄 Retry ${attempts}/${MAX_ATTEMPTS}: ${notification.id}`
        );
      }
    }
  }
}

export default NotificationWorker;
