import { Router, Response } from 'express';
import type { Pool } from 'pg';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { UserRole } from '../types/index';

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function computeAuthorizationBadge(visit: any, authRows: any[]) {
  const matching = authRows.find(
    (authorization) =>
      String(authorization.client_id) === String(visit.client_id) &&
      String(authorization.service_type).toLowerCase() ===
        String(visit.service_type).toLowerCase()
  );

  if (!matching) {
    return {
      authorizationStatus: 'missing' as const,
      authorizationLabel: 'No auth',
    };
  }

  const visitDate = new Date(visit.preferred_start).getTime();
  const fromDate = new Date(matching.authorized_from).getTime();
  const toDate = new Date(matching.authorized_to).getTime();

  if (
    String(matching.status).toLowerCase() !== 'active' ||
    visitDate > toDate ||
    visitDate < fromDate
  ) {
    return {
      authorizationStatus: 'expired' as const,
      authorizationLabel: 'Auth expired',
    };
  }

  if (matching.remaining_visits !== null && Number(matching.remaining_visits) <= 0) {
    return {
      authorizationStatus: 'exhausted' as const,
      authorizationLabel: 'Auth exhausted',
    };
  }

  const daysLeft = Math.ceil((toDate - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 2) {
    return {
      authorizationStatus: 'warning' as const,
      authorizationLabel: 'Auth ending soon',
    };
  }

  return {
    authorizationStatus: 'ok' as const,
    authorizationLabel: matching.payer_name
      ? `Auth ok · ${matching.payer_name}`
      : 'Auth ok',
  };
}

function computeConflictBadge(visit: any, allVisits: any[]) {
  if (!visit.professional_id) {
    return {
      hasConflict: false,
      conflictLabel: '',
    };
  }

  const visitTime = new Date(visit.preferred_start).getTime();

  const nearby = allVisits.find((other) => {
    if (String(other.id) === String(visit.id)) return false;
    if (String(other.professional_id || '') !== String(visit.professional_id || '')) {
      return false;
    }

    const status = String(other.status || '').toLowerCase();
    if (!['offered', 'accepted', 'en_route'].includes(status)) {
      return false;
    }

    const otherTime = new Date(other.preferred_start).getTime();
    const diffMinutes = Math.abs(visitTime - otherTime) / (1000 * 60);
    return diffMinutes < 60;
  });

  if (nearby) {
    return {
      hasConflict: true,
      conflictLabel: 'Schedule conflict',
    };
  }

  return {
    hasConflict: false,
    conflictLabel: '',
  };
}

function computeWorkloadBadge(visit: any, allVisits: any[]) {
  if (!visit.professional_id) {
    return {
      dailyVisitCount: 0,
      workloadStatus: 'none' as const,
      workloadLabel: '',
    };
  }

  const visitDate = new Date(visit.preferred_start);

  const sameDayVisits = allVisits.filter((other) => {
    if (String(other.professional_id || '') !== String(visit.professional_id || '')) {
      return false;
    }

    const status = String(other.status || '').toLowerCase();
    if (!['offered', 'accepted', 'en_route', 'completed'].includes(status)) {
      return false;
    }

    const otherDate = new Date(other.preferred_start);
    return (
      otherDate.getFullYear() === visitDate.getFullYear() &&
      otherDate.getMonth() === visitDate.getMonth() &&
      otherDate.getDate() === visitDate.getDate()
    );
  });

  const count = sameDayVisits.length;

  if (count >= 6) {
    return {
      dailyVisitCount: count,
      workloadStatus: 'overloaded' as const,
      workloadLabel: `Overloaded · ${count} visits`,
    };
  }

  if (count >= 4) {
    return {
      dailyVisitCount: count,
      workloadStatus: 'busy' as const,
      workloadLabel: `Busy day · ${count} visits`,
    };
  }

  return {
    dailyVisitCount: count,
    workloadStatus: 'normal' as const,
    workloadLabel: count > 0 ? `${count} visits today` : '',
  };
}

function visitDayKey(isoDate: string): string {
  const date = new Date(isoDate);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

async function logAudit(
  pool: Pool,
  actorUserId: string | null,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: unknown
) {
  try {
    await pool.query(
      `INSERT INTO audit_events
       (actor_user_id, action, entity_type, entity_id, metadata, severity, created_at)
       VALUES ($1, $2, $3, $4, $5, 'info', now())`,
      [
        actorUserId,
        action,
        entityType || null,
        entityId || null,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

export function createScheduleRouter(pool: Pool) {
  const router = Router();

  router.get(
    '/board',
    authMiddleware,
    requireRole(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE),
    async (req: AuthRequest, res: Response) => {
      try {
        const startRaw = String(req.query.start || '');
        const days = Math.min(parseInt(String(req.query.days || '7'), 10) || 7, 14);
        const role = String(req.query.role || 'all').toLowerCase();

        const startDate = startRaw ? startOfDay(new Date(startRaw)) : startOfDay(new Date());
        const endDate = endOfDay(new Date(startDate.getTime() + (days - 1) * 24 * 60 * 60 * 1000));

        const professionalParams: unknown[] = [];
        let professionalWhere = `WHERE UPPER(role) IN ('NURSE', 'DOCTOR') AND is_active = true`;

        if (role === 'nurse' || role === 'doctor') {
          professionalParams.push(role.toUpperCase());
          professionalWhere += ` AND UPPER(role) = $1`;
        }

        const professionalsResult = await pool.query(
          `SELECT id, name, email, role, phone, is_active
           FROM users
           ${professionalWhere}
           ORDER BY role, name`,
          professionalParams
        );

        const visitsResult = await pool.query(
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
             cr.created_at,
             cr.updated_at,
             c.name AS client_name,
             c.email AS client_email,
             p.name AS professional_name,
             p.role AS professional_role
           FROM care_requests cr
           LEFT JOIN users c ON c.id = cr.client_id
           LEFT JOIN users p ON p.id = cr.professional_id
           WHERE cr.preferred_start >= $1
             AND cr.preferred_start <= $2
             AND cr.status IN ('queued', 'offered', 'accepted', 'en_route', 'completed')
           ORDER BY cr.preferred_start ASC`,
          [startDate.toISOString(), endDate.toISOString()]
        );

        const authorizationsResult = await pool.query(
          `SELECT
             id,
             client_id,
             service_type,
             authorized_from,
             authorized_to,
             remaining_visits,
             status,
             payer_name
           FROM client_authorizations`
        );

        const rawVisits = visitsResult.rows || [];
        const authRows = authorizationsResult.rows || [];

        const visits = rawVisits.map((visit: any) => ({
          ...visit,
          ...computeAuthorizationBadge(visit, authRows),
          ...computeConflictBadge(visit, rawVisits),
          ...computeWorkloadBadge(visit, rawVisits),
          hasOvertimeRisk: false,
          overtimeRiskLevel: null as 'warn' | 'danger' | null,
        }));

        const byProfessional = new Map<string, any[]>();
        for (const visit of visits) {
          if (!visit.professional_id) continue;
          if (!byProfessional.has(visit.professional_id)) {
            byProfessional.set(visit.professional_id, []);
          }
          byProfessional.get(visit.professional_id)!.push(visit);
        }

        for (const proVisits of byProfessional.values()) {
          proVisits.sort(
            (a, b) =>
              new Date(a.preferred_start).getTime() - new Date(b.preferred_start).getTime()
          );

          for (let i = 0; i < proVisits.length - 1; i++) {
            const current = proVisits[i];
            const next = proVisits[i + 1];
            const currentTime = new Date(current.preferred_start).getTime();
            const nextTime = new Date(next.preferred_start).getTime();
            const diffMinutes = Math.abs(nextTime - currentTime) / (1000 * 60);

            if (diffMinutes < 60) {
              current.hasConflict = true;
              next.hasConflict = true;
              current.conflictLabel = 'Schedule conflict';
              next.conflictLabel = 'Schedule conflict';
            }
          }
        }

        const byProfessionalDay = new Map<string, any[]>();
        for (const visit of visits) {
          if (!visit.professional_id) continue;
          const key = `${visit.professional_id}:${visitDayKey(visit.preferred_start)}`;
          if (!byProfessionalDay.has(key)) {
            byProfessionalDay.set(key, []);
          }
          byProfessionalDay.get(key)!.push(visit);
        }

        for (const proDayVisits of byProfessionalDay.values()) {
          const count = proDayVisits.length;
          const riskLevel = count >= 7 ? 'danger' : count >= 5 ? 'warn' : null;
          if (!riskLevel) continue;

          for (const visit of proDayVisits) {
            visit.hasOvertimeRisk = true;
            visit.overtimeRiskLevel = riskLevel;
            if (riskLevel === 'danger') {
              visit.workloadStatus = 'overloaded';
              visit.workloadLabel = `Overloaded · ${count} visits`;
            } else if (visit.workloadStatus === 'normal') {
              visit.workloadStatus = 'busy';
              visit.workloadLabel = `Busy day · ${count} visits`;
            }
          }
        }

        res.json({
          success: true,
          data: {
            range: {
              start: startDate.toISOString(),
              end: endDate.toISOString(),
              days,
            },
            professionals: professionalsResult.rows,
            visits,
          },
        });
      } catch (err) {
        console.error('Schedule board error:', err);
        res.status(500).json({ error: 'Failed to load scheduling board' });
      }
    }
  );

  router.post(
    '/assign',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response) => {
      const { requestId, professionalId, preferredStart } = req.body || {};

      if (!requestId || !professionalId || !preferredStart) {
        res
          .status(400)
          .json({ error: 'requestId, professionalId and preferredStart are required' });
        return;
      }

      try {
        const requestResult = await pool.query(
          `SELECT id, client_id, status, preferred_start, service_type
           FROM care_requests
           WHERE id = $1
           LIMIT 1`,
          [requestId]
        );

        if (requestResult.rows.length === 0) {
          res.status(404).json({ error: 'Request not found' });
          return;
        }

        const professionalResult = await pool.query(
          `SELECT id, name, role, is_active
           FROM users
           WHERE id = $1
             AND UPPER(role) IN ('NURSE', 'DOCTOR')
           LIMIT 1`,
          [professionalId]
        );

        if (professionalResult.rows.length === 0) {
          res.status(404).json({ error: 'Professional not found' });
          return;
        }

        if (!professionalResult.rows[0].is_active) {
          res.status(400).json({ error: 'Professional is inactive' });
          return;
        }

        const preferred = new Date(preferredStart);
        const slotStart = new Date(preferred.getTime() - 59 * 60 * 1000);
        const slotEnd = new Date(preferred.getTime() + 59 * 60 * 1000);

        const overlapResult = await pool.query(
          `SELECT id, preferred_start, status
           FROM care_requests
           WHERE professional_id = $1
             AND preferred_start BETWEEN $2 AND $3
             AND status IN ('offered', 'accepted', 'en_route')
             AND id <> $4
           LIMIT 1`,
          [professionalId, slotStart.toISOString(), slotEnd.toISOString(), requestId]
        );

        if (overlapResult.rows.length > 0) {
          res
            .status(409)
            .json({ error: 'Professional already has a nearby scheduled visit' });
          return;
        }

        const updated = await pool.query(
          `UPDATE care_requests
           SET professional_id = $2,
               preferred_start = $3,
               status = CASE
                 WHEN status = 'queued' THEN 'offered'
                 ELSE status
               END,
               updated_at = now()
           WHERE id = $1
           RETURNING *`,
          [requestId, professionalId, preferred.toISOString()]
        );

        await logAudit(
          pool,
          req.user?.userId || null,
          'SCHEDULE_ASSIGNMENT_CREATED',
          'care_request',
          requestId,
          {
            professionalId,
            preferredStart,
          }
        );

        res.json({
          success: true,
          data: updated.rows[0],
        });
      } catch (err) {
        console.error('Schedule assign error:', err);
        res.status(500).json({ error: 'Failed to assign request' });
      }
    }
  );

  router.post(
    '/reassign',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response) => {
      const { requestId, professionalId, preferredStart } = req.body || {};

      if (!requestId || !professionalId || !preferredStart) {
        res
          .status(400)
          .json({ error: 'requestId, professionalId and preferredStart are required' });
        return;
      }

      try {
        const existing = await pool.query(
          `SELECT id, professional_id, preferred_start, status
           FROM care_requests
           WHERE id = $1
           LIMIT 1`,
          [requestId]
        );

        if (existing.rows.length === 0) {
          res.status(404).json({ error: 'Request not found' });
          return;
        }

        const requestRow = existing.rows[0];
        const oldProfessionalId = requestRow.professional_id;

        const professionalResult = await pool.query(
          `SELECT id, name, role, is_active
           FROM users
           WHERE id = $1
             AND UPPER(role) IN ('NURSE', 'DOCTOR')
           LIMIT 1`,
          [professionalId]
        );

        if (professionalResult.rows.length === 0) {
          res.status(404).json({ error: 'Professional not found' });
          return;
        }

        if (!professionalResult.rows[0].is_active) {
          res.status(400).json({ error: 'Professional is inactive' });
          return;
        }

        const preferred = new Date(preferredStart);
        const slotStart = new Date(preferred.getTime() - 59 * 60 * 1000);
        const slotEnd = new Date(preferred.getTime() + 59 * 60 * 1000);

        const overlapResult = await pool.query(
          `SELECT id, preferred_start, status
           FROM care_requests
           WHERE professional_id = $1
             AND preferred_start BETWEEN $2 AND $3
             AND status IN ('offered', 'accepted', 'en_route')
             AND id <> $4
           LIMIT 1`,
          [professionalId, slotStart.toISOString(), slotEnd.toISOString(), requestId]
        );

        if (overlapResult.rows.length > 0) {
          res
            .status(409)
            .json({ error: 'Professional already has a nearby scheduled visit' });
          return;
        }

        const updated = await pool.query(
          `UPDATE care_requests
           SET professional_id = $2,
               preferred_start = $3,
               updated_at = now()
           WHERE id = $1
           RETURNING *`,
          [requestId, professionalId, preferred.toISOString()]
        );

        await logAudit(
          pool,
          req.user?.userId || null,
          'SCHEDULE_ASSIGNMENT_REASSIGNED',
          'care_request',
          requestId,
          {
            fromProfessionalId: oldProfessionalId,
            toProfessionalId: professionalId,
            preferredStart,
          }
        );

        res.json({
          success: true,
          data: updated.rows[0],
        });
      } catch (err) {
        console.error('Schedule reassign error:', err);
        res.status(500).json({ error: 'Failed to reassign request' });
      }
    }
  );

  return router;
}
