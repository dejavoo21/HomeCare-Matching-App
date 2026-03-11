import { Router, Response } from 'express';
import type { Pool } from 'pg';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { UserRole } from '../types/index';

async function columnExists(pool: Pool, tableName: string, columnName: string) {
  const result = await pool.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_name = $1
       AND column_name = $2
     LIMIT 1`,
    [tableName, columnName]
  );

  return result.rows.length > 0;
}

export function createSchemaHealthRouter(pool: Pool) {
  const router = Router();

  router.get(
    '/admin/schema-health',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (_req: AuthRequest, res: Response) => {
      try {
        const hasProfessionalId = await columnExists(pool, 'care_requests', 'professional_id');
        const hasFollowUpRequired = await columnExists(pool, 'care_requests', 'follow_up_required');
        const hasAdminFollowUpScheduled = await columnExists(
          pool,
          'care_requests',
          'admin_follow_up_scheduled'
        );
        const hasPresenceStatus = await columnExists(pool, 'user_presence', 'presence_status');

        const [
          legacyStatuses,
          missingProfessionalId,
          missingStatus,
          followUpMismatch,
          invalidPresenceState,
        ] = await Promise.all([
          pool.query(
            `SELECT COUNT(*)::int AS count
             FROM care_requests
             WHERE LOWER(COALESCE(status, '')) IN ('enroute', 'invisit', 'onshift')`
          ),
          hasProfessionalId
            ? pool.query(
                `SELECT COUNT(*)::int AS count
                 FROM care_requests
                 WHERE professional_id IS NULL
                   AND LOWER(COALESCE(status, '')) IN ('offered', 'accepted', 'en_route', 'enroute', 'in_visit', 'completed')`
              )
            : Promise.resolve({ rows: [{ count: 0 }] }),
          pool.query(
            `SELECT COUNT(*)::int AS count
             FROM care_requests
             WHERE status IS NULL OR TRIM(COALESCE(status, '')) = ''`
          ),
          hasFollowUpRequired && hasAdminFollowUpScheduled
            ? pool.query(
                `SELECT COUNT(*)::int AS count
                 FROM care_requests
                 WHERE COALESCE(admin_follow_up_scheduled, false) = true
                   AND COALESCE(follow_up_required, false) = false`
              )
            : Promise.resolve({ rows: [{ count: 0 }] }),
          hasPresenceStatus
            ? pool.query(
                `SELECT COUNT(*)::int AS count
                 FROM user_presence
                 WHERE LOWER(COALESCE(presence_status, '')) NOT IN ('available', 'on_shift', 'in_visit', 'offline')`
              )
            : Promise.resolve({ rows: [{ count: 0 }] }),
        ]);

        res.json({
          success: true,
          data: {
            requestStatusLegacyCount: Number(legacyStatuses.rows[0]?.count || 0),
            missingProfessionalIdCount: Number(missingProfessionalId.rows[0]?.count || 0),
            nullStatusCount: Number(missingStatus.rows[0]?.count || 0),
            inconsistentFollowUpFieldsCount: Number(followUpMismatch.rows[0]?.count || 0),
            invalidPresenceStateCount: Number(invalidPresenceState.rows[0]?.count || 0),
          },
        });
      } catch (err) {
        console.error('Schema health error:', err);
        res.status(500).json({ error: 'Failed to compute schema health' });
      }
    }
  );

  return router;
}
