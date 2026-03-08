/**
 * Real-time SSE routes
 */

import { Router, Request, Response } from 'express';
import type { Pool } from 'pg';
import { sseHub } from '../realtime/sseHub';
import { eventBus } from '../realtime/eventBus';
import { verifyAccessToken } from '../utils/jwt';
import { isAllowedOrigin, resolveCorsOrigin } from '../utils/cors';

export function createRealtimeRoutes(pool: Pool): Router {
  const router = Router();

  /**
   * GET /realtime/stream
   * SSE endpoint for real-time updates
   */
  router.get('/stream', (req: Request, res: Response) => {
    try {
      let token = req.cookies?.accessToken as string | undefined;

      // fallback for older clients
      if (!token) token = req.query.token as string | undefined;

      if (!token && req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.slice(7);
      }

      if (!token) {
        res.status(401).json({ error: 'Unauthorized: token required' });
        return;
      }

      let decoded: { userId: string; role: string; email: string };

      try {
        decoded = verifyAccessToken(token);
      } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }

      // SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // IMPORTANT: must match frontend origin for cookies
      const requestOrigin = req.headers.origin;
      if (isAllowedOrigin(requestOrigin)) {
        res.setHeader('Access-Control-Allow-Origin', resolveCorsOrigin(requestOrigin));
      }

      res.setHeader('Access-Control-Allow-Credentials', 'true');

      // flush headers immediately
      res.flushHeaders?.();

      // register client
      const clientKey = sseHub.registerClient(decoded.userId, decoded.role as any, res);

      console.log(`[SSE] Connected ${decoded.userId}`);

      // heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          res.write(`event: HEARTBEAT\ndata: {}\n\n`);
        } catch {
          clearInterval(heartbeat);
        }
      }, 25000);

      req.on('close', () => {
        clearInterval(heartbeat);
        sseHub.unregisterClient(clientKey);
        console.log(`[SSE] Disconnected ${decoded.userId}`);
      });

      req.on('error', () => {
        clearInterval(heartbeat);
        sseHub.unregisterClient(clientKey);
        res.end();
      });

      res.on('error', () => {
        clearInterval(heartbeat);
        sseHub.unregisterClient(clientKey);
        res.end();
      });

    } catch (error) {
      console.error('[SSE] Unexpected error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /realtime/stats
   * Admin debug endpoint
   */
  router.get('/stats', (req: Request, res: Response) => {
    let token: string | undefined;

    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.slice(7);
    }

    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const decoded = verifyAccessToken(token);

      if (decoded.role !== 'admin') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const stats = sseHub.getStats();

      res.json({
        success: true,
        data: {
          ...stats,
          listenerCount: eventBus.getListenerCount(),
        },
      });

    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  return router;
}
