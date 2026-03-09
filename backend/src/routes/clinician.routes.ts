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

  router.get(
    '/admin-review',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response) => {
      try {
        const outcome = String(req.query.outcome || '').trim();
        const documented = String(req.query.documented || '').trim().toLowerCase();
        const followUpRequired = String(req.query.followUpRequired || '').trim().toLowerCase();
        const escalationRequired = String(req.query.escalationRequired || '').trim().toLowerCase();
        const limit = Math.min(parseInt(String(req.query.limit || '100'), 10) || 100, 300);

        const params: any[] = [];
        const where: string[] = [];

        if (outcome) {
          params.push(outcome);
          where.push(`cr.visit_outcome = $${params.length}`);
        }

        if (documented === 'true') {
          where.push('cr.documented_at IS NOT NULL');
        } else if (documented === 'false') {
          where.push('cr.documented_at IS NULL');
        }

        if (followUpRequired === 'true') {
          where.push('cr.follow_up_required = true');
        } else if (followUpRequired === 'false') {
          where.push('COALESCE(cr.follow_up_required, false) = false');
        }

        if (escalationRequired === 'true') {
          where.push('cr.escalation_required = true');
        } else if (escalationRequired === 'false') {
          where.push('COALESCE(cr.escalation_required, false) = false');
        }

        params.push(limit);

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
             cr.admin_follow_up_scheduled,
             cr.admin_escalation_acknowledged,
             cr.admin_issue_resolved,
             cr.admin_review_notes,
             cr.admin_reviewed_at,
             cr.admin_reviewed_by,
             cr.created_at,
             cr.updated_at,
             c.name AS client_name,
             c.email AS client_email,
             p.name AS professional_name,
             p.role AS professional_role
           FROM care_requests cr
           LEFT JOIN users c ON c.id = cr.client_id
           LEFT JOIN users p ON p.id = cr.professional_id
           ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
           ORDER BY COALESCE(cr.documented_at, cr.updated_at, cr.created_at) DESC
           LIMIT $${params.length}`,
          params
        );

        res.json({
          success: true,
          data: result.rows,
        });
      } catch (err) {
        console.error('Admin clinician review error:', err);
        res.status(500).json({ error: 'Failed to load clinician review data' });
      }
    }
  );

  router.post(
    '/admin-action',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response) => {
      const {
        requestId,
        adminFollowUpScheduled,
        adminEscalationAcknowledged,
        adminIssueResolved,
        adminReviewNotes,
      } = req.body || {};

      if (!requestId) {
        res.status(400).json({ error: 'requestId is required' });
        return;
      }

      try {
        const existing = await pool.query(
          `SELECT id
           FROM care_requests
           WHERE id = $1
           LIMIT 1`,
          [requestId]
        );

        if (existing.rows.length === 0) {
          res.status(404).json({ error: 'Visit not found' });
          return;
        }

        const updated = await pool.query(
          `UPDATE care_requests
           SET admin_follow_up_scheduled = COALESCE($2, admin_follow_up_scheduled),
               admin_escalation_acknowledged = COALESCE($3, admin_escalation_acknowledged),
               admin_issue_resolved = COALESCE($4, admin_issue_resolved),
               admin_review_notes = COALESCE($5, admin_review_notes),
               admin_reviewed_at = now(),
               admin_reviewed_by = $6,
               updated_at = now()
           WHERE id = $1
           RETURNING *`,
          [
            requestId,
            typeof adminFollowUpScheduled === 'boolean' ? adminFollowUpScheduled : null,
            typeof adminEscalationAcknowledged === 'boolean'
              ? adminEscalationAcknowledged
              : null,
            typeof adminIssueResolved === 'boolean' ? adminIssueResolved : null,
            adminReviewNotes ?? null,
            req.user?.userId || null,
          ]
        );

        await logAudit(
          pool,
          req.user?.userId || null,
          'ADMIN_CLINICIAN_REVIEW_ACTION',
          'care_request',
          requestId,
          {
            adminFollowUpScheduled:
              typeof adminFollowUpScheduled === 'boolean'
                ? adminFollowUpScheduled
                : undefined,
            adminEscalationAcknowledged:
              typeof adminEscalationAcknowledged === 'boolean'
                ? adminEscalationAcknowledged
                : undefined,
            adminIssueResolved:
              typeof adminIssueResolved === 'boolean' ? adminIssueResolved : undefined,
          }
        );

        res.json({
          success: true,
          data: updated.rows[0],
        });
      } catch (err) {
        console.error('Admin clinician action error:', err);
        res.status(500).json({ error: 'Failed to save admin action' });
      }
    }
  );

  router.post(
    '/create-follow-up',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response) => {
      const {
        sourceRequestId,
        preferredStart,
        professionalId,
        urgency,
        description,
      } = req.body || {};

      if (!sourceRequestId || !preferredStart) {
        res.status(400).json({ error: 'sourceRequestId and preferredStart are required' });
        return;
      }

      try {
        const sourceResult = await pool.query(
          `SELECT
             id,
             client_id,
             professional_id,
             service_type,
             address_text,
             urgency,
             description
           FROM care_requests
           WHERE id = $1
           LIMIT 1`,
          [sourceRequestId]
        );

        if (sourceResult.rows.length === 0) {
          res.status(404).json({ error: 'Source visit not found' });
          return;
        }

        const source = sourceResult.rows[0];
        const assignedProfessionalId = professionalId || source.professional_id || null;
        const nextUrgency = urgency || source.urgency || 'medium';

        const inserted = await pool.query(
          `INSERT INTO care_requests
           (client_id, professional_id, service_type, address_text, preferred_start, urgency, status, description, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'queued', $7, now(), now())
           RETURNING *`,
          [
            source.client_id,
            assignedProfessionalId,
            source.service_type,
            source.address_text,
            new Date(preferredStart).toISOString(),
            nextUrgency,
            description || `Follow-up: ${source.description || source.service_type}`,
          ]
        );

        await pool.query(
          `UPDATE care_requests
           SET admin_follow_up_scheduled = true,
               admin_reviewed_at = now(),
               admin_reviewed_by = $2,
               updated_at = now()
           WHERE id = $1`,
          [sourceRequestId, req.user?.userId || null]
        );

        await logAudit(
          pool,
          req.user?.userId || null,
          'ADMIN_FOLLOW_UP_CREATED',
          'care_request',
          inserted.rows[0].id,
          {
            sourceRequestId,
            preferredStart,
            professionalId: assignedProfessionalId,
          }
        );

        res.json({
          success: true,
          data: inserted.rows[0],
        });
      } catch (err) {
        console.error('Create follow-up error:', err);
        res.status(500).json({ error: 'Failed to create follow-up visit' });
      }
    }
  );

  return router;
}
