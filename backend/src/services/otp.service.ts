// ============================================================================
// OTP SERVICE - ONE TIME PASSWORD GENERATION & VERIFICATION
// ============================================================================

import { Pool } from 'pg';
import speakeasy from 'speakeasy';
import { emailService } from './email.service';

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '10');
const OTP_LENGTH = parseInt(process.env.OTP_LENGTH || '6');

export interface OtpToken {
  id: string;
  user_id: string;
  email: string;
  otp_code: string;
  attempts_left: number;
  created_at: Date;
  expires_at: Date;
  verified_at?: Date;
}

export interface OtpRequest {
  user_id: string;
  email: string;
}

export interface OtpVerification {
  success: boolean;
  verified_at?: Date;
  message: string;
}

export function createOtpService(pool: Pool) {
  return {
    /**
     * Generate a numeric OTP code
     */
    generateCode(): string {
      const code = speakeasy.generateSecret({
        name: 'Homecare Matching',
        length: OTP_LENGTH,
      });
      // Extract just the numeric part
      return Math.random()
        .toString()
        .substring(2, 2 + OTP_LENGTH)
        .padStart(OTP_LENGTH, '0');
    },

    /**
     * Create and send OTP to user email
     */
    async sendOtp(userId: string, email: string, userName?: string): Promise<OtpToken | null> {
      try {
        // Generate OTP code
        const otpCode = this.generateCode();
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        // Delete any existing unverified OTPs for this user
        await pool.query('DELETE FROM otp_tokens WHERE user_id = $1 AND verified_at IS NULL', [
          userId,
        ]);

        // Insert new OTP
        const result = await pool.query(
          `INSERT INTO otp_tokens (user_id, email, otp_code, attempts_left, expires_at)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [userId, email, otpCode, 3, expiresAt]
        );

        const otpToken = result.rows[0];

        // Update user's last_otp_sent_at
        await pool.query('UPDATE users SET last_otp_sent_at = NOW() WHERE id = $1', [userId]);

        // Send email
        try {
          await emailService.sendOtpEmail(email, otpCode, OTP_EXPIRY_MINUTES);
          console.log(`✅ OTP sent to ${email} for user ${userId}`);
        } catch (emailErr) {
          console.error('⚠️  Failed to send OTP email, but OTP was created:', emailErr);
          // Don't fail the request even if email fails - admin can resend
        }

        return otpToken;
      } catch (err) {
        console.error('Error creating OTP:', err);
        throw err;
      }
    },

    /**
     * Verify OTP code
     */
    async verifyOtp(userId: string, email: string, otpCode: string): Promise<OtpVerification> {
      try {
        // Find active OTP
        const result = await pool.query(
          `SELECT * FROM otp_tokens
           WHERE user_id = $1
             AND email = $2
             AND verified_at IS NULL
             AND expires_at > NOW()
           ORDER BY created_at DESC
           LIMIT 1`,
          [userId, email]
        );

        if (result.rows.length === 0) {
          return {
            success: false,
            message: 'No active OTP found. Request a new one.',
          };
        }

        const otpToken = result.rows[0];

        // Check attempts
        if (otpToken.attempts_left <= 0) {
          return {
            success: false,
            message: 'Too many failed attempts. Request a new OTP.',
          };
        }

        // Check code
        if (otpToken.otp_code !== String(otpCode).trim()) {
          // Decrement attempts
          const newAttempts = otpToken.attempts_left - 1;
          await pool.query('UPDATE otp_tokens SET attempts_left = $1 WHERE id = $2', [
            newAttempts,
            otpToken.id,
          ]);

          return {
            success: false,
            message: `Invalid OTP. ${newAttempts} attempts remaining.`,
          };
        }

        // OTP is valid - mark as verified
        const verifyResult = await pool.query(
          `UPDATE otp_tokens
           SET verified_at = NOW()
           WHERE id = $1
           RETURNING verified_at`,
          [otpToken.id]
        );

        // Mark user as email_verified
        await pool.query('UPDATE users SET email_verified = true, email_verified_at = NOW() WHERE id = $1', [
          userId,
        ]);

        return {
          success: true,
          verified_at: verifyResult.rows[0].verified_at,
          message: 'Email verified successfully!',
        };
      } catch (err) {
        console.error('Error verifying OTP:', err);
        throw err;
      }
    },

    /**
     * Check if OTP is still valid
     */
    async isOtpValid(userId: string, email: string): Promise<boolean> {
      try {
        const result = await pool.query(
          `SELECT * FROM otp_tokens
           WHERE user_id = $1
             AND email = $2
             AND verified_at IS NULL
             AND expires_at > NOW()
           LIMIT 1`,
          [userId, email]
        );

        return result.rows.length > 0;
      } catch (err) {
        console.error('Error checking OTP validity:', err);
        return false;
      }
    },

    /**
     * Get remaining time for OTP (in seconds)
     */
    async getOtpTimeRemaining(userId: string, email: string): Promise<number> {
      try {
        const result = await pool.query(
          `SELECT EXTRACT(EPOCH FROM (expires_at - NOW())) as seconds_remaining
           FROM otp_tokens
           WHERE user_id = $1
             AND email = $2
             AND verified_at IS NULL
             AND expires_at > NOW()
           LIMIT 1`,
          [userId, email]
        );

        if (result.rows.length === 0) return 0;
        return Math.max(0, Math.floor(result.rows[0].seconds_remaining));
      } catch (err) {
        console.error('Error getting OTP time remaining:', err);
        return 0;
      }
    },

    /**
     * Clean up expired OTPs
     */
    async cleanupExpiredOtps(): Promise<number> {
      try {
        const result = await pool.query(`DELETE FROM otp_tokens WHERE expires_at < NOW()`);
        return result.rowCount || 0;
      } catch (err) {
        console.error('Error cleaning up expired OTPs:', err);
        return 0;
      }
    },
  };
}

export type OtpService = ReturnType<typeof createOtpService>;
