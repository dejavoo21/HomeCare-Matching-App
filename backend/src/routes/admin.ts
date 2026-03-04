// ============================================================================
// ADMIN ROUTES
// ============================================================================

import { Router, Response } from 'express';
import { Pool } from 'pg';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import { UserRole } from '../types/index';
import { emitRealtimeEventToDb } from '../realtime/emitToDb';

export function createAdminRouter(pool: Pool) {
  const router = Router();

  // Dashboard and Professional endpoints (existing routes)
  setupDashboardRoutes(router, pool);
  
  // Phase 3: Offer and Activity endpoints
  setupActivityRoutes(router, pool);
  setupOfferRoutes(router, pool);
  
  // Phase 4: Admin request management endpoints
  setupRequestAdminRoutes(router, pool);

  // Phase 5: Global search
  setupSearchRoutes(router, pool);

  return router;
}

// ============================================================================
// DASHBOARD ROUTES
// ============================================================================

function setupDashboardRoutes(router: Router, pool: Pool) {
  /**
   * Get admin dashboard data (Postgres-based)
   * GET /admin/dashboard
   */
  router.get(
    '/dashboard',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (_req: AuthRequest, res: Response): Promise<void> => {
      try {
        const usersCount = await pool.query(`SELECT COUNT(*)::int AS n FROM users`);
        const reqCount = await pool.query(`SELECT COUNT(*)::int AS n FROM care_requests`);

        const statusCounts = await pool.query(
          `SELECT status, COUNT(*)::int AS n
           FROM care_requests
           GROUP BY status`
        );

        const breakdown = await pool.query(
          `SELECT role, COUNT(*)::int AS n
           FROM users
           GROUP BY role`
        );

        const byStatus: Record<string, number> = {};
        statusCounts.rows.forEach((r: any) => (byStatus[String(r.status).toLowerCase()] = r.n));

        const byRole: Record<string, number> = {};
        breakdown.rows.forEach((r: any) => (byRole[String(r.role).toLowerCase()] = r.n));

        res.json({
          success: true,
          data: {
            stats: {
              totalUsers: usersCount.rows[0].n,
              totalRequests: reqCount.rows[0].n,
              queuedRequests: byStatus.queued || 0,
              offeredRequests: byStatus.offered || 0,
              acceptedRequests: byStatus.accepted || 0,
              enRouteRequests: byStatus.en_route || 0,
              completedRequests: byStatus.completed || 0,
              cancelledRequests: byStatus.cancelled || 0,
            },
            userBreakdown: {
              nurses: byRole.nurse || 0,
              doctors: byRole.doctor || 0,
              clients: byRole.client || 0,
            },
          },
        });
      } catch (err) {
        console.error('Admin dashboard error:', err);
        res.status(500).json({ error: 'Failed to load dashboard' });
      }
    }
  );

  /**
   * Get all healthcare professionals (Postgres-based)
   * GET /admin/professionals
   */
  router.get(
    '/professionals',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (_req: AuthRequest, res: Response): Promise<void> => {
      try {
        const result = await pool.query(
          `SELECT id, name, email, role, phone, is_active
           FROM users
           WHERE role IN ('nurse', 'doctor')
           ORDER BY name`
        );

        const professionals = result.rows.map((p: any) => ({
          id: p.id,
          name: p.name,
          email: p.email,
          role: p.role,
          location: p.phone || null,
          isActive: p.is_active,
        }));

        res.json({ success: true, data: professionals });
      } catch (err) {
        console.error('Error fetching professionals:', err);
        res.status(500).json({ error: 'Failed to fetch professionals' });
      }
    }
  );

  /**
   * Get all clients (Postgres-based)
   * GET /admin/clients
   */
  router.get(
    '/clients',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (_req: AuthRequest, res: Response): Promise<void> => {
      try {
        const result = await pool.query(
          `SELECT id, name, email, phone, is_active
           FROM users
           WHERE role = 'client'
           ORDER BY name`
        );

        res.json({
          success: true,
          data: result.rows.map((c: any) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            location: c.phone || null,
            isActive: c.is_active,
          })),
        });
      } catch (err) {
        console.error('Error fetching clients:', err);
        res.status(500).json({ error: 'Failed to fetch clients' });
      }
    }
  );

  /**
   * Deactivate a user (Postgres-based)
   * PUT /admin/users/:id/deactivate
   */
  router.put(
    '/users/:id/deactivate',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const result = await pool.query(
          `UPDATE users SET is_active = false WHERE id = $1 RETURNING *`,
          [req.params.id]
        );

        if (result.rows.length === 0) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        res.json({ success: true, message: 'User deactivated' });
      } catch (err) {
        console.error('Error deactivating user:', err);
        res.status(500).json({ error: 'Failed to deactivate user' });
      }
    }
  );

  /**
   * Reactivate a user (Postgres-based)
   * PUT /admin/users/:id/reactivate
   */
  router.put(
    '/users/:id/reactivate',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const result = await pool.query(
          `UPDATE users SET is_active = true WHERE id = $1 RETURNING *`,
          [req.params.id]
        );

        if (result.rows.length === 0) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        res.json({ success: true, message: 'User reactivated' });
      } catch (err) {
        console.error('Error reactivating user:', err);
        res.status(500).json({ error: 'Failed to reactivate user' });
      }
    }
  );

  /**
   * Get dispatch queue
   * GET /admin/queue
   */
  router.get(
    '/queue',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        res.json({
          success: true,
          data: {
            queue: [],
            total: 0,
          },
        });
      } catch (err) {
        console.error('Error fetching queue:', err);
        res.status(500).json({ error: 'Failed to fetch queue' });
      }
    }
  );

  /**
   * Get audit logs
   * GET /admin/audit-logs
   */
  router.get(
    '/audit-logs',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        res.json({
          success: true,
          data: [],
        });
      } catch (err) {
        console.error('Error fetching audit logs:', err);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
      }
    }
  );

  /**
   * Get system health and statistics
   * GET /admin/stats
   */
  router.get(
    '/stats',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        res.json({
          success: true,
          data: {
            queuedRequests: 0,
            offeredRequests: 0,
            assignedRequests: 0,
            completedRequests: 0,
            totalProfessionals: 0,
            totalClients: 0,
            avgQueueTimeSeconds: 0,
            pendingNotifications: 0,
          },
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
      }
    }
  );
}

