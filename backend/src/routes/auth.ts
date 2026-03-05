// ============================================================================
// AUTH ROUTES
// ============================================================================

import { Router, Response, Request } from 'express';
import crypto from 'crypto';
import { pool } from '../db';
import { authService } from '../services/auth.service';
import { userRepository } from '../repositories/user.repository';
import { createOtpService } from '../services/otp.service';
import { createPassphraseService } from '../services/passphrase.service';
import { createWebAuthnService } from '../services/webauthn.service';
import { create2faService } from '../services/2fa.service';
import { createOtpChallenge, verifyOtpCode } from '../services/otp-login.service';
import { setupTotp, enableTotp, disableTotp, verifyUserTotp } from '../services/totp.service';
import { getUserRoles } from '../repositories/rbac.repo';
import { requirePermission } from '../middleware/permissions';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { UserRole } from '../types/index';
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } from '../utils/jwt';
import { authEventsTotal } from '../monitoring/metrics';

const router = Router();
const otpService = createOtpService(pool);
const passphraseService = createPassphraseService(pool);
const webAuthnService = createWebAuthnService(pool);
const twoFaService = create2faService(pool, otpService, passphraseService, webAuthnService);

/**
 * DEMO LOGIN - Hardcoded credentials for rapid testing
 * POST /auth/demo-login
 * Returns: { accessToken, refreshToken, user }
 * This endpoint bypasses database lookups for development/testing only
 */
router.post('/demo-login', async (req: Request, res: Response): Promise<void> => {
  try {
    const adminUser = {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Admin User',
      email: 'onboarding@sochristventures.com',
      role: 'admin',
    };

    const userAgent = req.headers['user-agent'] || undefined;
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || undefined;
    const tokens = await createJwtTokens(adminUser.id, adminUser.email, adminUser.role, userAgent, ipAddress);

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: adminUser,
      },
    });
  } catch (err) {
    console.error('Demo login error:', err);
    res.status(500).json({ error: 'Demo login failed' });
  }
});


async function createJwtTokens(userId: string, email: string, role: string, userAgent?: string, ipAddress?: string): Promise<{ accessToken: string; refreshToken: string }> {
  // Normalize role to lowercase for consistency
  const normalizedRole = String(role || '').toLowerCase();
  const accessToken = signAccessToken({ userId, email, role: normalizedRole });
  const refreshToken = signRefreshToken({ userId });

  // Store refresh token hash in database with proper expiry calculation
  const tokenHash = hashToken(refreshToken);
  const accessTtlMin = Number(process.env.ACCESS_TOKEN_TTL_MIN || 15);
  const refreshTtlDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 14);
  const expiresAt = new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000);

  try {
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, tokenHash, expiresAt, userAgent || null, ipAddress || null]
    );
  } catch (err) {
    console.error('Failed to store refresh token:', err);
    // Don't fail auth - just log the error
  }

  return { accessToken, refreshToken };
}

/**
 * Register a new user
 * POST /auth/register
 */
router.post(
  '/register',
  (
    req: AuthRequest,
    res: Response
  ): void => {
    const { name, email, password, role, location } = req.body;

    if (!name || !email || !password || !role || !location) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const user = authService.register(name, email, password, role, location);

    if (!user) {
      res.status(400).json({ error: 'Email already exists' });
      return;
    }

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  }
);

/**
 * Login user - Step 1: Verify credentials and issue OTP
 * POST /auth/login
 * Body: { email, password }
 * Returns: { requiresOtp: true, userId, email, challengeId, expiresAt }
 */
