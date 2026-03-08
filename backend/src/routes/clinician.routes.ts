import { Router, Response } from 'express';
import type { Pool } from 'pg';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { UserRole } from '../types/index';

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

  return router;
}