// ============================================================================
// PHASE 3: ACTIVITY ROUTES
// ============================================================================

function setupActivityRoutes(router: Router, pool: Pool) {
  /**
   * Get activity feed (last 20 events)
   * GET /admin/activity
   */
  router.get(
    '/activity',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (_req: AuthRequest, res: Response): Promise<void> => {
      try {
        const result = await pool.query(
          `SELECT id, type, created_at, payload
           FROM realtime_events
           ORDER BY created_at DESC
           LIMIT 20`
        );

        const events = result.rows.map((row: any) => ({
          id: row.id,
          type: row.type,
          timestamp: new Date(row.created_at).getTime(),
          ...(row.payload || {}),
        }));

        res.json({ success: true, data: events });
      } catch (err) {
        console.error('Error fetching activity feed:', err);
        res.status(500).json({ error: 'Failed to fetch activity feed' });
      }
    }
  );
}

// ============================================================================
// PHASE 3: OFFER ROUTES
// ============================================================================

function setupOfferRoutes(router: Router, pool: Pool) {
  /**
   * Create an offer to a professional for a care request
   * POST /admin/requests/:id/offer
   * Body: { professionalId: string }
   * Requires: offers:create, offers:override
   */
  router.post(
    '/requests/:id/offer',
    authMiddleware,
    requirePermission(pool, 'offers:create', 'offers:override'),
    async (req: AuthRequest, res: Response): Promise<void> => {
      const requestId = req.params.id;
      const { professionalId } = req.body || {};

      if (!professionalId) {
        res.status(400).json({ error: 'professionalId is required' });
        return;
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Lock request
        const rq = await client.query(
          `SELECT id, client_id, status
           FROM care_requests
           WHERE id = $1
           FOR UPDATE`,
          [requestId]
        );

        if (rq.rows.length === 0) {
          await client.query('ROLLBACK');
          res.status(404).json({ error: 'Request not found' });
          return;
        }

        const requestRow = rq.rows[0];
        const clientId = requestRow.client_id;

        // validate professional
        const pro = await client.query(
          `SELECT id, role, is_active
           FROM users
           WHERE id = $1`,
          [professionalId]
        );

        if (pro.rows.length === 0) {
          await client.query('ROLLBACK');
          res.status(404).json({ error: 'Professional not found' });
          return;
        }

        const role = String(pro.rows[0].role).toLowerCase();
        if (!pro.rows[0].is_active || (role !== 'nurse' && role !== 'doctor')) {
          await client.query('ROLLBACK');
          res.status(400).json({ error: 'Professional must be an active nurse/doctor' });
          return;
        }

        // if active offer exists, decline it (admin override)
        const activeOffer = await client.query(
          `SELECT id, professional_id
           FROM visit_assignments
           WHERE request_id = $1
             AND offer_expires_at > NOW()
             AND accepted_at IS NULL
             AND declined_at IS NULL
           LIMIT 1
           FOR UPDATE`,
          [requestId]
        );

        if (activeOffer.rows.length > 0) {
          const prev = activeOffer.rows[0];

          await client.query(
            `UPDATE visit_assignments
             SET declined_at = NOW(), decline_reason = $1
             WHERE id = $2`,
            ['admin_reassign', prev.id]
          );

          await emitRealtimeEventToDb(pool, 'OFFER_DECLINED', {
            offerId: prev.id,
            requestId,
            professionalId: prev.professional_id,
            clientId,
            declineReason: 'admin_reassign',
          });
        }

        // create new offer (3 minutes)
        const offerExpiresAt = new Date(Date.now() + 3 * 60 * 1000);

        const ins = await client.query(
          `INSERT INTO visit_assignments (request_id, professional_id, offer_expires_at)
           VALUES ($1, $2, $3)
           RETURNING id, offer_expires_at`,
          [requestId, professionalId, offerExpiresAt]
        );

        const offerId = ins.rows[0].id;
        const expiresIso = new Date(ins.rows[0].offer_expires_at).toISOString();

        // update request status
        await client.query(
          `UPDATE care_requests
           SET status='offered',
               professional_id=$2,
               updated_at=NOW()
           WHERE id=$1`,
          [requestId, professionalId]
        );

        await client.query('COMMIT');

        // emit events
        await emitRealtimeEventToDb(pool, 'REQUEST_STATUS_CHANGED', {
          requestId,
          clientId,
          oldStatus: requestRow.status,
          newStatus: 'offered',
        });

        await emitRealtimeEventToDb(pool, 'OFFER_CREATED', {
          offerId,
          requestId,
          professionalId,
          clientId,
          offerExpiresAt: expiresIso,
        });

        res.json({
          success: true,
          data: { offerId, requestId, professionalId, offerExpiresAt: expiresIso },
        });
      } catch (err) {
        try { await client.query('ROLLBACK'); } catch {}
        console.error('Error creating offer:', err);
        res.status(500).json({ error: 'Failed to create offer' });
      } finally {
        client.release();
      }
    }
  );
}

