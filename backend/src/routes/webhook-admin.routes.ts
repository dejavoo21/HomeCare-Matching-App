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

export function createWebhookAdminRouter(pool: Pool) {
  const router = Router();

  router.get(
    '/subscriptions',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (_req: AuthRequest, res: Response) => {
      try {
        const result = await pool.query(
          `SELECT *
           FROM webhook_subscriptions
           ORDER BY created_at DESC`
        );
        res.json({ success: true, data: result.rows });
      } catch (err) {
        console.error('List subscriptions error:', err);
        res.status(500).json({ error: 'Failed to load webhook subscriptions' });
      }
    }
  );

  router.post(
    '/subscriptions',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response) => {
      const { name, targetUrl, secret, isActive = true, eventTypes = [] } = req.body || {};

      if (!name || !targetUrl) {
        res.status(400).json({ error: 'name and targetUrl are required' });
        return;
      }

      try {
        const result = await pool.query(
          `INSERT INTO webhook_subscriptions
           (name, target_url, secret, is_active, event_types, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, now(), now())
           RETURNING *`,
          [name, targetUrl, secret || null, !!isActive, JSON.stringify(eventTypes || [])]
        );

        await logAudit(
          pool,
          req.user?.userId || null,
          'WEBHOOK_SUBSCRIPTION_CREATED',
          'webhook_subscription',
          result.rows[0].id,
          { name, targetUrl, eventTypes }
        );

        res.json({ success: true, data: result.rows[0] });
      } catch (err) {
        console.error('Create subscription error:', err);
        res.status(500).json({ error: 'Failed to create webhook subscription' });
      }
    }
  );

  router.put(
    '/subscriptions/:id',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response) => {
      const { id } = req.params;
      const { name, targetUrl, secret, isActive, eventTypes } = req.body || {};

      try {
        const result = await pool.query(
          `UPDATE webhook_subscriptions
           SET name = COALESCE($2, name),
               target_url = COALESCE($3, target_url),
               secret = CASE WHEN $4::text IS NULL THEN secret ELSE $4 END,
               is_active = COALESCE($5, is_active),
               event_types = COALESCE($6, event_types),
               updated_at = now()
           WHERE id = $1
           RETURNING *`,
          [
            id,
            name ?? null,
            targetUrl ?? null,
            secret === undefined ? null : secret,
            typeof isActive === 'boolean' ? isActive : null,
            eventTypes ? JSON.stringify(eventTypes) : null,
          ]
        );

        if (result.rows.length === 0) {
          res.status(404).json({ error: 'Webhook subscription not found' });
          return;
        }

        await logAudit(
          pool,
          req.user?.userId || null,
          'WEBHOOK_SUBSCRIPTION_UPDATED',
          'webhook_subscription',
          id
        );

        res.json({ success: true, data: result.rows[0] });
      } catch (err) {
        console.error('Update subscription error:', err);
        res.status(500).json({ error: 'Failed to update webhook subscription' });
      }
    }
  );

  router.get(
    '/deliveries',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response) => {
      const limit = Math.min(parseInt(String(req.query.limit || '100'), 10) || 100, 500);

      try {
        const result = await pool.query(
          `SELECT
             d.*,
             s.name as subscription_name,
             s.target_url
           FROM webhook_deliveries d
           JOIN webhook_subscriptions s ON s.id = d.subscription_id
           ORDER BY d.created_at DESC
           LIMIT $1`,
          [limit]
        );

        res.json({ success: true, data: result.rows });
      } catch (err) {
        console.error('List deliveries error:', err);
        res.status(500).json({ error: 'Failed to load webhook deliveries' });
      }
    }
  );

  router.get(
    '/dead-letters',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response) => {
      const limit = Math.min(parseInt(String(req.query.limit || '100'), 10) || 100, 500);

      try {
        const result = await pool.query(
          `SELECT
             dl.*,
             s.name as subscription_name,
             s.target_url
           FROM webhook_dead_letters dl
           JOIN webhook_subscriptions s ON s.id = dl.subscription_id
           ORDER BY dl.created_at DESC
           LIMIT $1`,
          [limit]
        );

        res.json({ success: true, data: result.rows });
      } catch (err) {
        console.error('List dead letters error:', err);
        res.status(500).json({ error: 'Failed to load dead letters' });
      }
    }
  );

  router.post(
    '/deliveries/:id/replay',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response) => {
      const { id } = req.params;

      try {
        const result = await pool.query(
          `UPDATE webhook_deliveries
           SET status = 'pending',
               attempt_count = 0,
               next_attempt_at = now(),
               last_error = null,
               last_http_status = null,
               updated_at = now()
           WHERE id = $1
           RETURNING *`,
          [id]
        );

        if (result.rows.length === 0) {
          res.status(404).json({ error: 'Webhook delivery not found' });
          return;
        }

        await logAudit(
          pool,
          req.user?.userId || null,
          'WEBHOOK_DELIVERY_REPLAYED',
          'webhook_delivery',
          id
        );

        res.json({ success: true, data: result.rows[0] });
      } catch (err) {
        console.error('Replay delivery error:', err);
        res.status(500).json({ error: 'Failed to replay delivery' });
      }
    }
  );

  return router;
}
