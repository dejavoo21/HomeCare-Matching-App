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

export function createClinicianRouter(pool: Pool) {
  const router = Router();

  router.get(
    '/my-visits',
    authMiddleware,
    requireRole(UserRole.NURSE, UserRole.DOCTOR, UserRole.ADMIN),
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.user?.userId;
        const isAdmin = String(req.user?.role || '').toLowerCase() === 'admin';
        const professionalId = isAdmin ? String(req.query.professionalId || '') : userId;

        if (!professionalId) {
          res.status(400).json({ error: 'professionalId is required for admin view' });
          return;
        }

        const result = await pool.query(
          `SELECT
             cr.id,
             cr.client_id,
             cr.professional_id,
             cr.service_type,
             cr.address_text,
             cr.preferred_start,
             cr.urgency,
             cr.status,
             cr.description,
             cr.evv_status,
             cr.checked_in_at,
             cr.checked_out_at,
             cr.visit_notes,
             cr.visit_outcome,
             cr.follow_up_required,
             cr.escalation_required,
             cr.documented_at,
             cr.created_at,
             cr.updated_at,
             c.name AS client_name,
             c.email AS client_email,
             c.phone AS client_phone
           FROM care_requests cr
           LEFT JOIN users c ON c.id = cr.client_id
           WHERE cr.professional_id = $1
             AND cr.status IN ('offered', 'accepted', 'en_route', 'completed')
           ORDER BY cr.preferred_start ASC`,
          [professionalId]
        );

        res.json({
          success: true,
          data: result.rows,
        });
      } catch (err) {
        console.error('Clinician visits error:', err);
        res.status(500).json({ error: 'Failed to load clinician visits' });
      }
    }
  );

  router.post(
    '/visit-note',
    authMiddleware,
    requireRole(UserRole.NURSE, UserRole.DOCTOR, UserRole.ADMIN),
    async (req: AuthRequest, res: Response) => {
      const {
        requestId,
        visitNotes,
        visitOutcome,
        followUpRequired,
        escalationRequired,
      } = req.body || {};

      if (!requestId) {
        res.status(400).json({ error: 'requestId is required' });
        return;
      }

      try {
        const userId = req.user?.userId;
        const isAdmin = String(req.user?.role || '').toLowerCase() === 'admin';

        const existing = await pool.query(
          `SELECT id, professional_id
           FROM care_requests
           WHERE id = $1
           LIMIT 1`,
          [requestId]
        );

        if (existing.rows.length === 0) {
          res.status(404).json({ error: 'Visit not found' });
          return;
        }

        const visit = existing.rows[0];

        if (!isAdmin && String(visit.professional_id || '') !== String(userId || '')) {
          res.status(403).json({ error: 'You are not assigned to this visit' });
          return;
        }

        const allowedOutcomes = [
          'completed_successfully',
          'partial',
          'no_access',
          'escalated',
          'follow_up_required',
        ];

        if (visitOutcome && !allowedOutcomes.includes(String(visitOutcome))) {
          res.status(400).json({ error: 'Invalid visitOutcome' });
          return;
        }

        const updated = await pool.query(
          `UPDATE care_requests
           SET visit_notes = COALESCE($2, visit_notes),
               visit_outcome = COALESCE($3, visit_outcome),
               follow_up_required = COALESCE($4, follow_up_required),
               escalation_required = COALESCE($5, escalation_required),
               documented_at = now(),
               updated_at = now()
           WHERE id = $1
           RETURNING *`,
          [
            requestId,
            visitNotes ?? null,
            visitOutcome ?? null,
            typeof followUpRequired === 'boolean' ? followUpRequired : null,
            typeof escalationRequired === 'boolean' ? escalationRequired : null,
          ]
        );

        await logAudit(
          pool,
          userId || null,
          'CLINICIAN_VISIT_DOCUMENTED',
          'care_request',
          requestId,
          {
            visitOutcome: visitOutcome || null,
            followUpRequired: !!followUpRequired,
            escalationRequired: !!escalationRequired,
          }
        );

        res.json({
          success: true,
          data: updated.rows[0],
        });
      } catch (err) {
        console.error('Visit note save error:', err);
        res.status(500).json({ error: 'Failed to save visit notes' });
      }
    }
  );

  return router;
}
