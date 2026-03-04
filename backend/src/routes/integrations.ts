// ============================================================================
// INTEGRATIONS MANAGEMENT ROUTES
// ============================================================================
// API Keys, Webhooks, and External Integrations

import { Router, Request, Response } from 'express';
import type { Pool } from 'pg';
import crypto from 'crypto';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import { logAudit } from '../services/audit.service';

export function createIntegrationsRouter(pool: Pool) {
  const router = Router();

  /**
   * List user's integrations with API keys
   * GET /integrations
   */
  router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user?.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const result = await pool.query(
        `SELECT id, name, api_key, is_active, created_at, updated_at
         FROM integrations
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [req.user.userId]
      );

      res.json({ success: true, data: result.rows });
    } catch (err) {
      console.error('Error fetching integrations:', err);
      res.status(500).json({ error: 'Failed to fetch integrations' });
    }
  });

  /**
   * Create new API integration
   * POST /integrations
   * Body: { name, events }
   */
  router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user?.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name } = req.body || {};

    if (!name) {
      res.status(400).json({ error: 'Integration name required' });
      return;
    }

    try {
      const apiKey = crypto.randomBytes(32).toString('hex');

      const result = await pool.query(
        `INSERT INTO integrations (user_id, name, api_key, is_active)
         VALUES ($1, $2, $3, true)
         RETURNING id, name, api_key, is_active, created_at`,
        [req.user.userId, name, apiKey]
      );

      const integration = result.rows[0];

      await logAudit(pool, {
        actorId: req.user.userId,
        actionType: 'INTEGRATION_CREATE',
        entityType: 'Integration',
        entityId: integration.id,
        metadata: { name: integration.name },
      });

      res.status(201).json({ success: true, data: integration });
    } catch (err) {
      console.error('Error creating integration:', err);
      res.status(500).json({ error: 'Failed to create integration' });
    }
  });

  /**
   * Regenerate API key
   * POST /integrations/:id/regenerate-key
   */
  router.post('/:id/regenerate-key', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user?.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      // Verify ownership
      const integration = await pool.query(
        `SELECT id, api_key FROM integrations WHERE id = $1 AND user_id = $2`,
        [req.params.id, req.user.userId]
      );

      if (integration.rows.length === 0) {
        res.status(404).json({ error: 'Integration not found' });
        return;
      }

      const newApiKey = crypto.randomBytes(32).toString('hex');

      await pool.query(`UPDATE integrations SET api_key = $2 WHERE id = $1`, [req.params.id, newApiKey]);

      await logAudit(pool, {
        actorId: req.user.userId,
        actionType: 'INTEGRATION_KEY_REGENERATE',
        entityType: 'Integration',
        entityId: req.params.id,
        metadata: {},
      });

      res.json({ success: true, data: { api_key: newApiKey } });
    } catch (err) {
      console.error('Error regenerating API key:', err);
      res.status(500).json({ error: 'Failed to regenerate key' });
    }
  });

  /**
   * Delete integration
   * DELETE /integrations/:id
   */
  router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user?.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const result = await pool.query(
        `DELETE FROM integrations WHERE id = $1 AND user_id = $2 RETURNING id`,
        [req.params.id, req.user.userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Integration not found' });
        return;
      }

      await logAudit(pool, {
        actorId: req.user.userId,
        actionType: 'INTEGRATION_DELETE',
        entityType: 'Integration',
        entityId: req.params.id,
        metadata: {},
      });

      res.json({ success: true, message: 'Integration deleted' });
    } catch (err) {
      console.error('Error deleting integration:', err);
      res.status(500).json({ error: 'Failed to delete integration' });
    }
  });

  /**
   * Get webhook delivery logs
   * GET /integrations/:id/deliveries
   */
  router.get('/:id/deliveries', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user?.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      // Verify integration ownership
      const integration = await pool.query(
        `SELECT id FROM integrations WHERE id = $1 AND user_id = $2`,
        [req.params.id, req.user.userId]
      );

      if (integration.rows.length === 0) {
        res.status(404).json({ error: 'Integration not found' });
        return;
      }

      const result = await pool.query(
        `SELECT id, event_type, delivered_at, failed_at, last_error, created_at, attempt_count
         FROM webhook_deliveries
         WHERE webhook_id IN (SELECT id FROM webhooks WHERE integration_id = $1)
         ORDER BY created_at DESC
         LIMIT 100`,
        [req.params.id]
      );

      res.json({ success: true, data: result.rows });
    } catch (err) {
      console.error('Error fetching deliveries:', err);
      res.status(500).json({ error: 'Failed to fetch deliveries' });
    }
  });

  return router;
}
