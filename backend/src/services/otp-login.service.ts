import type { Pool } from 'pg';
import { generateOtpCode, createOtpHash, verifyOtpHash } from '../utils/otp';

/**
 * Create OTP challenge and send via email (using notification_outbox)
 * Invalidates any older unverified OTP challenges for this user
 */
export async function createOtpChallenge(
  pool: Pool,
  userId: string,
  email: string
): Promise<{ challengeId: string; expiresAt: Date; code?: string }> {
  // Invalidate any older unverified OTPs (only one active OTP per user)
  await pool.query(
    `UPDATE otp_challenges
     SET verified_at = NOW()
     WHERE user_id = $1 AND verified_at IS NULL`,
    [userId]
  );

  const code = generateOtpCode();
  const otpHash = createOtpHash(code);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Store OTP challenge in database
  const row = await pool.query(
    `INSERT INTO otp_challenges (user_id, otp_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [userId, otpHash, expiresAt]
  );

  // Queue email via notification_outbox
  await pool.query(
    `INSERT INTO notification_outbox (channel, to_address, template, payload_json, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [
      'email',
      email,
      'otp_code',
      JSON.stringify({
        code, // OTP code to display in email
        expiresMinutes: 5,
        userName: 'User', // Can be enhanced to fetch real name
      }),
    ]
  );

  return {
    challengeId: row.rows[0].id,
    expiresAt,
    code, // Return code for dev/testing (remove in production)
  };
}

/**
 * Verify OTP code for a user by challengeId
 * Checks identity, expiry, attempts, and hash match
 * Tied to specific challenge - eliminates race conditions
 */
export async function verifyOtpCode(
  pool: Pool,
  userId: string,
  challengeId: string,
  code: string
): Promise<{ success: boolean; reason?: string }> {
  // Query by specific challengeId + userId (no ambiguity)
  const res = await pool.query(
    `SELECT id, otp_hash, expires_at, attempts, max_attempts, verified_at
     FROM otp_challenges
     WHERE id = $1 AND user_id = $2`,
    [challengeId, userId]
  );

  if (res.rows.length === 0) {
    return { success: false, reason: 'no_challenge' };
  }

  const ch = res.rows[0];

  // Already verified
  if (ch.verified_at) {
    return { success: false, reason: 'already_verified' };
  }

  // Expired - lock immediately to prevent brute force
  if (new Date(ch.expires_at).getTime() < Date.now()) {
    await pool.query(
      `UPDATE otp_challenges SET attempts = max_attempts WHERE id = $1`,
      [challengeId]
    );
    return { success: false, reason: 'expired' };
  }

  // Too many attempts
  if (ch.attempts >= ch.max_attempts) {
    return { success: false, reason: 'locked' };
  }

  // Verify hash
  let codeMatches = false;
  try {
    codeMatches = verifyOtpHash(code, ch.otp_hash);
  } catch (err) {
    // Timing-safe comparison failed (invalid hash format, etc.)
    return { success: false, reason: 'invalid' };
  }

  if (!codeMatches) {
    // Increment failed attempts
    await pool.query(`UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = $1`, [
      challengeId,
    ]);
    return { success: false, reason: 'invalid' };
  }

  // Mark as verified
  await pool.query(`UPDATE otp_challenges SET verified_at = NOW() WHERE id = $1`, [challengeId]);

  return { success: true };
}

/**
 * Cleanup expired OTP challenges (run periodically)
 */
export async function cleanupExpiredOtps(pool: Pool): Promise<number> {
  const res = await pool.query(`DELETE FROM otp_challenges WHERE expires_at < NOW()`);
  return res.rowCount || 0;
}
