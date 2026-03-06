// ============================================================================
// FHIR STARTER LAYER
// ============================================================================
// Maps FHIR resources to homecare dispatch system for interoperability
// Provides read access to:
// - Patient (from users with role='client')
// - Practitioner (from users with role='doctor' or 'nurse')
// - ServiceRequest (from care_requests)
// - Task (from visit_assignments)

import { Router, Response } from 'express';
import { Pool } from 'pg';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { UserRole } from '../types/index';

function buildBundle(entries: any[], type: string = 'searchset') {
  return {
    resourceType: 'Bundle',
    type,
    total: entries.length,
    entry: entries.map((resource) => ({
      resource,
    })),
  };
}

function mapUserToPatient(user: any) {
  return {
    resourceType: 'Patient',
    id: String(user.id),
    active: !!user.is_active,
    name: [
      {
        text: user.name,
      },
    ],
    telecom: [
      ...(user.email ? [{ system: 'email', value: user.email, use: 'home' }] : []),
      ...(user.phone ? [{ system: 'phone', value: user.phone, use: 'mobile' }] : []),
    ],
    meta: {
      lastUpdated: user.updated_at || user.created_at,
    },
  };
}

function mapUserToPractitioner(user: any) {
  return {
    resourceType: 'Practitioner',
    id: String(user.id),
    active: !!user.is_active,
    name: [
      {
        text: user.name,
      },
    ],
    telecom: [
      ...(user.email ? [{ system: 'email', value: user.email, use: 'work' }] : []),
      ...(user.phone ? [{ system: 'phone', value: user.phone, use: 'mobile' }] : []),
    ],
    qualification: [
      {
        code: {
          text: String(user.role || '').toLowerCase() === 'doctor' ? 'Doctor' : 'Nurse',
        },
      },
    ],
    meta: {
      lastUpdated: user.updated_at || user.created_at,
    },
  };
}

function mapCareRequestToServiceRequest(row: any) {
  return {
    resourceType: 'ServiceRequest',
    id: String(row.id),
    status: mapRequestStatusToFhir(row.status),
    intent: 'order',
    priority: mapUrgencyToFhirPriority(row.urgency),
    code: {
      text: row.service_type || 'Care Service',
    },
    subject: row.client_id
      ? {
          reference: `Patient/${row.client_id}`,
        }
      : undefined,
    requester: row.professional_id
      ? {
          reference: `Practitioner/${row.professional_id}`,
        }
      : undefined,
    occurrenceDateTime: row.preferred_start || undefined,
    authoredOn: row.created_at || undefined,
    note: row.description
      ? [
          {
            text: row.description,
          },
        ]
      : [],
    locationCode: row.address_text
      ? [
          {
            text: row.address_text,
          },
        ]
      : [],
    meta: {
      lastUpdated: row.updated_at || row.created_at,
    },
  };
}

function mapAssignmentToTask(row: any) {
  const taskStatus =
    row.accepted_at ? 'completed' :
    row.declined_at ? 'failed' :
    row.offer_expires_at ? 'in-progress' :
    'requested';

  return {
    resourceType: 'Task',
    id: String(row.id),
    status: taskStatus,
    intent: 'order',
    code: {
      text: 'Care Request Dispatch Offer',
    },
    for: row.request_id
      ? {
          reference: `ServiceRequest/${row.request_id}`,
        }
      : undefined,
    owner: row.professional_id
      ? {
          reference: `Practitioner/${row.professional_id}`,
        }
      : undefined,
    executionPeriod: row.offer_expires_at
      ? {
          end: row.offer_expires_at,
        }
      : undefined,
    authoredOn: row.created_at || undefined,
    meta: {
      lastUpdated: row.updated_at || row.created_at,
    },
  };
}

function mapRequestStatusToFhir(status: string) {
  const s = String(status || '').toLowerCase();
  if (s === 'queued') return 'active';
  if (s === 'offered') return 'active';
  if (s === 'accepted') return 'active';
  if (s === 'en_route') return 'active';
  if (s === 'completed') return 'completed';
  if (s === 'cancelled') return 'revoked';
  return 'active';
}

