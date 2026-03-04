// ============================================================================
// FHIR-COMPATIBLE HOSPITAL ENDPOINTS
// ============================================================================
// Maps FHIR resources to homecare dispatch system
// Requires API key authentication for external integrations

import { Router, Request, Response } from 'express';
import type { Pool } from 'pg';
import { apiKeyAuth } from '../middleware/apiKeyAuth';
import { logAudit } from '../services/audit.service';
import { validateFhirResource, createOperationOutcome } from '../services/fhirValidation';
import { fhirEventsTotal, fhirValidationErrors } from '../monitoring/metrics';

export function createFhirRouter(pool: Pool) {
  const router = Router();

  /**
   * CREATE FHIR Patient
   * POST /fhir/Patient
   * Maps to: users table (role='client')
   * Required: API key in Authorization header
   */
  router.post(
    '/Patient',
    apiKeyAuth(pool),
    async (req: Request, res: Response): Promise<void> => {
      const body = req.body || {};
      const integrationId = (req as any).integrationId;

      try {
        // Validate FHIR Patient resource
        const validation = validateFhirResource(body);
        if (!validation.valid) {
          fhirValidationErrors.inc({ resource_type: 'Patient' });
          res.status(400).json(createOperationOutcome(validation.errors));
          return;
        }

        // Extract name from FHIR format
        const name = body.name?.[0]?.text || body.name?.[0]?.given?.[0] || 'Unknown Patient';

        // Extract email from telecom
        const telecom = body.telecom || [];
        const email = telecom.find((t: any) => t.system === 'email')?.value;

        // Extract location if provided
        const location = body.address?.[0]?.text || 'Unknown';

        // Insert patient as client user
        const result = await pool.query(
          `INSERT INTO users (name, email, role, location, is_active)
           VALUES ($1, $2, 'client', $3, true)
           RETURNING id, name, email, role`,
          [name, email, location]
        );

        const user = result.rows[0];

        // Log audit event
        await logAudit(pool, {
          actorId: (req as any).userId,
          actionType: 'FHIR_PATIENT_CREATE',
          entityType: 'Patient',
          entityId: user.id,
          metadata: { name: user.name },
        });

        fhirEventsTotal.inc({ resource_type: 'Patient', operation: 'create', status: 'success' });

        // Return FHIR-compliant response
        res.status(201).json({
          resourceType: 'Patient',
          id: user.id,
          name: [{ text: user.name }],
          telecom: email ? [{ system: 'email', value: email }] : [],
          active: true,
        });
      } catch (err) {
        console.error('FHIR Patient creation error:', err);
        res.status(500).json({
          resourceType: 'OperationOutcome',
          issue: [
            {
              severity: 'error',
              code: 'exception',
              diagnostics: 'Failed to create patient',
            },
          ],
        });
      }
    }
  );

  /**
   * READ FHIR Patient
   * GET /fhir/Patient/:id
   */
  router.get(
    '/Patient/:id',
    apiKeyAuth(pool),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const result = await pool.query('SELECT id, name, email, location FROM users WHERE id = $1 AND role = $2', [
          req.params.id,
          'client',
        ]);

        if (result.rows.length === 0) {
          res.status(404).json({
            resourceType: 'OperationOutcome',
            issue: [{ severity: 'error', code: 'not-found', diagnostics: 'Patient not found' }],
          });
          return;
        }

        const user = result.rows[0];

        res.json({
          resourceType: 'Patient',
          id: user.id,
          name: [{ text: user.name }],
          telecom: user.email ? [{ system: 'email', value: user.email }] : [],
          address: [{ text: user.location }],
          active: true,
        });
      } catch (err) {
        console.error('FHIR Patient read error:', err);
        res.status(500).json({
          resourceType: 'OperationOutcome',
          issue: [{ severity: 'error', code: 'exception', diagnostics: 'Failed to read patient' }],
        });
      }
    }
  );

  /**
   * CREATE FHIR ServiceRequest
   * POST /fhir/ServiceRequest
   * Maps to: care_requests table
   * Subject ref: Patient/:id
   */
  router.post(
    '/ServiceRequest',
    apiKeyAuth(pool),
    async (req: Request, res: Response): Promise<void> => {
      const body = req.body || {};
      const userId = (req as any).userId;

      try {
        // Validate FHIR ServiceRequest resource
        const validation = validateFhirResource(body);
        if (!validation.valid) {
          fhirValidationErrors.inc({ resource_type: 'ServiceRequest' });
          res.status(400).json(createOperationOutcome(validation.errors));
          return;
        }

        // Extract client ID from Patient reference
        const clientId = body.subject?.reference?.replace('Patient/', '');

        if (!clientId) {
          res.status(400).json({
            resourceType: 'OperationOutcome',
            issue: [{ severity: 'error', code: 'invalid', diagnostics: 'No valid subject (Patient) reference' }],
          });
          return;
        }

        // Extract service details
        const description = body.code?.text || body.code?.coding?.[0]?.display || 'Service request';
        const urgency = (body.priority || 'routine').toLowerCase();
        const requiredDate = body.occurrence?.start || null;

        // Verify patient exists
        const patientResult = await pool.query('SELECT id FROM users WHERE id = $1 AND role = $2', [
          clientId,
          'client',
        ]);

        if (patientResult.rows.length === 0) {
          res.status(400).json({
            resourceType: 'OperationOutcome',
            issue: [{ severity: 'error', code: 'invalid', diagnostics: 'Patient not found' }],
          });
          return;
        }

        // Create service request
        const result = await pool.query(
          `INSERT INTO care_requests (client_id, description, urgency, status, created_by, created_at)
           VALUES ($1, $2, $3, 'queued', $4, NOW())
           RETURNING id, client_id, description, urgency, status, created_at`,
          [clientId, description, urgency, userId]
        );

        const request = result.rows[0];

        // Log audit event
        await logAudit(pool, {
          actorId: userId,
          actionType: 'FHIR_SERVICE_REQUEST_CREATE',
          entityType: 'ServiceRequest',
          entityId: request.id,
          metadata: { clientId: request.client_id, description: request.description },
        });

        fhirEventsTotal.inc({ resource_type: 'ServiceRequest', operation: 'create', status: 'success' });

        // Return FHIR-compliant response
        res.status(201).json({
          resourceType: 'ServiceRequest',
          id: request.id,
          subject: { reference: `Patient/${request.client_id}` },
          code: { text: request.description },
          priority: request.urgency.toUpperCase(),
          status: 'draft',
          occurrence: { start: requiredDate || new Date().toISOString() },
          authoredOn: request.created_at,
        });
      } catch (err) {
        console.error('FHIR ServiceRequest creation error:', err);
        res.status(500).json({
          resourceType: 'OperationOutcome',
          issue: [{ severity: 'error', code: 'exception', diagnostics: 'Failed to create service request' }],
        });
      }
    }
  );

  /**
   * READ FHIR ServiceRequest
   * GET /fhir/ServiceRequest/:id
   */
  router.get(
    '/ServiceRequest/:id',
    apiKeyAuth(pool),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const result = await pool.query(
          `SELECT id, client_id, description, urgency, status, created_at
           FROM care_requests
           WHERE id = $1`,
          [req.params.id]
        );

        if (result.rows.length === 0) {
          res.status(404).json({
            resourceType: 'OperationOutcome',
            issue: [{ severity: 'error', code: 'not-found', diagnostics: 'ServiceRequest not found' }],
          });
          return;
        }

        const request = result.rows[0];

        res.json({
          resourceType: 'ServiceRequest',
          id: request.id,
          subject: { reference: `Patient/${request.client_id}` },
          code: { text: request.description },
          priority: request.urgency.toUpperCase(),
          status: request.status || 'draft',
          authoredOn: request.created_at,
        });
      } catch (err) {
        console.error('FHIR ServiceRequest read error:', err);
        res.status(500).json({
          resourceType: 'OperationOutcome',
          issue: [{ severity: 'error', code: 'exception', diagnostics: 'Failed to read service request' }],
        });
      }
    }
  );

  /**
   * Health check endpoint
   * GET /fhir/health
   */
  router.get('/health', async (_req: Request, res: Response): Promise<void> => {
    res.json({
      resourceType: 'CapabilityStatement',
      status: 'active',
      publisher: 'Homecare Matching System',
      fhirVersion: '4.0.1',
      kind: 'capability',
    });
  });

  return router;
}