router.post(
  '/login',
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }

    try {
      // Query database for user
      const result = await pool.query(
        'SELECT id, name, email, password_hash, role, otp_enabled FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const user = result.rows[0];

      // For MVP demo: compare plain text (in production use bcrypt)
      if (password !== 'V#4]eBpb)^4PJ,n?') {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // OTP is disabled for MVP stability (can be re-enabled with OTP_ENABLED=true)
      const otpSystemEnabled = String(process.env.OTP_ENABLED || "false") === "true";

      // If OTP is explicitly enabled AND system flag allows, send OTP code
      if (otpSystemEnabled && user.otp_enabled === true) {
        const otp = await createOtpChallenge(pool, user.id, user.email);

        res.json({
          success: true,
          data: {
            requiresOtp: true,
            userId: user.id,
            email: user.email,
            challengeId: otp.challengeId,
            expiresAt: otp.expiresAt.toISOString(),
            // Include code for development/testing (remove in production)
            otpCode: otp.code,
          },
        });
        return;
      }

      // Legacy path: If OTP disabled, issue token directly (not recommended)
      const userAgent = req.headers['user-agent'] || undefined;
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || undefined;
      const tokens = await createJwtTokens(user.id, user.email, user.role, userAgent, ipAddress);
      authEventsTotal.inc({ event_type: 'login_success', status: 'direct' });

      res.json({
        success: true,
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      const errorDetail = err instanceof Error ? err.message : String(err);
      res.status(500).json({ 
        error: 'Login failed',
        detail: errorDetail,
        isDev: process.env.NODE_ENV === 'development'
      });
    }
  }
);

/**
 * Verify OTP - Step 2: Complete authentication with OTP code
 * POST /auth/verify-otp
 * Body: { userId, challengeId, code }
 * Returns: { token, user }
 */
router.post('/verify-otp', async (req: Request, res: Response): Promise<void> => {
  const { userId, challengeId, code } = req.body;

  if (!userId || !challengeId || !code) {
    res.status(400).json({ error: 'userId, challengeId and code required' });
    return;
  }

  try {
    // Verify OTP code
    const otpVerified = await verifyOtpCode(pool, userId, challengeId, String(code).trim());

    if (!otpVerified.success) {
      const reason = otpVerified.reason || 'invalid';
      const messages: Record<string, string> = {
        no_challenge: 'No active OTP challenge found',
        expired: 'OTP code has expired',
        locked: 'Too many failed attempts',
        invalid: 'Invalid OTP code',
        already_verified: 'OTP already verified',
      };
      res.status(401).json({
        error: messages[reason] || 'OTP verification failed',
        reason,
      });
      return;
    }

    // Fetch user to create final token
    const userResult = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = userResult.rows[0];

    // Create final JWT tokens
    const userAgent = req.headers['user-agent'] || undefined;
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || undefined;
    const tokens = await createJwtTokens(user.id, user.email, user.role, userAgent, ipAddress);
    authEventsTotal.inc({ event_type: 'login_success', status: 'otp_verified' });

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (err) {
    console.error('OTP verification error:', err);
    res.status(500).json({ error: 'OTP verification failed' });
  }
});

/**
 * Resend OTP code to user
 * POST /auth/resend-otp
 * Body: { userId }
 * Returns: { challengeId, expiresAt }
 */
router.post('/resend-otp', async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.body || {};

  if (!userId) {
    res.status(400).json({ error: 'userId required' });
    return;
  }

  try {
    // Fetch user
    const userResult = await pool.query(
      'SELECT id, email, otp_enabled FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = userResult.rows[0];

    if (user.otp_enabled === false) {
      res.status(400).json({ error: 'OTP is disabled for this user' });
      return;
    }

    // Create new OTP challenge (invalidates older ones)
    const otp = await createOtpChallenge(pool, user.id, user.email);

    res.json({
      success: true,
      data: {
        challengeId: otp.challengeId,
        expiresAt: otp.expiresAt.toISOString(),
      },
    });
  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ error: 'Failed to resend OTP' });
  }
});

/**
 * Logout user - Revoke refresh token
 * POST /auth/logout
 * Body: { refreshToken }
 * Returns: { success: true }
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ error: 'refreshToken required' });
    return;
  }

  try {
    const tokenHash = hashToken(refreshToken);

    // Revoke the refresh token
    await pool.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW()
       WHERE token_hash = $1 AND revoked_at IS NULL`,
      [tokenHash]
    );

    authEventsTotal.inc({ event_type: 'logout', status: 'success' });

    res.json({ success: true });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * Refresh access token using refresh token
 * POST /auth/refresh
 * Body: { refreshToken }
 * Returns: { accessToken }
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token required' });
    return;
  }

  try {
    // Verify JWT signature
    const payload: any = verifyRefreshToken(refreshToken);

    // Check if refresh token exists in database and hasn't been revoked
    const hash = hashToken(refreshToken);
    const result = await pool.query(
      `SELECT id, expires_at, revoked_at 
       FROM refresh_tokens
       WHERE user_id = $1 
         AND token_hash = $2 
         AND revoked_at IS NULL
         AND expires_at > NOW()`,
      [payload.userId, hash]
    );

    if (result.rows.length === 0) {
      authEventsTotal.inc({ event_type: 'refresh_failed', status: 'invalid_token' });
      res.status(403).json({ error: 'Invalid or revoked refresh token' });
      return;
    }

    // Fetch user to create new access token
    const userResult = await pool.query(
      `SELECT id, email, role FROM users WHERE id = $1`,
      [payload.userId]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = userResult.rows[0];

    // Create new access token (short-lived, 15 minutes)
    const newAccessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: String(user.role || '').toLowerCase(),
    });

    authEventsTotal.inc({ event_type: 'refresh_success', status: 'ok' });

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error: any) {
    console.error('Token refresh error:', error);
    authEventsTotal.inc({ event_type: 'refresh_failed', status: 'error' });
    res.status(401).json({ error: 'Invalid refresh token', reason: error.message });
  }
});

/**
 * Get current user (Phase 2 - PostgreSQL)
 * GET /auth/me
 */
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = result.rows[0];

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * Request OTP for email verification
 * POST /auth/request-otp
 * Body: { email: string }
 */
router.post('/request-otp', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  try {
    // Find user by email
    const userResult = await pool.query('SELECT id, name, email FROM users WHERE email = $1', [email]);

    if (userResult.rows.length === 0) {
      // For security, don't reveal if email exists
      res.status(200).json({
        success: true,
        message: 'If email exists, an OTP has been sent',
      });
      return;
    }

    const user = userResult.rows[0];

    // Check if already verified
    const verifiedResult = await pool.query('SELECT email_verified FROM users WHERE id = $1', [user.id]);
    if (verifiedResult.rows[0].email_verified) {
      res.status(200).json({
        success: true,
        message: 'Email already verified',
        alreadyVerified: true,
      });
      return;
    }

    // Send OTP
    const otp = await otpService.sendOtp(user.id, user.email, user.name);

    if (!otp) {
      res.status(500).json({ error: 'Failed to generate OTP' });
      return;
    }

    res.json({
      success: true,
      data: {
        userId: user.id,
        email: user.email,
      },
      message: `OTP sent to ${user.email}`,
    });
  } catch (err) {
    console.error('Error requesting OTP:', err);
    res.status(500).json({ error: 'Failed to request OTP' });
  }
});

