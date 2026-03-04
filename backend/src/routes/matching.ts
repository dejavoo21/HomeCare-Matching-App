// ============================================================================
// MATCHING ROUTES
// ============================================================================
// Matching engine endpoints for preview and scoring

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { authMiddleware, requireRole } from '../middleware/auth';
import { findMatches } from '../domain/matching/matcher';
import { logAudit } from '../services/audit.service';

export function matchingRouter(pool: Pool) {
  const router = Router();

  // Preview matching results for a care request (admin only)
  router.post('/preview', authMiddleware, requireRole('admin'), async (req: any, res: Response) => {
    try {
      const { requestId } = req.body;

      if (!requestId) {
        return res.status(400).json({ error: 'Missing requestId' });
      }

      // Verify request exists and is in correct state
      const request = await pool.query(
        'SELECT * FROM care_requests WHERE id = $1',
        [requestId]
      );

      if (request.rows.length === 0) {
        return res.status(404).json({ error: 'Care request not found' });
      }

      const careRequest = request.rows[0];

      // Run matching algorithm
      const result = await findMatches(pool, requestId);

      await logAudit(pool, {
        actorId: req.user.userId,
        actionType: 'MATCHING_PREVIEW_RUN',
        entityType: 'care_request',
        entityId: requestId,
        metadata: {
          candidateCount: result.candidates.length,
          topCandidateId: result.topCandidate?.professionalId,
        },
      });

      res.json({
        requestId,
        requestDetails: {
          clientId: careRequest.client_user_id,
          urgency: careRequest.urgency_level,
          requiredRole: careRequest.required_role,
          location: careRequest.location,
          startTime: careRequest.visit_start_time,
          endTime: careRequest.visit_end_time,
        },
        candidates: result.candidates.map((c) => ({
          professionalId: c.professionalId,
          name: c.name,
          score: c.score,
          scoreBreakdown: c.scoreBreakdown,
          reasons: c.reasons,
        })),
        topCandidate: result.topCandidate
          ? {
              professionalId: result.topCandidate.professionalId,
              name: result.topCandidate.name,
              score: result.topCandidate.score,
            }
          : null,
      });
    } catch (err) {
      console.error('Error previewing matches:', err);
      res.status(500).json({ error: 'Failed to preview matches' });
    }
  });

  // Get matching history for a care request
  router.get('/:requestId/history', authMiddleware, async (req: any, res: Response) => {
    try {
      const { requestId } = req.params;

      const assignments = await pool.query(
        `SELECT * FROM visit_assignments 
         WHERE care_request_id = $1 
         ORDER BY created_at DESC`,
        [requestId]
      );

      const offers = assignments.rows.map((a: any) => ({
        id: a.id,
        professionalId: a.professional_user_id,
        status: a.assignment_status,
        offeredAt: a.created_at,
        expiresAt: a.offer_expires_at,
      }));

      res.json({ offers });
    } catch (err) {
      console.error('Error fetching matching history:', err);
      res.status(500).json({ error: 'Failed to fetch matching history' });
    }
  });

  return router;
}
