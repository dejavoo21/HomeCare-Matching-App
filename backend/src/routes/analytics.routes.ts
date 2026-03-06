import { Router, Response } from 'express';
import { Pool } from 'pg';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { UserRole } from '../types/index';

export function createAnalyticsRouter(pool: Pool) {
  const router = Router();

  /**
   * GET /analytics/admin/summary
   * Returns aggregated metrics: queue status, performance, professional workload
   */
  router.get(
    '/admin/summary',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (_req: AuthRequest, res: Response): Promise<void> => {
      try {
        const [
          requestCounts,
          activeVisits,
          completedVisits,
          acceptedOffers,
          totalOffers,
          avgDispatchTime,
          professionalLoad,
        ] = await Promise.all([
          pool.query(`
            SELECT status, COUNT(*)::int AS count
            FROM care_requests
            GROUP BY status
          `),

          pool.query(`
            SELECT COUNT(*)::int AS count
            FROM care_requests
            WHERE status IN ('accepted', 'en_route')
          `),

          pool.query(`
            SELECT COUNT(*)::int AS count
            FROM care_requests
            WHERE status = 'completed'
          `),

          pool.query(`
            SELECT COUNT(*)::int AS count
            FROM visit_assignments
            WHERE accepted_at IS NOT NULL
          `),

          pool.query(`
            SELECT COUNT(*)::int AS count
            FROM visit_assignments
          `),

          pool.query(`
            SELECT
              COALESCE(AVG(EXTRACT(EPOCH FROM (va.accepted_at - cr.created_at))), 0)::int AS avg_seconds
            FROM visit_assignments va
            JOIN care_requests cr ON cr.id = va.request_id
            WHERE va.accepted_at IS NOT NULL
          `),

          pool.query(`
            SELECT
              u.id,
              u.name,
              u.role,
              COUNT(cr.id)::int AS active_count
            FROM users u
            LEFT JOIN care_requests cr
              ON cr.professional_id = u.id
             AND cr.status IN ('accepted', 'en_route', 'offered')
            WHERE u.role IN ('nurse', 'doctor')
            GROUP BY u.id, u.name, u.role
            ORDER BY active_count DESC, u.name ASC
            LIMIT 10
          `),
        ]);

        const byStatus: Record<string, number> = {};
        requestCounts.rows.forEach((r: any) => {
          byStatus[String(r.status).toLowerCase()] = r.count;
        });

        const totalOffersNum = Number(totalOffers.rows[0]?.count || 0);
        const acceptedOffersNum = Number(acceptedOffers.rows[0]?.count || 0);

        const acceptanceRate =
          totalOffersNum > 0
            ? Number(((acceptedOffersNum / totalOffersNum) * 100).toFixed(1))
            : 0;

        res.json({
          success: true,
          data: {
            totals: {
              queued: byStatus.queued || 0,
              offered: byStatus.offered || 0,
              accepted: byStatus.accepted || 0,
              enRoute: byStatus.en_route || 0,
              completed: Number(completedVisits.rows[0]?.count || 0),
              cancelled: byStatus.cancelled || 0,
              activeVisits: Number(activeVisits.rows[0]?.count || 0),
            },
            performance: {
              acceptanceRate,
              avgDispatchSeconds: Number(avgDispatchTime.rows[0]?.avg_seconds || 0),
              totalOffers: totalOffersNum,
              acceptedOffers: acceptedOffersNum,
            },
            professionalLoad: professionalLoad.rows,
          },
        });
      } catch (err) {
        console.error('Analytics summary error:', err);
        res.status(500).json({ error: 'Failed to load analytics summary' });
      }
    }
  );

  /**
   * GET /analytics/admin/timeseries?days=7
   * Returns request trend over the specified number of days
   */
  router.get(
    '/admin/timeseries',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response): Promise<void> => {
      const days = Math.min(parseInt(String(req.query.days || '7'), 10) || 7, 90);

      try {
        const result = await pool.query(
          `
          SELECT
            DATE(created_at) AS day,
            COUNT(*)::int AS created_count,
            COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_count,
            COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_count
          FROM care_requests
          WHERE created_at >= now() - ($1 || ' days')::interval
          GROUP BY DATE(created_at)
          ORDER BY day ASC
          `,
          [String(days)]
        );

        res.json({
          success: true,
          data: result.rows,
        });
      } catch (err) {
        console.error('Analytics timeseries error:', err);
        res.status(500).json({ error: 'Failed to load analytics timeseries' });
      }
    }
  );

  return router;
}
