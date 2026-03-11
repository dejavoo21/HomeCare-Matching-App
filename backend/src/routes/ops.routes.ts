import { Router, Response } from 'express';
import type { Pool } from 'pg';
import { checkSchema } from '../startup/checkSchema';

export function createOpsRouter(pool: Pool) {
  const router = Router();

  router.get('/health', async (_req, res: Response) => {
    const startedAt = Date.now();

    try {
      await pool.query('SELECT 1');
      res.json({
        success: true,
        ok: true,
        status: 'healthy',
        db: 'up',
        uptimeSeconds: Math.floor(process.uptime()),
        responseMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        ok: false,
        status: 'degraded',
        db: 'down',
        responseMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
        error: err?.message || 'Database unavailable',
      });
    }
  });

  router.get('/ready', async (_req, res: Response) => {
    try {
      await pool.query('SELECT 1');
      await checkSchema();
      res.json({
        success: true,
        ok: true,
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(503).json({
        success: false,
        ok: false,
        status: 'not_ready',
        error: err?.message || 'Database unavailable',
      });
    }
  });

  return router;
}
