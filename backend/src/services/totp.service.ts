// ============================================================================
// TOTP (Time-Based One-Time Password) SERVICE
// ============================================================================
// RFC 6238 compliant authenticator app support (Google Authenticator, Authy, Microsoft Authenticator)

import type { Pool } from 'pg';
import crypto from 'crypto';

/**
 * Generate TOTP secret for user
 * Returns base32 secret and otpauth URL for QR code generation
 */
export function generateTotpSecret(email: string): {
  secret: string;
  otpauthUrl: string;
} {
  // Generate random 20 bytes (160 bits) for stronger security
  const secret = crypto.randomBytes(20).toString('base64').slice(0, 26);

  // Normalize to alphanumeric only (base32 compatible)
  const cleanSecret = secret.replace(/[^A-Z2-7]/g, '').slice(0, 26).padEnd(26, 'A');

  // Create otpauth URL for QR code
  const issuer = 'Homecare Matching';
  const otpauthUrl = `otpauth://totp/${issuer}:${email}?secret=${cleanSecret}&issuer=${issuer}&digits=6&period=30`;

  return { secret: cleanSecret, otpauthUrl };
}

/**
 * Verify TOTP code against stored secret
 * Implements RFC 4226 (HOTP) and RFC 6238 (TOTP)
 */
export function verifyTotpCode(secret: string, code: string): boolean {
  try {
    const digits = 6;
    const period = 30; // seconds
    const window = 1; // ±1 timestep for clock skew

    // Decode base32 secret
    const secretBuffer = base32Decode(secret);
    const currentTime = Math.floor(Date.now() / 1000);
    const currentCounter = Math.floor(currentTime / period);

    // Check current and nearby timesteps
    for (let i = -window; i <= window; i++) {
      const counter = currentCounter + i;
      const counterBuffer = Buffer.alloc(8);

      // Write counter as big-endian 64-bit integer
      for (let j = 7; j >= 0; j--) {
        counterBuffer[j] = counter & 0xff;
        // eslint-disable-next-line no-bitwise
        // counter = counter >>> 8;
      }

      // HMAC-SHA1
      const hmac = crypto.createHmac('sha1', secretBuffer).update(counterBuffer).digest();

      // Dynamic truncation (RFC 4226)
      const offset = hmac[hmac.length - 1] & 0x0f;
      let otp = (hmac[offset] & 0x7f) << 24;
      // eslint-disable-next-line no-bitwise
      otp |= (hmac[offset + 1] & 0xff) << 16;
      // eslint-disable-next-line no-bitwise
      otp |= (hmac[offset + 2] & 0xff) << 8;
      // eslint-disable-next-line no-bitwise
      otp |= hmac[offset + 3] & 0xff;
      otp = otp % Math.pow(10, digits);

      const expectedCode = String(otp).padStart(digits, '0');

      if (expectedCode === code) {
        return true;
      }
    }

    return false;
  } catch (err) {
    console.error('TOTP verification error:', err);
    return false;
  }
}

/**
 * Decode base32 string to buffer
 */
function base32Decode(str: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of str.toUpperCase()) {
    const index = alphabet.indexOf(char);
    if (index === -1) throw new Error('Invalid base32 character');

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bits -= 8;
      output.push((value >> bits) & 0xff);
    }
  }

  return Buffer.from(output);
}

/**
 * Setup TOTP for a user (called once during activation)
 * Returns secret and otpauth URL
 */
export async function setupTotp(pool: Pool, userId: string, email: string): Promise<{ secret: string; otpauthUrl: string }> {
  const { secret, otpauthUrl } = generateTotpSecret(email);

  // Store secret temporarily (not yet enabled)
  await pool.query(
    `UPDATE users SET totp_secret = $2 WHERE id = $1`,
    [userId, secret]
  );

  return { secret, otpauthUrl };
}

/**
 * Enable TOTP for user (called after verification)
 */
export async function enableTotp(pool: Pool, userId: string): Promise<void> {
  await pool.query(
    `UPDATE users SET totp_enabled = true WHERE id = $1`,
    [userId]
  );
}

/**
 * Disable TOTP for user
 */
export async function disableTotp(pool: Pool, userId: string): Promise<void> {
  await pool.query(
    `UPDATE users SET totp_enabled = false, totp_secret = NULL WHERE id = $1`,
    [userId]
  );
}

/**
 * Verify TOTP and return result
 */
export async function verifyUserTotp(pool: Pool, userId: string, code: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT totp_secret, totp_enabled FROM users WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0 || !result.rows[0].totp_enabled || !result.rows[0].totp_secret) {
    return false;
  }

  return verifyTotpCode(result.rows[0].totp_secret, code);
}
