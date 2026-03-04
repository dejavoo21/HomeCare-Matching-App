// ============================================================================
// VISITS ROUTES
// ============================================================================

import { Router, Response } from 'express';
import type { Pool } from 'pg';
import { visitService } from '../services/visit.service';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';
import { UserRole } from '../types/index';
import { emitRealtimeEventToDb } from '../realtime/emitToDb';

const router = Router();

// Pool will be set by setupPostgresVisitRoutes
let pool: Pool | null = null;

export function setupPostgresVisitRoutes(dbPool: Pool): void {
  pool = dbPool;
}

/**
 * GET /visits/professional
 */
router.get(
  '/professional',
  authMiddleware,
  requireRole(UserRole.NURSE, UserRole.DOCTOR),
  (req: AuthRequest, res: Response): void => {
    const visits = visitService.getProfessionalVisits(req.user!.userId);

    res.json({
      success: true,
      data: visits,
    });
  }
);

/**
 * Get visits for current client
 * GET /visits/client
 */
router.get(
  '/client',
  authMiddleware,
  requireRole(UserRole.CLIENT),
  (req: AuthRequest, res: Response): void => {
    const visits = visitService.getClientVisits(req.user!.userId);

    res.json({
      success: true,
      data: visits,
    });
  }
);

/**
 * Get visit details
 * GET /visits/:id
 */
router.get('/:id', authMiddleware, (req: AuthRequest, res: Response): void => {
  const visit = visitService.getVisitDetails(req.params.id);

  if (!visit) {
    res.status(404).json({ error: 'Visit not found' });
    return;
  }

  res.json({
    success: true,
    data: visit,
  });
});

/**
 * Accept a visit
 * POST /visits/:id/accept
 */
router.post(
  '/:id/accept',
  authMiddleware,
  requireRole(UserRole.NURSE, UserRole.DOCTOR),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const updated = visitService.acceptVisit(req.params.id);

    if (!updated) {
      res.status(404).json({ error: 'Visit not found' });
      return;
    }

    // Emit events to relay
    await emitRealtimeEventToDb(pool!, 'OFFER_ACCEPTED', {
      visitId: req.params.id,
      requestId: updated.requestId,
      professionalId: updated.professionalId,
      clientId: updated.clientId,
    });

    await emitRealtimeEventToDb(pool!, 'VISIT_STATUS_CHANGED', {
      visitId: req.params.id,
      requestId: updated.requestId,
      professionalId: updated.professionalId,
      clientId: updated.clientId,
      oldStatus: 'offered',
      newStatus: 'accepted',
    });

    res.json({
      success: true,
      data: updated,
    });
  }
);

/**
 * Decline a visit
 * POST /visits/:id/decline
 */
router.post(
  '/:id/decline',
  authMiddleware,
  requireRole(UserRole.NURSE, UserRole.DOCTOR),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const reason = req.body?.reason || 'declined';
    const visit = visitService.getVisitDetails(req.params.id);

    if (!visit) {
      res.status(404).json({ error: 'Visit not found' });
      return;
    }

    // Update DB: mark assignment declined + requeue request
    await pool!.query(
      `UPDATE visit_assignments
       SET declined_at = NOW(), decline_reason = $1
       WHERE request_id = $2
         AND professional_id = $3
         AND accepted_at IS NULL
         AND declined_at IS NULL`,
      [reason, visit.requestId, visit.professionalId]
    );

    await pool!.query(
      `UPDATE care_requests
       SET status = 'queued', updated_at = NOW()
       WHERE id = $1`,
      [visit.requestId]
    );

    // Emit events to relay
    await emitRealtimeEventToDb(pool!, 'OFFER_DECLINED', {
      visitId: req.params.id,
      requestId: visit.requestId,
      professionalId: visit.professionalId,
      clientId: visit.clientId,
      declineReason: reason,
    });

    await emitRealtimeEventToDb(pool!, 'REQUEST_STATUS_CHANGED', {
      requestId: visit.requestId,
      professionalId: visit.professionalId,
      clientId: visit.clientId,
      oldStatus: 'offered',
      newStatus: 'queued',
    });

    res.json({ success: true, message: 'Visit declined' });
  }
);

/**
 * Mark visit as en route
 * POST /visits/:id/en-route
 */
router.post(
  '/:id/en-route',
  authMiddleware,
  requireRole(UserRole.NURSE, UserRole.DOCTOR),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const updated = visitService.markEnRoute(req.params.id);

    if (!updated) {
      res.status(404).json({ error: 'Visit not found' });
      return;
    }

    // Emit event to relay
    await emitRealtimeEventToDb(pool!, 'VISIT_STATUS_CHANGED', {
      visitId: req.params.id,
      requestId: updated.requestId,
      professionalId: updated.professionalId,
      clientId: updated.clientId,
      oldStatus: 'accepted',
      newStatus: 'en_route',
    });

    res.json({
      success: true,
      data: updated,
    });
  }
);

/**
 * Complete a visit
 * POST /visits/:id/complete
 */
router.post(
  '/:id/complete',
  authMiddleware,
  requireRole(UserRole.NURSE, UserRole.DOCTOR),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { notes } = req.body;
    const updated = visitService.completeVisit(req.params.id, notes);

    if (!updated) {
      res.status(404).json({ error: 'Visit not found' });
      return;
    }

    // Emit event to relay
    await emitRealtimeEventToDb(pool!, 'VISIT_STATUS_CHANGED', {
      visitId: req.params.id,
      requestId: updated.requestId,
      professionalId: updated.professionalId,
      clientId: updated.clientId,
      oldStatus: 'en_route',
      newStatus: 'completed',
      notes,
    });

    res.json({
      success: true,
      data: updated,
    });
  }
);

export default router;
