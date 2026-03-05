// ============================================================================
// REQUESTS ROUTES
// ============================================================================

import { Router, Response } from 'express';
import type { Pool } from 'pg';
import { requestService } from '../services/request.service';
import { matchingService } from '../services/matching.service';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';
import { UserRole, VisitStatus } from '../types/index';
import { v4 as uuidv4 } from 'uuid';
import { emitRealtimeEventToDb } from '../realtime/emitToDb';
import { publishRealtimeEvent } from '../realtime/publisher';

const router = Router();
let dbPool: Pool | null = null;

/**
 * Create a new care request (MVP - in-memory)
 * POST /requests/create
 * DEPRECATED: Use POST /requests instead for PostgreSQL
 */
router.post('/create', authMiddleware, (req: AuthRequest, res: Response): void => {
  const { serviceType, description, address, scheduledDateTime, urgency, medication } = req.body;

  if (!serviceType || !description || !address || !scheduledDateTime || !urgency) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const request = requestService.createRequest(
    req.user!.userId,
    serviceType,
    description,
    address,
    new Date(scheduledDateTime),
    urgency,
    medication
  );

  // Publish event for real-time updates (even for MVP)
  publishRealtimeEvent({
    type: 'REQUEST_CREATED',
    requestId: request.id,
    clientId: req.user!.userId,
    data: {
      serviceType,
      urgency,
      address,
    },
  });

  res.status(201).json({
    success: true,
    data: request,
  });
});

/**
 * Helper function to set up PostgreSQL routes
 * Call this from index.ts with the pool: createRequestRoutes(router, pool)
 */
