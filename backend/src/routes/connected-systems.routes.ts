import { Router, Response } from 'express';
import type { Pool } from 'pg';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { UserRole } from '../types/index';

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

function normalizeSystemType(v: any) {
  return String(v || '').trim().toLowerCase();
}

function normalizeAuthType(v: any) {
  return String(v || '').trim().toLowerCase();
}

async function testConnectedSystem(row: any): Promise<{ ok: boolean; message: string }> {
  try {
    const headers: Record<string, string> = {};

    if (row.auth_type === 'api_key' && row.auth_config?.apiKey) {
      headers['x-api-key'] = row.auth_config.apiKey;
    }

    if (row.auth_type === 'bearer' && row.auth_config?.token) {
      headers.authorization = `Bearer ${row.auth_config.token}`;
    }

    const target = String(row.base_url || '').trim();
    if (!target) {
      return { ok: false, message: 'Missing base URL' };
    }

    const response = await fetch(target, {
      method: 'GET',
      headers,
    });

    if (response.ok) {
      return { ok: true, message: `Connected (HTTP ${response.status})` };
    }

    return { ok: false, message: `Failed (HTTP ${response.status})` };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Connection failed' };
  }
}

export function createConnectedSystemsRouter(pool: Pool) {
  const router = Router();

  router.get('/', authMiddleware, requireRole(UserRole.ADMIN), async (_req: AuthRequest, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT *
         FROM connected_systems
         ORDER BY created_at DESC`
      );

      res.json({ success: true, data: result.rows });
    } catch (err) {
      console.error('List connected systems error:', err);
      res.status(500).json({ error: 'Failed to load connected systems' });
    }
  });

  router.post('/', authMiddleware, requireRole(UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
    const {
      name,
      systemType,
      baseUrl,
      authType = 'none',
      authConfig = {},
      isActive = true,
      notes = null,
    } = req.body || {};

    const normalizedSystemType = normalizeSystemType(systemType);
    const normalizedAuthType = normalizeAuthType(authType);
    const allowedSystemTypes = ['hospital', 'dispatch_agency', 'webhook_partner'];
    const allowedAuthTypes = ['none', 'api_key', 'bearer'];

    if (!name || !baseUrl || !allowedSystemTypes.includes(normalizedSystemType)) {
      res.status(400).json({ error: 'name, baseUrl, and valid systemType are required' });
      return;
    }

    if (!allowedAuthTypes.includes(normalizedAuthType)) {
      res.status(400).json({ error: 'Invalid authType' });
      return;
    }

    try {
      const result = await pool.query(
        `INSERT INTO connected_systems
         (name, system_type, base_url, auth_type, auth_config, is_active, status, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'not_tested', $7, now(), now())
         RETURNING *`,
        [name, normalizedSystemType, baseUrl, normalizedAuthType, JSON.stringify(authConfig || {}), !!isActive, notes]
      );

      await logAudit(
        pool,
        req.user?.userId || null,
        'CONNECTED_SYSTEM_CREATED',
        'connected_system',
        result.rows[0].id,
        { name, systemType: normalizedSystemType, baseUrl }
      );

      res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      console.error('Create connected system error:', err);
      res.status(500).json({ error: 'Failed to create connected system' });
    }
  });

  router.put('/:id', authMiddleware, requireRole(UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, systemType, baseUrl, authType, authConfig, isActive, notes } = req.body || {};

    try {
      const existing = await pool.query(`SELECT * FROM connected_systems WHERE id = $1`, [id]);

      if (existing.rows.length === 0) {
        res.status(404).json({ error: 'Connected system not found' });
        return;
      }

      const current = existing.rows[0];
      const updated = await pool.query(
        `UPDATE connected_systems
         SET name = $2,
             system_type = $3,
             base_url = $4,
             auth_type = $5,
             auth_config = $6,
             is_active = $7,
             notes = $8,
             updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [
          id,
          name ?? current.name,
          normalizeSystemType(systemType || current.system_type),
          baseUrl ?? current.base_url,
          normalizeAuthType(authType || current.auth_type),
          JSON.stringify(authConfig ?? current.auth_config ?? {}),
          typeof isActive === 'boolean' ? isActive : current.is_active,
          notes ?? current.notes,
        ]
      );

      await logAudit(pool, req.user?.userId || null, 'CONNECTED_SYSTEM_UPDATED', 'connected_system', id);
      res.json({ success: true, data: updated.rows[0] });
    } catch (err) {
      console.error('Update connected system error:', err);
      res.status(500).json({ error: 'Failed to update connected system' });
    }
  });

  router.post('/:id/test', authMiddleware, requireRole(UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    try {
      const result = await pool.query(`SELECT * FROM connected_systems WHERE id = $1`, [id]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Connected system not found' });
        return;
      }

      const row = result.rows[0];
      const test = await testConnectedSystem(row);

      const updated = await pool.query(
        `UPDATE connected_systems
         SET status = $2,
             last_tested_at = now(),
             last_test_result = $3,
             updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [id, test.ok ? 'connected' : 'failed', test.message]
      );

      await logAudit(
        pool,
        req.user?.userId || null,
        test.ok ? 'CONNECTED_SYSTEM_TEST_SUCCESS' : 'CONNECTED_SYSTEM_TEST_FAILED',
        'connected_system',
        id,
        { message: test.message }
      );

      res.json({ success: true, data: updated.rows[0] });
    } catch (err) {
      console.error('Test connected system error:', err);
      res.status(500).json({ error: 'Failed to test connected system' });
    }
  });

  return router;
}
