// ============================================================================
// API KEY AUTHENTICATION MIDDLEWARE
// ============================================================================
// For external integrations (FHIR, webhooks, etc.)

import type { Response, NextFunction } from 'express';
import type { Pool } from 'pg';
import type { AuthRequest } from './auth';

/**
 * Authenticate requests via API key
 * Expects: Authorization: Bearer {api_key}
 */
export function apiKeyAuth(pool: Pool) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization || '';
    const matches = authHeader.match(/^Bearer\s+(.+)$/);

    if (!matches || !matches[1]) {
      res.status(401).json({ error: 'Missing or invalid API key' });
      return;
    }

    const apiKey = matches[1];

    try {
      // Query API key from integrations table
      const result = await pool.query(
        `SELECT id, user_id, name, is_active
         FROM integrations
         WHERE api_key = $1 AND is_active = true`,
        [apiKey]
      );

      if (result.rows.length === 0) {
        res.status(401).json({ error: 'Invalid API key' });
        return;
      }

      const integration = result.rows[0];

      // Attach integration and user info to request
      (req as any).integrationId = integration.id;
      (req as any).userId = integration.user_id;
      (req as any).integration = integration;

      next();
    } catch (err) {
      console.error('API key auth error:', err);
      res.status(500).json({ error: 'Authentication failed' });
    }
  };
}
