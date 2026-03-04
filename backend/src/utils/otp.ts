import crypto from 'crypto';

/**
 * Generate a 6-digit OTP code
 */
export function generateOtpCode(): string {
  const n = crypto.randomInt(0, 1000000);
  return String(n).padStart(6, '0');
}

/**
 * Generate random salt for OTP hashing
 */
export function makeSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Hash OTP code with salt using SHA-256
 * Format: salt:hash (stored together in database)
 */
export function hashOtp(code: string, salt: string): string {
  return crypto.createHash('sha256').update(`${salt}:${code}`).digest('hex');
}

/**
 * Create salted OTP hash from code
 * Returns: salt:hash
 */
export function createOtpHash(code: string): string {
  const salt = makeSalt();
  const hash = hashOtp(code, salt);
  return `${salt}:${hash}`;
}

/**
 * Verify OTP code against stored hash
 */
export function verifyOtpHash(code: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;

  const computed = hashOtp(code, salt);
  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
}
