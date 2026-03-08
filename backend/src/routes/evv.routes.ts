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
  metadata?: unknown
) {
  try {
    await pool.query(
      `INSERT INTO audit_events
       (actor_user_id, action, entity_type, entity_id, metadata, severity, created_at)
       VALUES ($1, $2, $3, $4, $5, 'info', now())`,
      [
        actorUserId,
        action,
        entityType || null,
        entityId || null,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

export function createEvvRouter(pool: Pool) {
  const router = Router();

  router.post(
    '/check-in',
    authMiddleware,
    requireRole(UserRole.ADMIN, UserRole.NURSE, UserRole.DOCTOR),
    async (req: AuthRequest, res: Response) => {
      const { requestId, latitude, longitude, notes } = req.body || {};
      const professionalId = req.user?.userId || null;

      if (!requestId || !professionalId) {
        res.status(400).json({ error: 'requestId is required' });
        return;
      }

      try {
        const requestResult = await pool.query(
          `SELECT id, professional_id, evv_status, status
           FROM care_requests
           WHERE id = $1
           LIMIT 1`,
          [requestId]
        );

        if (requestResult.rows.length === 0) {
          res.status(404).json({ error: 'Request not found' });
          return;
        }

        const visit = requestResult.rows[0];

        if (
          req.user?.role !== UserRole.ADMIN &&
          String(visit.professional_id || '') !== String(professionalId)
        ) {
          res.status(403).json({ error: 'You are not assigned to this visit' });
          return;
        }

        if (String(visit.evv_status || '') === 'completed') {
          res.status(400).json({ error: 'Visit already checked out' });
          return;
        }

        if (String(visit.evv_status || '') === 'in_progress') {
          res.status(400).json({ error: 'Visit already checked in' });
          return;
        }

        await pool.query(
          `INSERT INTO evv_events
           (request_id, professional_id, event_type, event_time, latitude, longitude, source, notes, created_at)
           VALUES ($1, $2, 'check_in', now(), $3, $4, 'web', $5, now())`,
          [requestId, professionalId, latitude || null, longitude || null, notes || null]
        );

        const updated = await pool.query(
          `UPDATE care_requests
           SET evv_status = 'in_progress',
               checked_in_at = now(),
               status = CASE WHEN status = 'accepted' THEN 'en_route' ELSE status END,
               updated_at = now()
           WHERE id = $1
           RETURNING *`,
          [requestId]
        );

        await logAudit(pool, professionalId, 'EVV_CHECK_IN', 'care_request', requestId, {
          latitude,
          longitude,
        });

        res.json({ success: true, data: updated.rows[0] });
      } catch (err) {
        console.error('EVV check-in error:', err);
        res.status(500).json({ error: 'Failed to check in' });
      }
    }
  );

  router.post(
    '/check-out',
    authMiddleware,
    requireRole(UserRole.ADMIN, UserRole.NURSE, UserRole.DOCTOR),
    async (req: AuthRequest, res: Response) => {
      const { requestId, latitude, longitude, notes } = req.body || {};
      const professionalId = req.user?.userId || null;

      if (!requestId || !professionalId) {
        res.status(400).json({ error: 'requestId is required' });
        return;
      }

      try {
        const requestResult = await pool.query(
          `SELECT id, professional_id, evv_status
           FROM care_requests
           WHERE id = $1
           LIMIT 1`,
          [requestId]
        );

        if (requestResult.rows.length === 0) {
          res.status(404).json({ error: 'Request not found' });
          return;
        }

        const visit = requestResult.rows[0];

        if (
          req.user?.role !== UserRole.ADMIN &&
          String(visit.professional_id || '') !== String(professionalId)
        ) {
          res.status(403).json({ error: 'You are not assigned to this visit' });
          return;
        }

        if (String(visit.evv_status || '') !== 'in_progress') {
          res.status(400).json({ error: 'Visit must be checked in before check out' });
          return;
        }

        await pool.query(
          `INSERT INTO evv_events
           (request_id, professional_id, event_type, event_time, latitude, longitude, source, notes, created_at)
           VALUES ($1, $2, 'check_out', now(), $3, $4, 'web', $5, now())`,
          [requestId, professionalId, latitude || null, longitude || null, notes || null]
        );

        const updated = await pool.query(
          `UPDATE care_requests
           SET evv_status = 'completed',
               checked_out_at = now(),
               status = 'completed',
               updated_at = now()
           WHERE id = $1
           RETURNING *`,
          [requestId]
        );

        await logAudit(pool, professionalId, 'EVV_CHECK_OUT', 'care_request', requestId, {
          latitude,
          longitude,
        });

        res.json({ success: true, data: updated.rows[0] });
      } catch (err) {
        console.error('EVV check-out error:', err);
        res.status(500).json({ error: 'Failed to check out' });
      }
    }
  );

  router.get(
    '/request/:requestId',
    authMiddleware,
    requireRole(UserRole.ADMIN, UserRole.NURSE, UserRole.DOCTOR),
    async (req: AuthRequest, res: Response) => {
      try {
        const { requestId } = req.params;
        const professionalId = req.user?.userId || null;

        const visitResult = await pool.query(
          `SELECT id, professional_id, evv_status, checked_in_at, checked_out_at
           FROM care_requests
           WHERE id = $1
           LIMIT 1`,
          [requestId]
        );

        if (visitResult.rows.length === 0) {
          res.status(404).json({ error: 'Request not found' });
          return;
        }

        const visit = visitResult.rows[0];

        if (
          req.user?.role !== UserRole.ADMIN &&
          String(visit.professional_id || '') !== String(professionalId)
        ) {
          res.status(403).json({ error: 'You are not assigned to this visit' });
          return;
        }

        const eventsResult = await pool.query(
          `SELECT id, request_id, professional_id, event_type, event_time, latitude, longitude, source, notes
           FROM evv_events
           WHERE request_id = $1
           ORDER BY event_time ASC`,
          [requestId]
        );

        res.json({
          success: true,
          data: {
            visit,
            events: eventsResult.rows,
          },
        });
      } catch (err) {
        console.error('EVV request history error:', err);
        res.status(500).json({ error: 'Failed to load EVV history' });
      }
    }
  );

  return router;
}
