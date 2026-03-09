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

async function tableExists(pool: Pool, tableName: string) {
  const result = await pool.query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = $1
     ) AS exists`,
    [tableName]
  );

  return !!result.rows[0]?.exists;
}

async function columnExists(pool: Pool, tableName: string, columnName: string) {
  const result = await pool.query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = $1
         AND column_name = $2
     ) AS exists`,
    [tableName, columnName]
  );

  return !!result.rows[0]?.exists;
}

export function createWorkforceRouter(pool: Pool) {
  const router = Router();

  router.get(
    '/me/presence',
    authMiddleware,
    requireRole(UserRole.ADMIN, UserRole.NURSE, UserRole.DOCTOR),
    async (req: AuthRequest, res: Response) => {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      try {
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

        res.json({
          success: true,
          data: {
            userId,
            presenceStatus: presence?.presence_status || 'online',
            customStatus: presence?.custom_status || null,
            currentRequestId: presence?.current_request_id || null,
            currentVisitId: presence?.current_visit_id || null,
            region: presence?.region || null,
            lastSeenAt: presence?.last_seen_at || null,
          },
        });
      } catch (err) {
        console.error('Workforce self presence error:', err);
        res.status(500).json({ error: 'Failed to load presence state' });
      }
    }
  );

  router.get(
    '/directory',
    authMiddleware,
    requireRole(UserRole.ADMIN, UserRole.NURSE, UserRole.DOCTOR),
    async (req: AuthRequest, res: Response) => {
      try {
        const requesterRole = normalizeRole(req.user?.role);
        const [usersResult, hasVisitsTable, hasVisitAssignmentsTable, hasCareRequestProfessionalId] =
          await Promise.all([
            pool.query(
              `SELECT
                 u.id,
                 u.name,
                 u.email,
                 u.phone,
                 u.role,
                 u.is_active,
                 up.presence_status,
                 up.custom_status,
                 up.current_request_id,
                 up.current_visit_id,
                 up.region,
                 up.last_seen_at
               FROM users u
               LEFT JOIN user_presence up ON up.user_id = u.id
               WHERE u.role IN ('nurse', 'doctor')
                 AND COALESCE(u.is_active, true) = true
               ORDER BY u.name ASC`
            ),
            tableExists(pool, 'visits'),
            tableExists(pool, 'visit_assignments'),
            columnExists(pool, 'care_requests', 'professional_id'),
          ]);

        const workloadByUserId = new Map<
          string,
          { activeVisits: number; queuedAssignments: number; nextVisitAt: string | null }
        >();

        const ensureWorkload = (userId: string) => {
          if (!workloadByUserId.has(userId)) {
            workloadByUserId.set(userId, {
              activeVisits: 0,
              queuedAssignments: 0,
              nextVisitAt: null,
            });
          }
          return workloadByUserId.get(userId)!;
        };

        if (hasVisitsTable) {
          const visitsResult = await pool.query(
            `SELECT
               professional_id,
               COUNT(*) FILTER (
                 WHERE status IN ('assigned', 'accepted', 'enroute')
               ) AS active_visits,
               MIN(scheduled_start) FILTER (
                 WHERE scheduled_start >= now()
               ) AS next_visit_at
             FROM visits
             GROUP BY professional_id`
          );

          for (const row of visitsResult.rows) {
            const workload = ensureWorkload(String(row.professional_id));
            workload.activeVisits = Number(row.active_visits || 0);
            workload.nextVisitAt = row.next_visit_at || null;
          }
        } else if (hasCareRequestProfessionalId) {
          const requestsResult = await pool.query(
            `SELECT
               professional_id,
               COUNT(*) FILTER (
                 WHERE status IN ('assigned', 'accepted', 'en_route', 'enroute')
               ) AS active_visits,
               MIN(preferred_start) FILTER (
                 WHERE preferred_start >= now()
               ) AS next_visit_at
             FROM care_requests
             WHERE professional_id IS NOT NULL
             GROUP BY professional_id`
          );

          for (const row of requestsResult.rows) {
            const workload = ensureWorkload(String(row.professional_id));
            workload.activeVisits = Number(row.active_visits || 0);
            workload.nextVisitAt = row.next_visit_at || null;
          }
        }

        if (hasVisitAssignmentsTable) {
          const assignmentsResult = await pool.query(
            `SELECT
               professional_id,
               COUNT(*) FILTER (
                 WHERE accepted_at IS NULL
                   AND declined_at IS NULL
                   AND offer_expires_at >= now()
               ) AS queued_assignments
             FROM visit_assignments
             GROUP BY professional_id`
          );

          for (const row of assignmentsResult.rows) {
            const workload = ensureWorkload(String(row.professional_id));
            workload.queuedAssignments = Number(row.queued_assignments || 0);
          }
        }

        const data = usersResult.rows.map((row: any) => {
          const workload = workloadByUserId.get(String(row.id)) || {
            activeVisits: 0,
            queuedAssignments: 0,
            nextVisitAt: null,
          };

          return {
            id: row.id,
            name: row.name,
            role: row.role,
            region: row.region || null,
            email: canViewEmail(requesterRole) ? row.email : null,
            phone: canViewPhone(requesterRole) ? row.phone : null,
            presenceStatus:
              row.presence_status ||
              (row.last_seen_at && new Date(row.last_seen_at).getTime() >= Date.now() - 5 * 60 * 1000
                ? 'online'
                : 'offline'),
            customStatus: row.custom_status || null,
            lastSeenAt: row.last_seen_at,
            currentRequestId: row.current_request_id || null,
            currentVisitId: row.current_visit_id || null,
            currentWorkload: canViewWorkload(requesterRole)
              ? workload
              : {
                  activeVisits: 0,
                  queuedAssignments: 0,
                  nextVisitAt: null,
                },
          };
        });

        res.json({ success: true, data });
      } catch (err) {
        console.error('Workforce directory error:', err);
        res.status(500).json({ error: 'Failed to load workforce directory' });
      }
    }
  );

  router.get(
    '/summary',
    authMiddleware,
    requireRole(UserRole.ADMIN, UserRole.NURSE, UserRole.DOCTOR),
    async (req: AuthRequest, res: Response) => {
      const userId = req.user?.userId;
      const viewerRole = normalizeRole(req.user?.role);

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      try {
        const unreadResult = await pool.query(
          `SELECT COALESCE(SUM(unread.unread_count), 0)::int AS unread_total
           FROM (
             SELECT
               c.id,
               COUNT(cm.id)::int AS unread_count
             FROM conversations c
             JOIN conversation_participants cp
               ON cp.conversation_id = c.id
              AND cp.user_id = $1
             LEFT JOIN conversation_reads cr
               ON cr.conversation_id = c.id
              AND cr.user_id = $1
             LEFT JOIN chat_messages cm
               ON cm.conversation_id = c.id
              AND cm.sender_user_id <> $1
              AND (
                cr.last_read_at IS NULL
                OR cm.created_at > cr.last_read_at
              )
             GROUP BY c.id
           ) unread`,
          [userId]
        );

        const presenceResult = await pool.query(
          `SELECT
             COUNT(*) FILTER (WHERE presence_status = 'online')::int AS online_count,
             COUNT(*) FILTER (WHERE presence_status = 'on_shift')::int AS on_shift_count,
             COUNT(*) FILTER (WHERE presence_status = 'in_visit')::int AS in_visit_count,
             COUNT(*) FILTER (WHERE presence_status = 'busy')::int AS busy_count
           FROM user_presence up
           JOIN users u ON u.id = up.user_id
           WHERE u.role IN ('nurse', 'doctor')
             AND COALESCE(u.is_active, true) = true`
        );

        res.json({
          success: true,
          data: {
            unreadMessages: Number(unreadResult.rows[0]?.unread_total || 0),
            workforcePresence: {
              online: Number(presenceResult.rows[0]?.online_count || 0),
              onShift: Number(presenceResult.rows[0]?.on_shift_count || 0),
              inVisit: Number(presenceResult.rows[0]?.in_visit_count || 0),
              busy: Number(presenceResult.rows[0]?.busy_count || 0),
            },
            viewerRole,
          },
        });
      } catch (err) {
        console.error('Workforce summary error:', err);
        res.status(500).json({ error: 'Failed to load workforce summary' });
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
          `SELECT id, name, role, phone, email
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
            region: presence?.region || null,
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
            region: presence?.region || null,
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
