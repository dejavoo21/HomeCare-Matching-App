/**
 * Real-time SSE routes
 */

import express, { Router, Request, Response } from 'express';
import type { Pool } from 'pg';
import { sseHub } from '../realtime/sseHub';
import { eventBus } from '../realtime/eventBus';
import { verifyAccessToken } from '../utils/jwt';

export function createRealtimeRoutes(pool: Pool): Router {
  const router = Router();

  /**
   * GET /realtime/stream
   * SSE endpoint for real-time updates
   * Phase 4: Authenticates from HttpOnly cookie (preferred)
   * Fallback: query param (?token=JWT) or Authorization header (Bearer JWT)
   */
  router.get('/stream', (req: Request, res: Response) => {
    try {
      // Phase 4: Try HttpOnly cookie first
      let token = req.cookies?.accessToken as string | undefined;

      // Fallback: Try query param (for backward compatibility)
      if (!token) {
        token = req.query.token as string | undefined;
      }

      // Fallback: Try Authorization header
      if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.slice(7);
        }
      }

      if (!token) {
        res.status(401).json({ error: 'Unauthorized: token required' });
        return;
      }

      // Verify JWT token properly
      let decoded: { userId: string; role: string; email: string };
      try {
        decoded = verifyAccessToken(token);
      } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Register client with SSE hub (returns unique key for cleanup)
      const clientKey = sseHub.registerClient(decoded.userId, decoded.role as any, res);

      // Handle disconnect with proper cleanup
      req.on('close', () => {
        sseHub.unregisterClient(clientKey);
      });

      // Handle errors
      req.on('error', () => {
        console.log(`[SSE] Request error for ${decoded.userId}`);
        sseHub.unregisterClient(clientKey);
        res.end();
      });

      res.on('error', () => {
        console.log(`[SSE] Response error for ${decoded.userId}`);
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
   * Admin endpoint to check SSE hub status
   */
  router.get('/stats', (req: Request, res: Response) => {
    // Require admin or auth
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const token = authHeader.slice(7);
      const tokenStr = Buffer.from(token, 'base64').toString('utf-8');
      const decoded = JSON.parse(tokenStr);

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
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  return router;
}