function mapUrgencyToFhirPriority(urgency: string) {
  const u = String(urgency || '').toLowerCase();
  if (u === 'critical') return 'stat';
  if (u === 'high') return 'urgent';
  if (u === 'medium') return 'routine';
  return 'routine';
}

export function createFhirRouter(pool: Pool) {
  const router = Router();

  // ---------------------------------------------------------
  // CapabilityStatement (metadata)
  // ---------------------------------------------------------
  router.get(
    '/metadata',
    authMiddleware,
    requireRole(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE),
    async (_req: AuthRequest, res: Response): Promise<void> => {
      res.json({
        resourceType: 'CapabilityStatement',
        status: 'active',
        date: new Date().toISOString(),
        kind: 'instance',
        format: ['json'],
        fhirVersion: '4.0.1',
        rest: [
          {
            mode: 'server',
            resource: [
              { type: 'Patient', interaction: [{ code: 'read' }, { code: 'search-type' }] },
              { type: 'Practitioner', interaction: [{ code: 'read' }, { code: 'search-type' }] },
              { type: 'ServiceRequest', interaction: [{ code: 'read' }, { code: 'search-type' }] },
              { type: 'Task', interaction: [{ code: 'read' }, { code: 'search-type' }] },
            ],
          },
        ],
      });
    }
  );

  // ---------------------------------------------------------
  // Patient search & read
  // ---------------------------------------------------------
  router.get(
    '/Patient',
    authMiddleware,
    requireRole(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE),
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const email = String(req.query.email || '').trim().toLowerCase();
        const clauses = [`role = 'client'`];
        const params: any[] = [];
        let i = 1;

        if (email) {
          clauses.push(`LOWER(email) = $${i++}`);
          params.push(email);
        }

        const result = await pool.query(
          `SELECT id, name, email, phone, is_active, created_at, updated_at
           FROM users
           WHERE ${clauses.join(' AND ')}
           ORDER BY name`,
          params
        );

        const resources = result.rows.map(mapUserToPatient);
        res.json(buildBundle(resources));
      } catch (err) {
        console.error('FHIR Patient search error:', err);
        res.status(500).json({ error: 'Failed to load Patient resources' });
      }
    }
  );

  router.get(
    '/Patient/:id',
    authMiddleware,
    requireRole(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE),
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const result = await pool.query(
          `SELECT id, name, email, phone, is_active, created_at, updated_at
           FROM users
           WHERE id = $1 AND role = 'client'
           LIMIT 1`,
          [req.params.id]
        );

        if (result.rows.length === 0) {
          res.status(404).json({ error: 'Patient not found' });
          return;
        }

        res.json(mapUserToPatient(result.rows[0]));
      } catch (err) {
        console.error('FHIR Patient read error:', err);
        res.status(500).json({ error: 'Failed to load Patient resource' });
      }
    }
  );

  // ---------------------------------------------------------
  // Practitioner search & read
  // ---------------------------------------------------------
  router.get(
    '/Practitioner',
    authMiddleware,
    requireRole(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE),
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const role = String(req.query.role || '').trim().toLowerCase();
        const clauses = [`role IN ('doctor', 'nurse')`];
        const params: any[] = [];
        let i = 1;

        if (role) {
          clauses.push(`LOWER(role) = $${i++}`);
          params.push(role);
        }

        const result = await pool.query(
          `SELECT id, name, email, phone, role, is_active, created_at, updated_at
           FROM users
           WHERE ${clauses.join(' AND ')}
           ORDER BY name`,
          params
        );

        res.json(buildBundle(result.rows.map(mapUserToPractitioner)));
      } catch (err) {
        console.error('FHIR Practitioner search error:', err);
        res.status(500).json({ error: 'Failed to load Practitioner resources' });
      }
    }
  );

  router.get(
    '/Practitioner/:id',
    authMiddleware,
    requireRole(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE),
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const result = await pool.query(
          `SELECT id, name, email, phone, role, is_active, created_at, updated_at
           FROM users
           WHERE id = $1 AND role IN ('doctor', 'nurse')
           LIMIT 1`,
          [req.params.id]
        );

        if (result.rows.length === 0) {
          res.status(404).json({ error: 'Practitioner not found' });
          return;
        }

        res.json(mapUserToPractitioner(result.rows[0]));
      } catch (err) {
        console.error('FHIR Practitioner read error:', err);
        res.status(500).json({ error: 'Failed to load Practitioner resource' });
      }
    }
  );

  // ---------------------------------------------------------
  // ServiceRequest search & read
  // ---------------------------------------------------------
  router.get(
    '/ServiceRequest',
    authMiddleware,
    requireRole(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE),
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const status = String(req.query.status || '').trim().toLowerCase();
        const clauses: string[] = [];
        const params: any[] = [];
        let i = 1;

        if (status) {
          clauses.push(`LOWER(status::text) = $${i++}`);
          params.push(status);
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

        const result = await pool.query(
          `SELECT
             id,
             client_id,
             professional_id,
             service_type,
             address_text,
             preferred_start,
             urgency,
             status,
             description,
             created_at,
             updated_at
           FROM care_requests
           ${where}
           ORDER BY created_at DESC`,
          params
        );

        res.json(buildBundle(result.rows.map(mapCareRequestToServiceRequest)));
      } catch (err) {
        console.error('FHIR ServiceRequest search error:', err);
        res.status(500).json({ error: 'Failed to load ServiceRequest resources' });
      }
    }
  );

  router.get(
    '/ServiceRequest/:id',
    authMiddleware,
    requireRole(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE),
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const result = await pool.query(
          `SELECT
             id,
             client_id,
             professional_id,
             service_type,
             address_text,
             preferred_start,
             urgency,
             status,
             description,
             created_at,
             updated_at
           FROM care_requests
           WHERE id = $1
           LIMIT 1`,
          [req.params.id]
        );

        if (result.rows.length === 0) {
          res.status(404).json({ error: 'ServiceRequest not found' });
          return;
        }

        res.json(mapCareRequestToServiceRequest(result.rows[0]));
      } catch (err) {
        console.error('FHIR ServiceRequest read error:', err);
        res.status(500).json({ error: 'Failed to load ServiceRequest resource' });
      }
    }
  );

  // ---------------------------------------------------------
  // Task search & read
  // ---------------------------------------------------------
  router.get(
    '/Task',
    authMiddleware,
    requireRole(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE),
    async (_req: AuthRequest, res: Response): Promise<void> => {
      try {
        const result = await pool.query(
          `SELECT
             id,
             request_id,
             professional_id,
             offer_expires_at,
             accepted_at,
             declined_at,
             created_at,
             now() as updated_at
           FROM visit_assignments
           ORDER BY created_at DESC`
        );

        res.json(buildBundle(result.rows.map(mapAssignmentToTask)));
      } catch (err) {
        console.error('FHIR Task search error:', err);
        res.status(500).json({ error: 'Failed to load Task resources' });
      }
    }
  );

  router.get(
    '/Task/:id',
    authMiddleware,
    requireRole(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE),
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const result = await pool.query(
          `SELECT
             id,
             request_id,
             professional_id,
             offer_expires_at,
             accepted_at,
             declined_at,
             created_at,
             now() as updated_at
           FROM visit_assignments
           WHERE id = $1
           LIMIT 1`,
          [req.params.id]
        );

        if (result.rows.length === 0) {
          res.status(404).json({ error: 'Task not found' });
          return;
        }

        res.json(mapAssignmentToTask(result.rows[0]));
      } catch (err) {
        console.error('FHIR Task read error:', err);
        res.status(500).json({ error: 'Failed to load Task resource' });
      }
    }
  );

  return router;
}
