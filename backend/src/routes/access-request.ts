/**
 * PHASE 4: Access Request Workflow
 * - Public endpoint for requesting access
 * - Admin endpoint to view + approve/reject requests
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { UserRole } from '../types/index';

async function logAudit(
  pool: Pool,
  actorUserId: string | null | undefined,
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

export function createAccessRequestRouter(pool: Pool) {
  const router = Router();

  /**
   * POST /access/request
   * Public endpoint: anyone can request access
   * Body: { name, email, requestedRole, reason }
   */
  router.post('/request', async (req: Request, res: Response): Promise<void> => {
    const { name, email, requestedRole, reason } = req.body || {};

    if (!email || !requestedRole) {
      res.status(400).json({ error: 'email and requestedRole required' });
      return;
    }

    const validRoles = ['admin', 'client', 'nurse', 'doctor'];
    if (!validRoles.includes(String(requestedRole).toLowerCase())) {
      res.status(400).json({ error: 'Invalid role requested' });
      return;
    }

    try {
      await pool.query(
        `INSERT INTO access_requests (requester_name, requester_email, requested_role, reason, status, created_at)
         VALUES ($1, $2, $3, $4, 'pending', now())`,
        [name || null, email, requestedRole, reason || null]
      );

      await logAudit(pool, null, 'ACCESS_REQUEST_CREATED', 'access_requests', undefined, { email, requestedRole });

      res.json({ success: true, message: 'Access request submitted. An administrator will review it shortly.' });
    } catch (err) {
      console.error('Access request error:', err);
      res.status(500).json({ error: 'Failed to create access request' });
    }
  });

  /**
   * GET /access/admin/requests
   * Admin only: view all access requests
   */
  router.get(
    '/admin/requests',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (_req: AuthRequest, res: Response): Promise<void> => {
      try {
        const rows = await pool.query(
          `SELECT id, requester_name, requester_email, requested_role, reason, status, reviewed_by, reviewed_at, created_at
           FROM access_requests
           ORDER BY created_at DESC
           LIMIT 100`
        );

        res.json({ success: true, data: rows.rows });
      } catch (err) {
        console.error('Fetch access requests error:', err);
        res.status(500).json({ error: 'Failed to fetch requests' });
      }
    }
  );

  /**
   * POST /access/admin/:id/decide
   * Admin only: approve or reject an access request
   * Body: { decision, notes? }
   */
  router.post(
    '/admin/:id/decide',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response): Promise<void> => {
      const requestId = req.params.id;
      const { decision, notes } = req.body || {};

      if (!['approved', 'rejected'].includes(String(decision).toLowerCase())) {
        res.status(400).json({ error: 'decision must be approved or rejected' });
        return;
      }

      try {
        // Fetch the request
        const existing = await pool.query(`SELECT id, requester_email FROM access_requests WHERE id = $1`, [requestId]);

        if (existing.rows.length === 0) {
          res.status(404).json({ error: 'Request not found' });
          return;
        }

        const email = existing.rows[0].requester_email;

        // Update request
        await pool.query(
          `UPDATE access_requests
           SET status = $2, reviewed_by = $3, reviewed_at = now()
           WHERE id = $1`,
          [requestId, String(decision).toLowerCase(), req.user?.userId || null]
        );

        // Audit log
        await logAudit(pool, req.user?.userId || null, 'ACCESS_REQUEST_DECIDED', 'access_requests', requestId, {
          decision,
          email,
          notes,
        });

        res.json({ success: true });
      } catch (err) {
        console.error('Access request decision error:', err);
        res.status(500).json({ error: 'Failed to update request' });
      }
    }
  );

  return router;
}