/**
 * Verify OTP
 * POST /auth/verify-otp
 * Body: { userId: string, email: string, otp: string }
 */
router.post('/verify-otp', async (req: Request, res: Response): Promise<void> => {
  const { userId, email, otp } = req.body;

  if (!userId || !email || !otp) {
    res.status(400).json({ error: 'userId, email, and otp are required' });
    return;
  }

  try {
    // Verify OTP
    const verification = await otpService.verifyOtp(userId, email, otp);

    if (!verification.success) {
      res.status(400).json({
        success: false,
        message: verification.message,
      });
      return;
    }

    // Get user data for token
    const userResult = await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [userId]);

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = userResult.rows[0];

    // Create auth token
    const token = Buffer.from(
      JSON.stringify({
        userId: user.id,
        email: user.email,
        role: user.role,
      })
    ).toString('base64');

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      message: 'Email verified successfully!',
    });
  } catch (err) {
    console.error('Error verifying OTP:', err);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

/**
 * Get 2FA settings
 * GET /auth/2fa/settings
 */
router.get('/2fa/settings', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const settings = await twoFaService.get2faSettings(req.user.userId);
    const questions = await passphraseService.getQuestions(req.user.userId);
    const credentials = await webAuthnService.getCredentials(req.user.userId);

    res.json({
      success: true,
      data: {
        settings,
        passphraseQuestionsCount: questions.length,
        webauthnCredentialsCount: credentials.length,
      },
    });
  } catch (err) {
    console.error('Error fetching 2FA settings:', err);
    res.status(500).json({ error: 'Failed to fetch 2FA settings' });
  }
});

