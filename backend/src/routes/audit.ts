/**
 * PHASE 4: Audit Log Viewing
 * - Admin-only access to audit trails
 * - Useful for compliance, executive dashboards
 */

import { Router, Response } from 'express';
import { Pool } from 'pg';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { UserRole } from '../types/index';

export function createAuditRouter(pool: Pool) {
  const router = Router();

  /**
   * GET /audit/logs
   * Admin only: view recent audit logs
   * Query: ?limit=200&action=AUTH_LOGIN&userId=xxx
   */
  router.get(
    '/logs',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const limit = Math.min(parseInt(String(req.query.limit || '200'), 10), 500);
        const action = req.query.action as string | undefined;
        const userId = req.query.userId as string | undefined;

        let query = `
          SELECT al.id, al.actor_user_id, al.action, al.entity_type, al.entity_id, al.metadata, al.created_at,
                 u.name as actor_name, u.email as actor_email
          FROM audit_events al
          LEFT JOIN users u ON u.id = al.actor_user_id
          WHERE 1=1
        `;

        const params: any[] = [];

        if (action) {
          params.push(action);
          query += ` AND al.action = $${params.length}`;
        }

        if (userId) {
          params.push(userId);
          query += ` AND al.actor_user_id = $${params.length}`;
        }

        query += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const rows = await pool.query(query, params);

        res.json({ success: true, data: rows.rows });
      } catch (err) {
        console.error('Fetch audit logs error:', err);
        res.status(500).json({ error: 'Failed to fetch logs' });
      }
    }
  );

  /**
   * GET /audit/summary
   * Admin only: get audit stats (e.g., for executive dashboard)
   * Returns: login count, errors, access changes, etc.
   */
  router.get(
    '/summary',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (_req: AuthRequest, res: Response): Promise<void> => {
      try {
        const stats = await pool.query(`
          SELECT
            COUNT(CASE WHEN action = 'AUTH_LOGIN' THEN 1 END) as login_count,
            COUNT(CASE WHEN action LIKE 'AUTH_LOGIN_FAILED%' THEN 1 END) as failed_login_count,
            COUNT(CASE WHEN action LIKE 'ACCESS_%' THEN 1 END) as access_changes,
            COUNT(*) as total_events,
            (current_date)::text as date
          FROM audit_events
          WHERE created_at >= now() - interval '24 hours'
        `);

        res.json({ success: true, data: stats.rows[0] || {} });
      } catch (err) {
        console.error('Fetch audit summary error:', err);
        res.status(500).json({ error: 'Failed to fetch summary' });
      }
    }
  );

  return router;
}
