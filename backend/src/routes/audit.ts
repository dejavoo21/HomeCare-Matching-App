/**
 * PHASE 5: Audit Dashboard
 * - Admin-only access to audit trails
 * - Advanced filtering, search, severity levels
 * - Dashboard stats and summary
 */

import { Router, Response } from 'express';
import { Pool } from 'pg';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { UserRole } from '../types/index';

export function createAuditRouter(pool: Pool) {
  const router = Router();

  /**
   * GET /audit/admin
   * Query params:
   *  - q: search query (action, entity_type, entity_id, email, metadata)
   *  - action: filter by action
   *  - severity: filter by severity (info, warning, critical)
   *  - limit: max results (default 100, max 500)
   */
  router.get(
    '/admin',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response): Promise<void> => {
      const q = String(req.query.q || '').trim().toLowerCase();
      const action = String(req.query.action || '').trim().toLowerCase();
      const severity = String(req.query.severity || '').trim().toLowerCase();
      const limit = Math.min(parseInt(String(req.query.limit || '100'), 10) || 100, 500);

      try {
        const clauses: string[] = [];
        const params: any[] = [];
        let i = 1;

        if (q) {
          clauses.push(`(
            LOWER(COALESCE(a.action, '')) LIKE $${i}
            OR LOWER(COALESCE(a.entity_type, '')) LIKE $${i}
            OR LOWER(COALESCE(a.entity_id, '')) LIKE $${i}
            OR LOWER(COALESCE(u.email, '')) LIKE $${i}
            OR LOWER(COALESCE(a.metadata::text, '')) LIKE $${i}
          )`);
          params.push(`%${q}%`);
          i++;
        }

        if (action) {
          clauses.push(`LOWER(a.action) = $${i}`);
          params.push(action);
          i++;
        }

        if (severity) {
          clauses.push(`LOWER(a.severity) = $${i}`);
          params.push(severity);
          i++;
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

        params.push(limit);

        const result = await pool.query(
          `SELECT
             a.id,
             a.actor_user_id,
             a.action,
             a.entity_type,
             a.entity_id,
             a.metadata,
             a.severity,
             a.created_at,
             u.email AS actor_email
           FROM audit_events a
           LEFT JOIN users u
             ON u.id = a.actor_user_id
           ${where}
           ORDER BY a.created_at DESC
           LIMIT $${i}`,
          params
        );

        res.json({
          success: true,
          data: result.rows,
        });
      } catch (err) {
        console.error('Audit list error:', err);
        res.status(500).json({ error: 'Failed to fetch audit events' });
      }
    }
  );

  /**
   * GET /audit/admin/summary
   * Admin only: get audit dashboard summary stats
   */
  router.get(
    '/admin/summary',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (_req: AuthRequest, res: Response): Promise<void> => {
      try {
        const [totals, actions, severities, recentLogins] = await Promise.all([
          pool.query(
            `SELECT COUNT(*)::int AS total
             FROM audit_events`
          ),
          pool.query(
            `SELECT action, COUNT(*)::int AS count
             FROM audit_events
             GROUP BY action
             ORDER BY count DESC
             LIMIT 8`
          ),
          pool.query(
            `SELECT severity, COUNT(*)::int AS count
             FROM audit_events
             GROUP BY severity
             ORDER BY count DESC`
          ),
          pool.query(
            `SELECT COUNT(*)::int AS count
             FROM audit_events
             WHERE action = 'AUTH_LOGIN'
               AND created_at >= now() - interval '24 hours'`
          ),
        ]);

        res.json({
          success: true,
          data: {
            totalEvents: totals.rows[0]?.total || 0,
            topActions: actions.rows,
            severityBreakdown: severities.rows,
            loginsLast24h: recentLogins.rows[0]?.count || 0,
          },
        });
      } catch (err) {
        console.error('Audit summary error:', err);
        res.status(500).json({ error: 'Failed to fetch audit summary' });
      }
    }
  );

  /**
   * Legacy endpoint: GET /audit/logs
   * Admin only: view recent audit logs (backward compatibility)
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
   * Legacy endpoint: GET /audit/summary
   * Admin only: get audit stats (backward compatibility)
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