/**
 * Setup passphrase (security questions)
 * POST /auth/2fa/passphrase/setup
 * Body: { questions: [{ question: string, answer: string }] }
 */
router.post(
  '/2fa/passphrase/setup',
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { questions } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length < 3) {
      res.status(400).json({ error: 'At least 3 security questions are required' });
      return;
    }

    try {
      await passphraseService.setupPassphrase(req.user.userId, questions);

      res.json({
        success: true,
        message: 'Passphrase setup successful',
      });
    } catch (err) {
      console.error('Error setting up passphrase:', err);
      res.status(500).json({ error: 'Failed to setup passphrase' });
    }
  }
);

/**
 * Get WebAuthn registration challenge
 * POST /auth/2fa/webauthn/register/challenge
 */
router.post(
  '/2fa/webauthn/register/challenge',
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    try {
      const challenge = await webAuthnService.createRegistrationChallenge(req.user.userId);

      res.json({
        success: true,
        data: {
          challenge,
          timeout: 60000,
          attestation: 'direct',
        },
      });
    } catch (err) {
      console.error('Error generating registration challenge:', err);
      res.status(500).json({ error: 'Failed to generate challenge' });
    }
  }
);

/**
 * Complete WebAuthn registration
 * POST /auth/2fa/webauthn/register/complete
 * Body: { credentialId: string, publicKey: string, deviceName?: string }
 */
router.post(
  '/2fa/webauthn/register/complete',
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { credentialId, publicKey, deviceName } = req.body;

    if (!credentialId || !publicKey) {
      res.status(400).json({ error: 'credentialId and publicKey are required' });
      return;
    }

    try {
      const publicKeyBuffer = Buffer.from(publicKey, 'base64');

      await webAuthnService.storeCredential(
        req.user.userId,
        credentialId,
        publicKeyBuffer,
        deviceName
      );

      res.json({
        success: true,
        message: 'Biometric credential registered successfully',
      });
    } catch (err) {
      console.error('Error completing registration:', err);
      res.status(500).json({ error: 'Failed to register credential' });
    }
  }
);

/**
 * Enable 2FA
 * POST /auth/2fa/enable
 * Body: { primaryMethod: 'otp' | 'passphrase' | 'webauthn' }
 */
router.post('/2fa/enable', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const { primaryMethod } = req.body || { primaryMethod: 'otp' };

  try {
    await twoFaService.enable2fa(req.user.userId);

    res.json({
      success: true,
      message: '2FA enabled successfully',
    });
  } catch (err) {
    console.error('Error enabling 2FA:', err);
    res.status(500).json({ error: 'Failed to enable 2FA' });
  }
});

/**
 * Disable 2FA
 * POST /auth/2fa/disable
 */
router.post(
  '/2fa/disable',
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    try {
      await twoFaService.disable2fa(req.user.userId);

      res.json({
        success: true,
        message: '2FA disabled successfully',
      });
    } catch (err) {
      console.error('Error disabling 2FA:', err);
      res.status(500).json({ error: 'Failed to disable 2FA' });
    }
  }
);

/**
 * Verify 2FA during login
 * POST /auth/2fa/verify
 * Body: { userId: string, otp?: string, passphraseAnswers?: object, webauthn?: object }
 */
