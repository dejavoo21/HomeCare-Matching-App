// ============================================================================
// WEBAUTHN SERVICE - BIOMETRIC & HARDWARE KEY AUTHENTICATION
// ============================================================================

import { Pool } from 'pg';
import crypto from 'crypto';

export interface WebAuthnCredential {
  id: string;
  user_id: string;
  credential_id: string;
  device_name?: string;
  created_at: Date;
  last_used_at?: Date;
}

export interface WebAuthnChallenge {
  challenge: string;
  userId?: string;
}

export function createWebAuthnService(pool: Pool) {
  return {
    /**
     * Generate a random challenge for WebAuthn
     */
    generateChallenge(): Buffer {
      return crypto.randomBytes(32);
    },

    /**
     * Create registration challenge for new credential
     */
    async createRegistrationChallenge(userId: string): Promise<string> {
      try {
        const challenge = this.generateChallenge();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await pool.query(
          `INSERT INTO webauthn_challenges (user_id, challenge, expires_at)
           VALUES ($1, $2, $3)`,
          [userId, challenge, expiresAt]
        );

        return challenge.toString('base64');
      } catch (err) {
        console.error('Error creating registration challenge:', err);
        throw err;
      }
    },

    /**
     * Create authentication challenge
     */
    async createAuthenticationChallenge(userId?: string): Promise<string> {
      try {
        const challenge = this.generateChallenge();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await pool.query(
          `INSERT INTO webauthn_challenges (user_id, challenge, expires_at)
           VALUES ($1, $2, $3)`,
          [userId || null, challenge, expiresAt]
        );

        return challenge.toString('base64');
      } catch (err) {
        console.error('Error creating authentication challenge:', err);
        throw err;
      }
    },

    /**
     * Verify and consume challenge
     */
    async verifyChallenge(challenge: string, userId?: string): Promise<boolean> {
      try {
        const challengeBuffer = Buffer.from(challenge, 'base64');

        const result = await pool.query(
          `SELECT id FROM webauthn_challenges
           WHERE challenge = $1
             AND expires_at > NOW()
             AND used_at IS NULL
             ${userId ? 'AND user_id = $2' : ''}
           LIMIT 1`,
          userId ? [challengeBuffer, userId] : [challengeBuffer]
        );

        if (result.rows.length === 0) {
          return false;
        }

        const challengeId = result.rows[0].id;

        // Mark challenge as used
        await pool.query('UPDATE webauthn_challenges SET used_at = NOW() WHERE id = $1', [
          challengeId,
        ]);

        return true;
      } catch (err) {
        console.error('Error verifying challenge:', err);
        return false;
      }
    },

    /**
     * Store a new credential
     */
    async storeCredential(
      userId: string,
      credentialId: string,
      publicKey: Buffer,
      deviceName?: string
    ): Promise<WebAuthnCredential> {
      try {
        const result = await pool.query(
          `INSERT INTO webauthn_credentials (user_id, credential_id, public_key, device_name)
           VALUES ($1, $2, $3, $4)
           RETURNING id, user_id, credential_id, device_name, created_at`,
          [userId, credentialId, publicKey, deviceName || 'Unknown Device']
        );

        // Enable WebAuthn in 2FA settings
        await pool.query(
          `UPDATE two_fa_settings SET is_webauthn_enabled = true WHERE user_id = $1`,
          [userId]
        );

        return result.rows[0];
      } catch (err) {
        console.error('Error storing credential:', err);
        throw err;
      }
    },

    /**
     * Get all credentials for user
     */
    async getCredentials(userId: string): Promise<WebAuthnCredential[]> {
      try {
        const result = await pool.query(
          `SELECT id, user_id, credential_id, device_name, created_at, last_used_at
           FROM webauthn_credentials
           WHERE user_id = $1
           ORDER BY created_at DESC`,
          [userId]
        );

        return result.rows;
      } catch (err) {
        console.error('Error fetching credentials:', err);
        throw err;
      }
    },

    /**
     * Get credential by ID
     */
    async getCredentialById(credentialId: string): Promise<any> {
      try {
        const result = await pool.query(
          `SELECT * FROM webauthn_credentials WHERE credential_id = $1`,
          [credentialId]
        );

        return result.rows[0] || null;
      } catch (err) {
        console.error('Error fetching credential:', err);
        return null;
      }
    },

    /**
     * Update credential counter (for replay attack prevention)
     */
    async updateCredentialCounter(credentialId: string, newCounter: number): Promise<void> {
      try {
        await pool.query(
          `UPDATE webauthn_credentials
           SET counter = $1, last_used_at = NOW()
           WHERE credential_id = $2`,
          [newCounter, credentialId]
        );
      } catch (err) {
        console.error('Error updating credential counter:', err);
        throw err;
      }
    },

    /**
     * Delete credential
     */
    async deleteCredential(credentialId: string, userId: string): Promise<boolean> {
      try {
        const result = await pool.query(
          `DELETE FROM webauthn_credentials
           WHERE credential_id = $1 AND user_id = $2`,
          [credentialId, userId]
        );

        // Check if user has any remaining credentials
        const remaining = await pool.query(
          `SELECT COUNT(*) as count FROM webauthn_credentials WHERE user_id = $1`,
          [userId]
        );

        if (remaining.rows[0].count === 0) {
          await pool.query(
            `UPDATE two_fa_settings SET is_webauthn_enabled = false WHERE user_id = $1`,
            [userId]
          );
        }

        return result.rowCount! > 0;
      } catch (err) {
        console.error('Error deleting credential:', err);
        throw err;
      }
    },

    /**
     * Cleanup expired challenges
     */
    async cleanupExpiredChallenges(): Promise<number> {
      try {
        const result = await pool.query(`DELETE FROM webauthn_challenges WHERE expires_at < NOW()`);
        return result.rowCount || 0;
      } catch (err) {
        console.error('Error cleaning up expired challenges:', err);
        return 0;
      }
    },
  };
}

export type WebAuthnService = ReturnType<typeof createWebAuthnService>;
