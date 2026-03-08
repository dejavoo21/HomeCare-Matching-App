import { Router, Response } from 'express';
import type { Pool } from 'pg';

export function createOpsRouter(pool: Pool) {
  const router = Router();

  router.get('/health', async (_req, res: Response) => {
    res.json({
      success: true,
      status: 'ok',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  router.get('/ready', async (_req, res: Response) => {
    try {
      await pool.query('SELECT 1');
      res.json({
        success: true,
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(503).json({
        success: false,
        status: 'not_ready',
        error: err?.message || 'Database unavailable',
      });
    }
  });

  return router;
}
