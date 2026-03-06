/**
 * PHASE 4: Enterprise-Ready Auth
 * - JWT with refresh token rotation
 * - HttpOnly cookies (Railway-production-safe)
 * - Proper password hashing with bcrypt
 * - Audit logging for all auth events
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { authenticator } from 'otplib';
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken, compareTokenHash } from '../utils/jwt';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { UserRole } from '../types/index';

const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '30d';

async function logAudit(
  pool: Pool,
  actorUserId: string | null,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: any
) {
  try {
    await pool.query(
      `INSERT INTO audit_events (actor_user_id, action, entity_type, entity_id, metadata, severity, created_at)
       VALUES ($1, $2, $3, $4, $5, 'info', now())`,
      [actorUserId, action, entityType || null, entityId || null, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

function setTokenCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  isProduction: boolean
) {
  // Access token: short-lived, HttpOnly, Secure only on HTTPS
  // For cross-origin requests, must use sameSite: 'none' with secure: true
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction || true, // Always secure in production for cross-origin
    sameSite: 'none', // Allow cross-origin cookie sending
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  // Refresh token: long-lived, HttpOnly, Secure only on HTTPS
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction || true, // Always secure in production for cross-origin
    sameSite: 'none', // Allow cross-origin cookie sending
    maxAge: COOKIE_MAX_AGE,
  });
}

function clearTokenCookies(res: Response) {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
}

export function createAuthPhase4Router(pool: Pool) {
  const router = Router();
  const isProduction = process.env.NODE_ENV === 'production';

  /**
   * POST /auth/login
   * Body: { email, password }
   * Returns: { user, tokens } + sets HttpOnly cookies
   */
  router.post('/login', async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body || {};

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }

    try {
      // Fetch user with password hash
      const userResult = await pool.query(
        `SELECT id, name, email, password_hash, role, is_active
         FROM users
         WHERE LOWER(email) = LOWER($1)
         LIMIT 1`,
        [email]
      );

      if (userResult.rows.length === 0) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const user = userResult.rows[0];

      // Check if account is active
      if (!user.is_active) {
        await logAudit(pool, null, 'AUTH_LOGIN_DISABLED', 'user', user.id, { email });
        res.status(403).json({ error: 'Account disabled' });
        return;
      }

      // Verify password
      const passwordHashExists = user.password_hash && String(user.password_hash).trim();
      const passwordMatch = passwordHashExists
        ? await bcrypt.compare(String(password), String(user.password_hash))
        : false;

      if (!passwordMatch) {
        await logAudit(pool, null, 'AUTH_LOGIN_FAILED', 'user', user.id, { email, reason: 'invalid_password' });
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Check if TOTP is enabled
      const mfaRow = await pool.query(
        `SELECT enabled
         FROM user_mfa_totp
         WHERE user_id = $1`,
        [user.id]
      );

      const totpEnabled = mfaRow.rows.length > 0 && !!mfaRow.rows[0].enabled;

      if (totpEnabled) {
        await logAudit(pool, user.id, 'AUTH_LOGIN_MFA_REQUIRED', 'user', user.id, { email });

        res.json({
          success: true,
          data: {
            requiresTotp: true,
            userId: user.id,
            email: user.email,
            role: user.role,
          },
        });
        return;
      }

      // Generate refresh token first
      const tempTokenId = crypto.randomUUID();
      const refreshTokenRaw = signRefreshToken({ userId: user.id, tokenId: tempTokenId });

      // Hash it before storing
      const tokenHash = hashToken(refreshTokenRaw);

      // Create refresh token record with hash
      const tokenRow = await pool.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address, created_at)
         VALUES ($1, $2, now() + interval '30 days', $3, $4, now())
         RETURNING id`,
        [user.id, tokenHash, req.headers['user-agent'] || null, req.ip || null]
      );

      const tokenId = tokenRow.rows[0].id;

      // Sign access token
      const accessToken = signAccessToken({ userId: user.id, role: user.role, email: user.email });

      // Set HttpOnly cookies
      setTokenCookies(res, accessToken, refreshTokenRaw, isProduction);

      // Audit log
      await logAudit(pool, user.id, 'AUTH_LOGIN', 'user', user.id, { email });

      res.json({
        success: true,
        data: {
          user: { id: user.id, name: user.name, email: user.email, role: user.role },
          // Include tokens in response body as fallback for localStorage
          accessToken,
          refreshToken: refreshTokenRaw,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  /**
   * POST /auth/refresh
   * Rotates refresh token on successful verification
   * Returns: New access token + new refresh token (in cookies)
   */
  router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
    // Get refresh token from cookie (HttpOnly) or body fallback
    const refreshTokenRaw =
      req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshTokenRaw) {
      res.status(401).json({ error: 'No refresh token' });
      return;
    }

    try {
      // Verify JWT structure
      const decoded = verifyRefreshToken(String(refreshTokenRaw));
      const userId = decoded.userId;
      const tokenId = decoded.tokenId;

      // Check token record in DB
      const tokenRow = await pool.query(
        `SELECT id, user_id, token_hash, expires_at, revoked_at, replaced_by
         FROM refresh_tokens
         WHERE id = $1`,
        [tokenId]
      );

      if (tokenRow.rows.length === 0) {
        res.status(401).json({ error: 'Invalid refresh token' });
        return;
      }

      const dbt = tokenRow.rows[0];

      // Check if revoked
      if (dbt.revoked_at || dbt.replaced_by) {
        await logAudit(pool, userId, 'AUTH_REFRESH_REVOKED', 'refresh_token', tokenId);
        res.status(401).json({ error: 'Refresh token revoked' });
        return;
      }

      // Check if expired
      if (new Date(dbt.expires_at).getTime() < Date.now()) {
        await logAudit(pool, userId, 'AUTH_REFRESH_EXPIRED', 'refresh_token', tokenId);
        res.status(401).json({ error: 'Refresh token expired' });
        return;
      }

      // Verify token hash matches
      const tokenMatches = compareTokenHash(String(refreshTokenRaw), String(dbt.token_hash));
      if (!tokenMatches) {
        await logAudit(pool, userId, 'AUTH_REFRESH_INVALID', 'refresh_token', tokenId);
        res.status(401).json({ error: 'Refresh token invalid' });
        return;
      }

      // Load user details
      const userRow = await pool.query(
        `SELECT id, name, email, role, is_active FROM users WHERE id = $1`,
        [userId]
      );

      if (userRow.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const user = userRow.rows[0];

      if (!user.is_active) {
        res.status(403).json({ error: 'Account disabled' });
        return;
      }

      // Create new refresh token (rotation)
      const newTokenRow = await pool.query(
        `INSERT INTO refresh_tokens (user_id, expires_at, user_agent, ip_address, created_at)
         VALUES ($1, now() + interval '30 days', $2, $3, now())
         RETURNING id`,
        [userId, req.headers['user-agent'] || null, req.ip || null]
      );

      const newTokenId = newTokenRow.rows[0].id;
      const newAccessToken = signAccessToken({ userId, role: user.role, email: user.email });
      const newRefreshTokenRaw = signRefreshToken({ userId, tokenId: newTokenId });
      const newTokenHash = hashToken(newRefreshTokenRaw);

      await pool.query(`UPDATE refresh_tokens SET token_hash = $2 WHERE id = $1`, [
        newTokenId,
        newTokenHash,
      ]);

      // Revoke old token
      await pool.query(`UPDATE refresh_tokens SET revoked_at = now(), replaced_by = $2 WHERE id = $1`, [
        tokenId,
        newTokenId,
      ]);

      // Set new cookies
      setTokenCookies(res, newAccessToken, newRefreshTokenRaw, isProduction);

      // Audit log
      await logAudit(pool, userId, 'AUTH_REFRESH', 'user', userId);

      res.json({ success: true });
    } catch (err) {
      console.error('Refresh error:', err);
      res.status(401).json({ error: 'Refresh failed' });
    }
  });

  /**
   * POST /auth/logout
   * Revokes refresh token and clears cookies
   */
  router.post('/logout', async (req: AuthRequest, res: Response): Promise<void> => {
    const refreshTokenRaw = req.cookies?.refreshToken || req.body?.refreshToken;

    try {
      if (refreshTokenRaw) {
        const decoded = verifyRefreshToken(String(refreshTokenRaw));
        await pool.query(`UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1`, [decoded.tokenId]);

        if (decoded.userId) {
          await logAudit(pool, decoded.userId, 'AUTH_LOGOUT', 'user', decoded.userId);
        }
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      clearTokenCookies(res);
      res.json({ success: true });
    }
  });

  /**
   * GET /auth/me
   * Returns current user from token
   */
  router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    res.json({
      success: true,
      data: {
        user: {
          userId: req.user?.userId,
          email: req.user?.email,
          role: req.user?.role,
        },
      },
    });
  });

  /**
   * POST /set-password (TEST ONLY - No auth required)
   * Sets password for onboarding@sochristventures.com user
   * DEV/TEST endpoint - should be removed in production
   */
  router.post('/set-password', async (req: Request, res: Response): Promise<void> => {
    const { password } = req.body || {};
    
    if (!password) {
      res.status(400).json({ error: 'Password required' });
      return;
    }

    try {
      // Hash the new password
      const passwordHash = await bcrypt.hash(String(password), 10);

      // Update the test user
      const result = await pool.query(
        `UPDATE users SET password_hash = $1 WHERE LOWER(email) = LOWER($2) RETURNING id, email, name`,
        [passwordHash, 'onboarding@sochristventures.com']
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      await logAudit(pool, null, 'TEST_PASSWORD_SET', 'user', result.rows[0].id, { email: result.rows[0].email });

      res.json({
        success: true,
        message: 'Password updated for ' + result.rows[0].email,
        user: result.rows[0],
      });
    } catch (err) {
      console.error('Set password error:', err);
      res.status(500).json({ error: 'Failed to set password' });
    }
  });

  /**
   * POST /auth/verify-totp-login
   * Body: { userId, code }
   * Completes login flow when TOTP is enabled
   */
  router.post('/verify-totp-login', async (req: Request, res: Response): Promise<void> => {
    const { userId, code } = req.body || {};

    if (!userId || !code) {
      res.status(400).json({ error: 'userId and code are required' });
      return;
    }

    try {
      const userResult = await pool.query(
        `SELECT id, name, email, role, is_active
         FROM users
         WHERE id = $1
         LIMIT 1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const user = userResult.rows[0];

      if (!user.is_active) {
        res.status(403).json({ error: 'Account disabled' });
        return;
      }

      const mfaRow = await pool.query(
        `SELECT secret, enabled
         FROM user_mfa_totp
         WHERE user_id = $1`,
        [userId]
      );

      if (mfaRow.rows.length === 0 || !mfaRow.rows[0].enabled) {
        res.status(400).json({ error: 'TOTP is not enabled for this user' });
        return;
      }

      const valid = authenticator.verify({
        token: String(code).trim(),
        secret: mfaRow.rows[0].secret,
      });

      if (!valid) {
        await logAudit(pool, user.id, 'AUTH_LOGIN_MFA_FAILED', 'user', user.id);
        res.status(401).json({ error: 'Invalid authentication code' });
        return;
      }

      // Create refresh token
      const tempTokenId = crypto.randomUUID();
      const refreshTokenRaw = signRefreshToken({ userId: user.id, tokenId: tempTokenId });
      const tokenHash = hashToken(refreshTokenRaw);

      const insert = await pool.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address, created_at)
         VALUES ($1, $2, now() + interval '30 days', $3, $4, now())
         RETURNING id`,
        [user.id, tokenHash, req.headers['user-agent'] || null, req.ip || null]
      );

      const dbTokenId = insert.rows[0].id;

      const accessToken = signAccessToken({
        userId: user.id,
        role: user.role,
        email: user.email,
      });

      setTokenCookies(res, accessToken, refreshTokenRaw, isProduction);

      await logAudit(pool, user.id, 'AUTH_LOGIN_MFA_SUCCESS', 'user', user.id);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
      });
    } catch (err) {
      console.error('TOTP login verify error:', err);
      res.status(500).json({ error: 'Failed to verify authentication code' });
    }
  });

  return router;
}
