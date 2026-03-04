// ============================================================================
// 2FA MANAGER SERVICE - ORCHESTRATES ALL 2FA METHODS
// ============================================================================

import { Pool } from 'pg';
import { OtpService } from './otp.service';
import { PassphraseService } from './passphrase.service';
import { WebAuthnService } from './webauthn.service';

export interface TwoFaSettings {
  user_id: string;
  is_enabled: boolean;
  primary_method: '2fa' | 'passphrase' | 'webauthn';
  is_passphrase_enabled: boolean;
  is_webauthn_enabled: boolean;
}

export interface TwoFaVerification {
  success: boolean;
  message: string;
  nextStep?: 'passphrase' | 'webauthn' | 'otp' | 'complete';
}

export function create2faService(
  pool: Pool,
  otpService: OtpService,
  passphraseService: PassphraseService,
  webAuthnService: WebAuthnService
) {
  return {
    /**
     * Initialize 2FA settings for new user
     */
    async initialize2fa(userId: string, primaryMethod: string = 'otp'): Promise<TwoFaSettings> {
      try {
        const result = await pool.query(
          `INSERT INTO two_fa_settings (user_id, primary_method)
           VALUES ($1, $2)
           ON CONFLICT (user_id) DO UPDATE SET primary_method = $2
           RETURNING *`,
          [userId, primaryMethod]
        );

        return result.rows[0];
      } catch (err) {
        console.error('Error initializing 2FA:', err);
        throw err;
      }
    },

    /**
     * Get 2FA settings for user
     */
    async get2faSettings(userId: string): Promise<TwoFaSettings | null> {
      try {
        const result = await pool.query(
          `SELECT * FROM two_fa_settings WHERE user_id = $1`,
          [userId]
        );

        return result.rows[0] || null;
      } catch (err) {
        console.error('Error fetching 2FA settings:', err);
        return null;
      }
    },

    /**
     * Enable 2FA
     */
    async enable2fa(userId: string): Promise<void> {
      try {
        await pool.query(`UPDATE two_fa_settings SET is_enabled = true WHERE user_id = $1`, [
          userId,
        ]);
        console.log(`✅ 2FA enabled for user ${userId}`);
      } catch (err) {
        console.error('Error enabling 2FA:', err);
        throw err;
      }
    },

    /**
     * Disable 2FA
     */
    async disable2fa(userId: string): Promise<void> {
      try {
        await pool.query(`UPDATE two_fa_settings SET is_enabled = false WHERE user_id = $1`, [
          userId,
        ]);
        console.log(`✅ 2FA disabled for user ${userId}`);
      } catch (err) {
        console.error('Error disabling 2FA:', err);
        throw err;
      }
    },

    /**
     * Check if user has 2FA enabled
     */
    async is2faEnabled(userId: string): Promise<boolean> {
      try {
        const result = await pool.query(
          `SELECT is_enabled FROM two_fa_settings WHERE user_id = $1`,
          [userId]
        );

        if (result.rows.length === 0) {
          return false;
        }

        return result.rows[0].is_enabled;
      } catch (err) {
        console.error('Error checking 2FA status:', err);
        return false;
      }
    },

    /**
     * Get next 2FA method to verify
     */
    async getNext2faMethod(userId: string): Promise<string | null> {
      try {
        const settings = await this.get2faSettings(userId);

        if (!settings || !settings.is_enabled) {
          return null;
        }

        // Return primary method or first available
        if (settings.primary_method) {
          return settings.primary_method;
        }

        if (settings.is_passphrase_enabled) return 'passphrase';
        if (settings.is_webauthn_enabled) return 'webauthn';

        return 'otp';
      } catch (err) {
        console.error('Error getting next 2FA method:', err);
        return null;
      }
    },

    /**
     * Verify user through 2FA method(s)
     * Can chain multiple methods (e.g., OTP then Passphrase)
     */
    async verify2fa(
      userId: string,
      methods: {
        otp?: string;
        passphraseAnswers?: Record<string, string>;
        webauthn?: {
          credentialId: string;
          clientData: string;
          signature: string;
        };
      }
    ): Promise<TwoFaVerification> {
      try {
        const settings = await this.get2faSettings(userId);

        if (!settings || !settings.is_enabled) {
          return {
            success: true,
            message: '2FA not required',
            nextStep: 'complete',
          };
        }

        let verified = false;

        // Check OTP
        if (methods.otp) {
          const otpResult = await otpService.verifyOtp(userId, '', methods.otp);
          if (!otpResult.success) {
            return {
              success: false,
              message: otpResult.message,
            };
          }
          verified = true;
        }

        // Check Passphrase
        if (methods.passphraseAnswers && settings.is_passphrase_enabled) {
          const passphraseValid = await passphraseService.verifyPassphrase(
            userId,
            methods.passphraseAnswers
          );

          if (!passphraseValid) {
            return {
              success: false,
              message: 'Incorrect security question answers',
            };
          }
          verified = true;
        }

        // Check WebAuthn
        if (methods.webauthn && settings.is_webauthn_enabled) {
          // In production, you would verify the actual WebAuthn signature here
          // For this example, we'll just validate that the credential exists
          const credential = await webAuthnService.getCredentialById(methods.webauthn.credentialId);

          if (!credential) {
            return {
              success: false,
              message: 'Invalid biometric credential',
            };
          }

          await webAuthnService.updateCredentialCounter(
            methods.webauthn.credentialId,
            (credential.counter || 0) + 1
          );
          verified = true;
        }

        if (!verified) {
          return {
            success: false,
            message: 'No valid 2FA method provided',
          };
        }

        return {
          success: true,
          message: '2FA verification successful',
          nextStep: 'complete',
        };
      } catch (err) {
        console.error('Error verifying 2FA:', err);
        return {
          success: false,
          message: 'Error verifying 2FA',
        };
      }
    },
  };
}

export type TwoFaService = ReturnType<typeof create2faService>;
