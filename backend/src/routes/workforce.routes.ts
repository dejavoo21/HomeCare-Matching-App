import { Router, Response } from 'express';
import type { Pool } from 'pg';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';
import { publishRealtimeEvent } from '../realtime/publisher';
import { UserRole } from '../types/index';

type PresenceStatus = 'offline' | 'online' | 'on_shift' | 'in_visit' | 'busy';

const PRESENCE_STATUSES = new Set<PresenceStatus>([
  'offline',
  'online',
  'on_shift',
  'in_visit',
  'busy',
]);

function normalizeRole(value: unknown): string {
  return String(value || '').toLowerCase();
}

function canViewPhone(role: string) {
  return role === 'admin' || role === 'dispatcher';
}

function canViewEmail(role: string) {
  return role === 'admin' || role === 'dispatcher';
}

function canViewWorkload(role: string) {
  return role === 'admin' || role === 'dispatcher';
}

async function updatePresence(
  pool: Pool,
  payload: {
    userId: string;
    presenceStatus: PresenceStatus;
    customStatus?: string | null;
    currentRequestId?: string | null;
    currentVisitId?: string | null;
    region?: string | null;
  }
) {
  await pool.query(
    `INSERT INTO user_presence (
       user_id,
       presence_status,
       custom_status,
       current_request_id,
       current_visit_id,
       region,
       last_seen_at,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, now(), now())
     ON CONFLICT (user_id)
     DO UPDATE SET
       presence_status = EXCLUDED.presence_status,
       custom_status = COALESCE(EXCLUDED.custom_status, user_presence.custom_status),
       current_request_id = EXCLUDED.current_request_id,
       current_visit_id = EXCLUDED.current_visit_id,
       region = COALESCE(EXCLUDED.region, user_presence.region),
       last_seen_at = now(),
       updated_at = now()`,
    [
      payload.userId,
      payload.presenceStatus,
      payload.customStatus || null,
      payload.currentRequestId || null,
      payload.currentVisitId || null,
      payload.region || null,
    ]
  );
}

export function createWorkforceRouter(pool: Pool) {
  const router = Router();

  router.get(
    '/directory',
    authMiddleware,
    requireRole(UserRole.ADMIN, UserRole.NURSE, UserRole.DOCTOR),
    async (req: AuthRequest, res: Response) => {
      try {
        const requesterRole = normalizeRole(req.user?.role);
        const result = await pool.query(
          `WITH workload AS (
             SELECT
               professional_id,
               COUNT(*) FILTER (
                 WHERE status IN ('accepted', 'en_route')
               ) AS active_visits,
               COUNT(*) FILTER (
                 WHERE status IN ('queued', 'offered')
               ) AS queued_assignments,
               MIN(preferred_start) FILTER (
                 WHERE preferred_start >= now()
               ) AS next_visit_at
             FROM care_requests
             WHERE professional_id IS NOT NULL
             GROUP BY professional_id
           )
           SELECT
             u.id,
             u.name,
             u.email,
             u.phone,
             u.role,
             u.location,
             u.is_active,
             COALESCE(up.presence_status, CASE WHEN up.last_seen_at >= now() - interval '5 minutes' THEN 'online' ELSE 'offline' END, 'offline') AS presence_status,
             up.custom_status,
             up.current_request_id,
             up.current_visit_id,
             up.region,
             up.last_seen_at,
             COALESCE(w.active_visits, 0) AS active_visits,
             COALESCE(w.queued_assignments, 0) AS queued_assignments,
             w.next_visit_at
           FROM users u
           LEFT JOIN user_presence up ON up.user_id = u.id
           LEFT JOIN workload w ON w.professional_id = u.id
           WHERE u.role IN ('nurse', 'doctor')
             AND COALESCE(u.is_active, true) = true
           ORDER BY u.name ASC`
        );

        const data = result.rows.map((row: any) => ({
          id: row.id,
          name: row.name,
          role: row.role,
          region: row.region || row.location || null,
          email: canViewEmail(requesterRole) ? row.email : null,
          phone: canViewPhone(requesterRole) ? row.phone : null,
          presenceStatus: row.presence_status || 'offline',
          customStatus: row.custom_status || null,
          lastSeenAt: row.last_seen_at,
          currentRequestId: row.current_request_id || null,
          currentVisitId: row.current_visit_id || null,
          currentWorkload: canViewWorkload(requesterRole)
            ? {
                activeVisits: Number(row.active_visits || 0),
                queuedAssignments: Number(row.queued_assignments || 0),
                nextVisitAt: row.next_visit_at,
              }
            : {
                activeVisits: 0,
                queuedAssignments: 0,
                nextVisitAt: null,
              },
        }));

        res.json({ success: true, data });
      } catch (err) {
        console.error('Workforce directory error:', err);
        res.status(500).json({ error: 'Failed to load workforce directory' });
      }
    }
  );

  router.post(
    '/presence',
    authMiddleware,
    requireRole(UserRole.ADMIN, UserRole.NURSE, UserRole.DOCTOR),
    async (req: AuthRequest, res: Response) => {
      const userId = req.user?.userId;
      const requestedStatus = String(req.body?.presenceStatus || '').toLowerCase() as PresenceStatus;
      const customStatus = req.body?.customStatus ? String(req.body.customStatus) : null;

      if (!userId || !PRESENCE_STATUSES.has(requestedStatus)) {
        res.status(400).json({ error: 'Valid presenceStatus is required' });
        return;
      }

      try {
        const userResult = await pool.query(
          `SELECT id, name, role, phone, email, location
           FROM users
           WHERE id = $1
           LIMIT 1`,
          [userId]
        );

        if (userResult.rows.length === 0) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        const user = userResult.rows[0];

        await updatePresence(pool, {
          userId,
          presenceStatus: requestedStatus,
          customStatus,
          region: user.location || null,
        });

        const presenceResult = await pool.query(
          `SELECT
             user_id,
             presence_status,
             custom_status,
             current_request_id,
             current_visit_id,
             region,
             last_seen_at
           FROM user_presence
           WHERE user_id = $1
           LIMIT 1`,
          [userId]
        );

        const presence = presenceResult.rows[0];

        publishRealtimeEvent({
          type: 'PRESENCE_UPDATED',
          professionalId: userId,
          data: {
            userId,
            name: user.name,
            role: user.role,
            region: presence?.region || user.location || null,
            presenceStatus: presence?.presence_status || requestedStatus,
            customStatus: presence?.custom_status || null,
            lastSeenAt: presence?.last_seen_at || new Date().toISOString(),
          },
        });

        res.json({
          success: true,
          data: {
            userId,
            presenceStatus: presence?.presence_status || requestedStatus,
            customStatus: presence?.custom_status || null,
            region: presence?.region || user.location || null,
            lastSeenAt: presence?.last_seen_at || new Date().toISOString(),
          },
        });
      } catch (err) {
        console.error('Workforce presence update error:', err);
        res.status(500).json({ error: 'Failed to update presence' });
      }
    }
  );

  return router;
}