// ============================================================================
// REQUEST ADMIN MANAGEMENT ROUTES
// ============================================================================

function setupRequestAdminRoutes(router: Router, pool: Pool) {
  /**
   * Requeue request (set status back to queued)
   * POST /admin/requests/:id/requeue
   */
  router.post(
    '/requests/:id/requeue',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response): Promise<void> => {
      const requestId = req.params.id;

      try {
        const result = await pool.query(
          `UPDATE care_requests
           SET status='queued',
               professional_id=NULL,
               updated_at=NOW()
           WHERE id=$1
           RETURNING client_id, status`,
          [requestId]
        );

        if (result.rows.length === 0) {
          res.status(404).json({ error: 'Request not found' });
          return;
        }

        await emitRealtimeEventToDb(pool, 'REQUEST_STATUS_CHANGED', {
          requestId,
          clientId: result.rows[0].client_id,
          oldStatus: result.rows[0].status,
          newStatus: 'queued',
        });

        res.json({ success: true });
      } catch (err) {
        console.error('Requeue error:', err);
        res.status(500).json({ error: 'Failed to requeue' });
      }
    }
  );

  /**
   * Cancel request
   * POST /admin/requests/:id/cancel
   */
  router.post(
    '/requests/:id/cancel',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response): Promise<void> => {
      const requestId = req.params.id;

      try {
        const result = await pool.query(
          `UPDATE care_requests
           SET status='cancelled', updated_at=NOW()
           WHERE id=$1
           RETURNING client_id, status`,
          [requestId]
        );

        if (result.rows.length === 0) {
          res.status(404).json({ error: 'Request not found' });
          return;
        }

        await emitRealtimeEventToDb(pool, 'REQUEST_STATUS_CHANGED', {
          requestId,
          clientId: result.rows[0].client_id,
          oldStatus: result.rows[0].status,
          newStatus: 'cancelled',
        });

        res.json({ success: true });
      } catch (err) {
        console.error('Cancel error:', err);
        res.status(500).json({ error: 'Failed to cancel' });
      }
    }
  );

  /**
   * Set request urgency
   * POST /admin/requests/:id/urgency
   */
  router.post(
    '/requests/:id/urgency',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response): Promise<void> => {
      const requestId = req.params.id;
      const { urgency } = req.body || {};

      if (!urgency) {
        res.status(400).json({ error: 'urgency is required' });
        return;
      }

      try {
        const result = await pool.query(
          `UPDATE care_requests
           SET urgency=$2, updated_at=NOW()
           WHERE id=$1
           RETURNING client_id`,
          [requestId, String(urgency).toLowerCase()]
        );

        if (result.rows.length === 0) {
          res.status(404).json({ error: 'Request not found' });
          return;
        }

        await emitRealtimeEventToDb(pool, 'REQUEST_UPDATED', {
          requestId,
          clientId: result.rows[0].client_id,
          urgency,
        });

        res.json({ success: true });
      } catch (err) {
        console.error('Urgency update error:', err);
        res.status(500).json({ error: 'Failed to update urgency' });
      }
    }
  );
}

