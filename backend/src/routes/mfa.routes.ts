import { Router, Response, Request } from 'express';
import { Pool } from 'pg';
import QRCode from 'qrcode';
import { authMiddleware, AuthRequest } from '../middleware/auth';

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

// Cache for dynamically loaded otplib authenticator
let authenticatorCache: any = null;

async function getAuthenticator() {
  if (authenticatorCache) {
    return authenticatorCache;
  }
  try {
    const otplib = await import('otplib');
    authenticatorCache = (otplib as any).authenticator || (otplib.default as any).authenticator;
    return authenticatorCache;
  } catch (err) {
    console.error('Failed to load otplib:', err);
    throw err;
  }
}

export function createMfaRouter(pool: Pool) {
  const router = Router();
  const issuer = process.env.TOTP_ISSUER || 'HomeCare';

  /**
   * POST /mfa/totp/setup
   * Requires auth
   * Creates or replaces non-enabled secret and returns otpauth URI + QR
   */
  router.post('/totp/setup', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const email = req.user?.email;

    if (!userId || !email) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const authenticator = await getAuthenticator();
      const secret = authenticator.generateSecret();
      const label = `${issuer}:${email}`;
      const otpauth = authenticator.keyuri(email, issuer, secret);
      const qrDataUrl = await QRCode.toDataURL(otpauth);

      await pool.query(
        `INSERT INTO user_mfa_totp (user_id, secret, issuer, label, enabled, verified_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, false, null, now(), now())
         ON CONFLICT (user_id)
         DO UPDATE SET
           secret = EXCLUDED.secret,
           issuer = EXCLUDED.issuer,
           label = EXCLUDED.label,
           enabled = false,
           verified_at = null,
           updated_at = now()`,
        [userId, secret, issuer, label]
      );

      await logAudit(pool, userId, 'MFA_TOTP_SETUP_STARTED', 'user', userId, { email });

      res.json({
        success: true,
        data: {
          secret,
          issuer,
          label,
          otpauth,
          qrDataUrl,
        },
      });
    } catch (err) {
      console.error('TOTP setup error:', err);
      res.status(500).json({ error: 'Failed to start TOTP setup' });
    }
  });

  /**
   * POST /mfa/totp/verify-enable
   * Body: { code }
   * Verifies current setup secret and enables MFA
   */
  router.post('/totp/verify-enable', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const code = String(req.body?.code || '').trim();

    if (!userId || !code) {
      res.status(400).json({ error: 'Code required' });
      return;
    }

    try {
      const authenticator = await getAuthenticator();
      const row = await pool.query(
        `SELECT user_id, secret, enabled
         FROM user_mfa_totp
         WHERE user_id = $1`,
        [userId]
      );

      if (row.rows.length === 0) {
        res.status(404).json({ error: 'No TOTP setup found' });
        return;
      }

      const secret = row.rows[0].secret as string;
      const valid = authenticator.verify({ token: code, secret });

      if (!valid) {
        await logAudit(pool, userId, 'MFA_TOTP_ENABLE_FAILED', 'user', userId);
        res.status(400).json({ error: 'Invalid code' });
        return;
      }

      await pool.query(
        `UPDATE user_mfa_totp
         SET enabled = true,
             verified_at = now(),
             updated_at = now()
         WHERE user_id = $1`,
        [userId]
      );

      await logAudit(pool, userId, 'MFA_TOTP_ENABLED', 'user', userId);

      res.json({ success: true });
    } catch (err) {
      console.error('TOTP verify-enable error:', err);
      res.status(500).json({ error: 'Failed to enable TOTP' });
    }
  });

  /**
   * POST /mfa/totp/disable
   * Body: { code }
   * Requires valid current TOTP code
   */
  router.post('/totp/disable', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const code = String(req.body?.code || '').trim();

    if (!userId || !code) {
      res.status(400).json({ error: 'Code required' });
      return;
    }

    try {
      const authenticator = await getAuthenticator();
      const row = await pool.query(
        `SELECT secret, enabled
         FROM user_mfa_totp
         WHERE user_id = $1`,
        [userId]
      );

      if (row.rows.length === 0 || !row.rows[0].enabled) {
        res.status(400).json({ error: 'TOTP is not enabled' });
        return;
      }

      const valid = authenticator.verify({
        token: code,
        secret: row.rows[0].secret,
      });

      if (!valid) {
        await logAudit(pool, userId, 'MFA_TOTP_DISABLE_FAILED', 'user', userId);
        res.status(400).json({ error: 'Invalid code' });
        return;
      }

      await pool.query(`DELETE FROM user_mfa_totp WHERE user_id = $1`, [userId]);

      await logAudit(pool, userId, 'MFA_TOTP_DISABLED', 'user', userId);

      res.json({ success: true });
    } catch (err) {
      console.error('TOTP disable error:', err);
      res.status(500).json({ error: 'Failed to disable TOTP' });
    }
  });

  /**
   * GET /mfa/totp/status
   */
  router.get('/totp/status', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const row = await pool.query(
        `SELECT enabled, verified_at, created_at, updated_at
         FROM user_mfa_totp
         WHERE user_id = $1`,
        [userId]
      );

      if (row.rows.length === 0) {
        res.json({
          success: true,
          data: {
            enabled: false,
            exists: false,
          },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          enabled: !!row.rows[0].enabled,
          exists: true,
          verifiedAt: row.rows[0].verified_at,
          createdAt: row.rows[0].created_at,
          updatedAt: row.rows[0].updated_at,
        },
      });
    } catch (err) {
      console.error('TOTP status error:', err);
      res.status(500).json({ error: 'Failed to load TOTP status' });
    }
  });

  return router;
}