export function setupPostgresRoutes(pool: Pool): void {
  // Store the pool for use by the routes
  dbPool = pool;

  /**
   * Create a new care request (Phase 2 - PostgreSQL)
   * POST /requests
   */
  router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { serviceType, addressText, preferredStart, preferredEnd, urgency, description } = req.body;

      if (!serviceType || !addressText || !preferredStart || !preferredEnd || !urgency) {
        res.status(400).json({ error: 'Missing required fields: serviceType, addressText, preferredStart, preferredEnd, urgency' });
        return;
      }

      const requestId = uuidv4();
      const clientId = req.user!.userId;

      const result = await pool.query(
        `INSERT INTO care_requests (id, client_id, service_type, address_text, preferred_start, preferred_end, urgency, description, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
         RETURNING id, client_id, service_type, address_text, preferred_start, urgency, status, created_at`,
        [requestId, clientId, serviceType, addressText, new Date(preferredStart), new Date(preferredEnd), urgency, description || '', 'queued']
      );

      const request = result.rows[0];

      // Publish REQUEST_CREATED event to database for relay
      await emitRealtimeEventToDb(pool, 'REQUEST_CREATED', {
        requestId: request.id,
        clientId: request.client_id,
        data: {
          serviceType: request.service_type,
          urgency: request.urgency,
          address: request.address_text,
        },
      });

      res.status(201).json({
        success: true,
        data: {
          id: request.id,
          clientId: request.client_id,
          serviceType: request.service_type,
          address: request.address_text,
          preferredStart: request.preferred_start,
          urgency: request.urgency,
          status: request.status,
          createdAt: request.created_at,
        },
      });
    } catch (error) {
      console.error('[Requests] Error creating request:', error);
      res.status(500).json({ error: 'Failed to create request' });
    }
  });

  /**
   * Get all requests (admin only)
   * GET /requests/all
   * Includes offer expiry time for countdown display
   */
  router.get('/all', authMiddleware, requireRole(UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT 
           cr.id,
           cr.client_id as "clientId",
           cr.service_type as "serviceType",
           cr.address_text as address,
           cr.preferred_start as "scheduledDateTime",
           cr.urgency,
           cr.status,
           cr.description,
           cr.professional_id as "assignedProfessionalId",
           cr.created_at as "createdAt",
           cr.updated_at as "updatedAt",
           va.offer_expires_at as "offerExpiresAt"
         FROM care_requests cr
         LEFT JOIN visit_assignments va ON cr.id = va.request_id 
           AND va.offer_expires_at > NOW() 
           AND va.accepted_at IS NULL 
           AND va.declined_at IS NULL
         ORDER BY cr.created_at DESC`
      );

      const requests = result.rows.map((row: any) => ({
        ...row,
        offerExpiresAt: row.offerExpiresAt ? row.offerExpiresAt.toISOString() : undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));

      res.json({
        success: true,
        data: requests,
      });
    } catch (err) {
      console.error('Error fetching requests:', err);
      res.status(500).json({ error: 'Failed to fetch requests' });
    }
  });
}

/**
 * Get all requests for client
 * GET /requests/client
 */
router.get(
  '/client/list',
  authMiddleware,
  (req: AuthRequest, res: Response): void => {
    const requests = requestService.getClientRequests(req.user!.userId);

    res.json({
      success: true,
      data: requests,
    });
  }
);

/**
 * Get all requests (admin only)
 * GET /requests/all
 * Includes offer expiry time for countdown display
 */
router.get('/all', authMiddleware, requireRole(UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    // Mock data for development
    if (process.env.NODE_ENV === 'development') {
      const mockRequests = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          clientId: 'client-1',
          serviceType: 'nursing',
          address: '123 Oak Street, Springfield',
          scheduledDateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          urgency: 'high',
          status: 'queued',
          description: 'Post-operative care required',
          assignedProfessionalId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          offerExpiresAt: null,
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          clientId: 'client-2',
          serviceType: 'medical',
          address: '456 Elm Avenue, Springfield',
          scheduledDateTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          urgency: 'medium',
          status: 'offered',
          description: 'Blood pressure monitoring',
          assignedProfessionalId: null,
          createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          offerExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          clientId: 'client-3',
          serviceType: 'elderly_care',
          address: '789 Pine Road, Springfield',
          scheduledDateTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
          urgency: 'low',
          status: 'offered',
          description: 'Companion care and meal prep',
          assignedProfessionalId: null,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
          offerExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        },
      ];

      res.json({
        success: true,
        data: mockRequests,
      });
      return;
    }

    if (!dbPool) {
      return res.status(500).json({ error: 'Database pool not initialized' });
    }

    const result = await dbPool.query(
      `SELECT 
         cr.id,
         cr.client_id as "clientId",
         cr.service_type as "serviceType",
         cr.address_text as address,
         cr.preferred_start as "scheduledDateTime",
         cr.urgency,
         cr.status,
         cr.description,
         cr.professional_id as "assignedProfessionalId",
         cr.created_at as "createdAt",
         cr.updated_at as "updatedAt",
         va.offer_expires_at as "offerExpiresAt"
       FROM care_requests cr
       LEFT JOIN visit_assignments va ON cr.id = va.request_id 
         AND va.offer_expires_at > NOW() 
         AND va.accepted_at IS NULL 
         AND va.declined_at IS NULL
       ORDER BY cr.created_at DESC`
    );

    const requests = result.rows.map((row: any) => ({
      ...row,
      offerExpiresAt: row.offerExpiresAt ? row.offerExpiresAt.toISOString() : undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    res.json({
      success: true,
      data: requests,
    });
  } catch (err) {
    console.error('Error fetching requests:', err);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

/**
 * Get request details
 * GET /requests/:id
 */
router.get('/:id', authMiddleware, (req: AuthRequest, res: Response): void => {
  const request = requestService.getRequestDetails(req.params.id);

  if (!request) {
    res.status(404).json({ error: 'Request not found' });
    return;
  }

  res.json({
    success: true,
    data: request,
  });
});

/**
 * Find matching professionals for a request
 * POST /requests/:id/match
 */
router.post(
  '/:id/match',
  authMiddleware,
  requireRole(UserRole.ADMIN),
  (req: AuthRequest, res: Response): void => {
    const request = requestService.getRequestDetails(req.params.id);

    if (!request) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    const matches = matchingService.findMatches({
      requestId: request.id,
      serviceType: request.serviceType,
      urgency: request.urgency,
      location: request.address,
      scheduledDateTime: request.scheduledDateTime,
    });

    res.json({
      success: true,
      data: matches,
    });
  }
);

/**
 * Assign professional to request
 * POST /requests/:id/assign
 */
router.post(
  '/:id/assign',
  authMiddleware,
  requireRole(UserRole.ADMIN),
  (req: AuthRequest, res: Response): void => {
    const { professionalId } = req.body;

    if (!professionalId) {
      res.status(400).json({ error: 'Professional ID required' });
      return;
    }

    const updated = requestService.assignProfessional(req.params.id, professionalId);

    if (!updated) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    res.json({
      success: true,
      data: updated,
    });
  }
);

/**
 * Update request status
 * PUT /requests/:id/status
 */
router.put('/:id/status', authMiddleware, (req: AuthRequest, res: Response): void => {
  const { status } = req.body;

  if (!status) {
    res.status(400).json({ error: 'Status required' });
    return;
  }

  const oldRequest = requestService.getRequestDetails(req.params.id);
  if (!oldRequest) {
    res.status(404).json({ error: 'Request not found' });
    return;
  }

  const oldStatus = oldRequest.status; // Capture old status before update
  const updated = requestService.updateRequestStatus(req.params.id, status);

  if (!updated) {
    res.status(404).json({ error: 'Request not found' });
    return;
  }

  // Publish status change event
  publishRealtimeEvent({
    type: 'REQUEST_STATUS_CHANGED',
    requestId: req.params.id,
    clientId: updated.clientId,
    oldStatus,
    newStatus: status,
  });

  res.json({
    success: true,
    data: updated,
  });
});

export default router;
