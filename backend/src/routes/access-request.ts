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
          `SELECT
             ar.id,
             ar.requester_name,
             ar.requester_email,
             ar.requested_role,
             ar.reason,
             ar.status,
             ar.reviewed_by,
             ar.reviewed_at,
             ar.review_notes,
             ar.additional_info_requested,
             ar.additional_info_note,
             ar.identity_verified,
             ar.license_verified,
             ar.compliance_verified,
             ar.background_check_verified,
             ar.verification_completed,
             ar.created_at,
             reviewer.email AS reviewer_email
           FROM access_requests
           ar
           LEFT JOIN users reviewer ON reviewer.id = ar.reviewed_by
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
    '/admin/:id/verify',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response): Promise<void> => {
      const requestId = req.params.id;
      const {
        additionalInfoRequested,
        additionalInfoNote,
        identityVerified,
        licenseVerified,
        complianceVerified,
        backgroundCheckVerified,
      } = req.body || {};

      try {
        const existing = await pool.query(
          `SELECT id, status
           FROM access_requests
           WHERE id = $1
           LIMIT 1`,
          [requestId]
        );

        if (existing.rows.length === 0) {
          res.status(404).json({ error: 'Request not found' });
          return;
        }

        const verificationCompleted =
          !!identityVerified &&
          !!licenseVerified &&
          !!complianceVerified &&
          !!backgroundCheckVerified;

        const updated = await pool.query(
          `UPDATE access_requests
           SET additional_info_requested = COALESCE($2, additional_info_requested),
               additional_info_note = COALESCE($3, additional_info_note),
               identity_verified = COALESCE($4, identity_verified),
               license_verified = COALESCE($5, license_verified),
               compliance_verified = COALESCE($6, compliance_verified),
               background_check_verified = COALESCE($7, background_check_verified),
               verification_completed = $8,
               reviewed_by = $9,
               reviewed_at = now(),
               updated_at = now()
           WHERE id = $1
           RETURNING *`,
          [
            requestId,
            typeof additionalInfoRequested === 'boolean' ? additionalInfoRequested : null,
            additionalInfoNote ?? null,
            typeof identityVerified === 'boolean' ? identityVerified : null,
            typeof licenseVerified === 'boolean' ? licenseVerified : null,
            typeof complianceVerified === 'boolean' ? complianceVerified : null,
            typeof backgroundCheckVerified === 'boolean' ? backgroundCheckVerified : null,
            verificationCompleted,
            req.user?.userId || null,
          ]
        );

        await logAudit(
          pool,
          req.user?.userId || null,
          'ACCESS_REQUEST_VERIFICATION_UPDATED',
          'access_requests',
          requestId,
          {
            additionalInfoRequested: !!additionalInfoRequested,
            verificationCompleted,
          }
        );

        res.json({ success: true, data: updated.rows[0] });
      } catch (err) {
        console.error('Access request verification error:', err);
        res.status(500).json({ error: 'Failed to update verification workflow' });
      }
    }
  );

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
        const existing = await pool.query(
          `SELECT id, requester_email, requested_role, additional_info_requested, verification_completed
           FROM access_requests
           WHERE id = $1`,
          [requestId]
        );

        if (existing.rows.length === 0) {
          res.status(404).json({ error: 'Request not found' });
          return;
        }

        const current = existing.rows[0];
        const email = current.requester_email;
        const isClientRole = String(current.requested_role || '').toLowerCase() === 'client';

        if (
          String(decision).toLowerCase() === 'approved' &&
          (!current.verification_completed || current.additional_info_requested) &&
          !isClientRole
        ) {
          res.status(400).json({
            error: 'Complete verification and clear any outstanding info request before approving',
          });
          return;
        }

        // Update request
        await pool.query(
          `UPDATE access_requests
           SET status = $2,
               review_notes = COALESCE($4, review_notes),
               reviewed_by = $3,
               reviewed_at = now(),
               updated_at = now()
           WHERE id = $1`,
          [requestId, String(decision).toLowerCase(), req.user?.userId || null, notes ?? null]
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
