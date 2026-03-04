// ============================================================================
// NOTIFICATION WORKER - Process Email Queue
// ============================================================================

import { Pool } from 'pg';
import { emailService } from '../services/email.service';

/**
 * Start notification worker
 * Polls notification_outbox every 5 seconds and sends emails
 */
export function startNotificationWorker(pool: Pool): void {
  console.log('[Notification Worker] Started');

  setInterval(async () => {
    try {
      await processNotifications(pool);
    } catch (error) {
      console.error('[Notification Worker] Error:', error);
    }
  }, 5000); // Poll every 5 seconds
}

/**
 * Process pending notifications from queue
 */
async function processNotifications(pool: Pool): Promise<void> {
  try {
    // Fetch unprocessed notifications (limit 10 at a time)
    const result = await pool.query(
      `SELECT id, channel, to_address, template, payload_json, created_at
       FROM notification_outbox
       WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT 10`
    );

    if (result.rows.length === 0) {
      return;
    }

    console.log(`[Notification Worker] Processing ${result.rows.length} notifications`);

    for (const notification of result.rows) {
      try {
        await processNotification(pool, notification);
      } catch (error) {
        console.error(
          `[Notification Worker] Failed to process notification ${notification.id}:`,
          error
        );

        // Mark as failed
        await pool.query(
          `UPDATE notification_outbox SET status = 'failed', last_error = $1 WHERE id = $2`,
          [String(error), notification.id]
        );
      }
    }
  } catch (error) {
    console.error('[Notification Worker] Error fetching notifications:', error);
  }
}

/**
 * Process individual notification based on channel and template
 */
async function processNotification(pool: Pool, notification: any): Promise<void> {
  const { id, channel, to_address, template, payload_json } = notification;
  const payload = payload_json || {};

  // Only handle email channel
  if (channel !== 'email') {
    console.log(`[Notification] Skipping non-email notification: ${channel}`);
    await pool.query(`UPDATE notification_outbox SET status = 'sent', sent_at = NOW() WHERE id = $1`, [id]);
    return;
  }

  // Validate email address
  if (!to_address || !to_address.includes('@')) {
    console.warn(`[Notification] Invalid email address: ${to_address}`);
    await pool.query(`UPDATE notification_outbox SET status = 'failed', last_error = 'Invalid email address' WHERE id = $1`, [id]);
    return;
  }

  // Handle specific templates
  switch (template) {
    case 'otp_code':
      await sendOtpEmail(pool, id, to_address, payload);
      break;

    case 'welcome':
      await sendWelcomeEmail(pool, id, to_address, payload);
      break;

    case 'password_reset':
      await sendPasswordResetEmail(pool, id, to_address, payload);
      break;

    case 'offer_created':
      await sendOfferEmail(pool, id, to_address, payload);
      break;

    default:
      console.warn(`[Notification] Unknown template: ${template}`);
      await pool.query(`UPDATE notification_outbox SET status = 'failed', last_error = 'Unknown template' WHERE id = $1`, [id]);
  }
}

/**
 * Send OTP email
 */
async function sendOtpEmail(pool: Pool, notificationId: string, email: string, payload: any): Promise<void> {
  const { code, expiresMinutes = 5, userName = 'User' } = payload;

  if (!code) {
    throw new Error('Missing OTP code in payload');
  }

  await emailService.sendOtpEmail(email, code, expiresMinutes);

  // Mark as sent
  await pool.query(`UPDATE notification_outbox SET status = 'sent', sent_at = NOW() WHERE id = $1`, [
    notificationId,
  ]);

  console.log(`[Notification] OTP email sent to ${email}`);
}

/**
 * Send welcome email
 */
async function sendWelcomeEmail(pool: Pool, notificationId: string, email: string, payload: any): Promise<void> {
  const { name = 'User' } = payload;

  await emailService.sendWelcomeEmail(email, name);

  // Mark as sent
  await pool.query(`UPDATE notification_outbox SET status = 'sent', sent_at = NOW() WHERE id = $1`, [
    notificationId,
  ]);

  console.log(`[Notification] Welcome email sent to ${email}`);
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(
  pool: Pool,
  notificationId: string,
  email: string,
  payload: any
): Promise<void> {
  const { resetLink } = payload;

  if (!resetLink) {
    throw new Error('Missing resetLink in payload');
  }

  await emailService.send({
    to: email,
    subject: 'Password Reset Request',
    html: `
      <h2>Password Reset Request</h2>
      <p>Click the link below to reset your password:</p>
      <p><a href="${resetLink}">Reset Password</a></p>
      <p>This link will expire in 24 hours.</p>
    `,
  });

  // Mark as sent
  await pool.query(`UPDATE notification_outbox SET status = 'sent', sent_at = NOW() WHERE id = $1`, [
    notificationId,
  ]);

  console.log(`[Notification] Password reset email sent to ${email}`);
}

/**
 * Send offer email to professional
 */
async function sendOfferEmail(pool: Pool, notificationId: string, email: string, payload: any): Promise<void> {
  const { clientName = 'Client', description = 'Care Request', offerId } = payload;

  await emailService.send({
    to: email,
    subject: 'New Care Request Offer',
    html: `
      <h2>New Care Request Offer</h2>
      <p>You have received a new offer for a care request:</p>
      <p><strong>Client:</strong> ${clientName}</p>
      <p><strong>Description:</strong> ${description}</p>
      <p style="margin-top: 20px;">
        <a href="http://localhost:7005/dashboard" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Offer</a>
      </p>
    `,
  });

  // Mark as sent
  await pool.query(`UPDATE notification_outbox SET status = 'sent', sent_at = NOW() WHERE id = $1`, [
    notificationId,
  ]);

  console.log(`[Notification] Offer email sent to ${email}`);
}