// ============================================================================
// GLOBAL SEARCH ROUTES
// ============================================================================

function setupSearchRoutes(router: Router, pool: Pool) {
  /**
   * Global search across requests, users, and events
   * GET /admin/search?q=...&limit=...
   */
  router.get(
    '/search',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response): Promise<void> => {
      const q = String(req.query.q || '').trim();
      const limit = Math.min(parseInt(String(req.query.limit || '10'), 10) || 10, 25);

      if (!q) {
        res.json({ success: true, data: { query: q, results: [] } });
        return;
      }

      const like = `%${q}%`;

      try {
        const [reqs, users, events] = await Promise.all([
          pool.query(
            `SELECT 
               cr.id,
               cr.status,
               cr.urgency,
               cr.service_type,
               cr.address_text,
               cr.description,
               cr.created_at
             FROM care_requests cr
             WHERE
               cr.id::text ILIKE $1 OR
               cr.description ILIKE $1 OR
               cr.address_text ILIKE $1 OR
               cr.service_type::text ILIKE $1 OR
               cr.status::text ILIKE $1 OR
               cr.urgency::text ILIKE $1
             ORDER BY cr.created_at DESC
             LIMIT $2`,
            [like, limit]
          ),

          pool.query(
            `SELECT 
               u.id,
               u.name,
               u.email,
               u.role,
               u.is_active,
               u.created_at
             FROM users u
             WHERE
               u.id::text ILIKE $1 OR
               u.name ILIKE $1 OR
               u.email ILIKE $1 OR
               u.role ILIKE $1
             ORDER BY u.created_at DESC
             LIMIT $2`,
            [like, limit]
          ),

          pool.query(
            `SELECT 
               re.id,
               re.type,
               re.created_at,
               re.payload
             FROM realtime_events re
             WHERE
               re.id::text ILIKE $1 OR
               re.type ILIKE $1 OR
               re.payload::text ILIKE $1
             ORDER BY re.created_at DESC
             LIMIT $2`,
            [like, limit]
          ),
        ]);

        const results = [
          ...reqs.rows.map((r: any) => ({
            kind: 'request',
            id: r.id,
            title: r.description || r.service_type,
            subtitle: `${String(r.status).toUpperCase()} • ${String(r.urgency).toUpperCase()} • ${r.address_text || ''}`,
            meta: { status: r.status, urgency: r.urgency, serviceType: r.service_type },
            createdAt: r.created_at,
          })),
          ...users.rows.map((u: any) => ({
            kind: 'user',
            id: u.id,
            title: u.name,
            subtitle: `${u.email} • ${String(u.role).toUpperCase()} • ${u.is_active ? 'ACTIVE' : 'INACTIVE'}`,
            meta: { role: u.role, isActive: u.is_active },
            createdAt: u.created_at,
          })),
          ...events.rows.map((e: any) => ({
            kind: 'event',
            id: e.id,
            title: e.type,
            subtitle: (() => {
              const p = e.payload || {};
              const parts = [
                p.requestId ? `request ${String(p.requestId).slice(0, 8)}` : '',
                p.professionalId ? `pro ${String(p.professionalId).slice(0, 8)}` : '',
                p.clientId ? `client ${String(p.clientId).slice(0, 8)}` : '',
              ].filter(Boolean);
              return parts.join(' • ') || 'Realtime event';
            })(),
            meta: e.payload || {},
            createdAt: e.created_at,
          })),
        ]
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, limit);

        res.json({
          success: true,
          data: { query: q, results },
        });
      } catch (err) {
        console.error('Global search error:', err);
        res.status(500).json({ error: 'Search failed' });
      }
    }
  );
}