router.post('/2fa/verify', async (req: Request, res: Response): Promise<void> => {
  const { userId, otp, passphraseAnswers, webauthn } = req.body;

  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  try {
    const result = await twoFaService.verify2fa(userId, {
      otp,
      passphraseAnswers,
      webauthn,
    });

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    // Create auth token
    const userResult = await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [
      userId,
    ]);

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = userResult.rows[0];

    const token = Buffer.from(
      JSON.stringify({
        userId: user.id,
        email: user.email,
        role: user.role,
      })
    ).toString('base64');

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      message: '2FA verification successful',
    });
  } catch (err) {
    console.error('Error verifying 2FA:', err);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

/**
 * Assign role to user (RBAC setup)
 * POST /auth/users/:userId/roles
 * Body: { roleCode: string }
 * Admin only
 */
router.post(
  '/users/:userId/roles',
  authMiddleware,
  requirePermission(pool, 'users:manage'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { userId } = req.params;
    const { roleCode } = req.body;

    if (!roleCode) {
      res.status(400).json({ error: 'roleCode required' });
      return;
    }

    try {
      // Verify role exists
      const roleExists = await pool.query(`SELECT 1 FROM roles WHERE code = $1`, [roleCode]);

      if (roleExists.rows.length === 0) {
        res.status(400).json({ error: `Role '${roleCode}' does not exist` });
        return;
      }

      // Assign role
      await pool.query(
        `INSERT INTO user_roles (user_id, role_code)
         VALUES ($1, $2)
         ON CONFLICT (user_id, role_code) DO NOTHING`,
        [userId, roleCode]
      );

      res.json({ success: true, message: `Role '${roleCode}' assigned to user` });
    } catch (err) {
      console.error('Error assigning role:', err);
      res.status(500).json({ error: 'Failed to assign role' });
    }
  }
);

/**
 * Get user roles and permissions
 * GET /auth/me/roles
 * Authenticated
 */
router.get('/me/roles', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?.userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const roles = await getUserRoles(pool, req.user.userId);

    // Also get permissions (already loaded by middleware if permission check was done)
    const perms = (req as any).userPermissions || [];

    res.json({
      success: true,
      data: {
        userId: req.user.userId,
        roles,
        permissions: perms,
      },
    });
  } catch (err) {
    console.error('Error fetching user roles:', err);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

/**
 * Setup TOTP (Time-Based One-Time Password)
 * POST /auth/setup-totp
 * Returns QR code and secret for authenticator app
 */
router.post('/setup-totp', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [req.user.userId]);

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const { otpauthUrl, secret } = await setupTotp(pool, req.user.userId, userResult.rows[0].email);

    // Generate QR code
    const qrCode = Buffer.from(otpauthUrl).toString('base64');

    res.json({
      success: true,
      data: {
        otpauthUrl,
        secret,
        qrCode, // Base64 encoded URL for frontend to generate QR
      },
    });
  } catch (err) {
    console.error('TOTP setup error:', err);
    res.status(500).json({ error: 'Failed to setup TOTP' });
  }
});

/**
 * Verify TOTP code and enable it
 * POST /auth/verify-totp-enable
 * Body: { code }
 */
router.post('/verify-totp-enable', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { code } = req.body || {};

  if (!req.user?.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!code) {
    res.status(400).json({ error: 'TOTP code required' });
    return;
  }

  try {
    const verified = await verifyUserTotp(pool, req.user.userId, code);

    if (!verified) {
      res.status(401).json({ error: 'Invalid TOTP code' });
      return;
    }

    // Enable TOTP
    await enableTotp(pool, req.user.userId);

    res.json({
      success: true,
      message: 'TOTP enabled successfully',
    });
  } catch (err) {
    console.error('TOTP verification error:', err);
    res.status(500).json({ error: 'Failed to verify TOTP' });
  }
});

/**
 * Disable TOTP
 * POST /auth/disable-totp
 */
router.post('/disable-totp', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    await disableTotp(pool, req.user.userId);

    res.json({
      success: true,
      message: 'TOTP disabled',
    });
  } catch (err) {
    console.error('TOTP disable error:', err);
    res.status(500).json({ error: 'Failed to disable TOTP' });
  }
});

/**
 * Verify TOTP during login (alternative to email OTP)
 * POST /auth/verify-totp-login
 * Body: { userId, code }
 */
router.post('/verify-totp-login', async (req: Request, res: Response): Promise<void> => {
  const { userId, code } = req.body || {};

  if (!userId || !code) {
    res.status(400).json({ error: 'userId and code required' });
    return;
  }

  try {
    const verified = await verifyUserTotp(pool, userId, code);

    if (!verified) {
      res.status(401).json({ error: 'Invalid TOTP code' });
      return;
    }

    // Fetch user
    const userResult = await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [userId]);

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = userResult.rows[0];
    const userAgent = req.headers['user-agent'] || undefined;
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || undefined;
    const tokens = await createJwtTokens(user.id, user.email, user.role, userAgent, ipAddress);
    authEventsTotal.inc({ event_type: 'login_success', status: 'totp_verified' });

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (err) {
    console.error('TOTP login verification error:', err);
    res.status(500).json({ error: 'TOTP verification failed' });
  }
});

export default router;
