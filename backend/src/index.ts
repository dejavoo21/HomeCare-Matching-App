import * as dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

import { validateEnv } from './config/env';
import { logger } from './utils/logger';

// Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import requestRoutes, { setupPostgresRoutes as setupRequestsPostgres } from './routes/requests';
import visitRoutes, { setupPostgresVisitRoutes } from './routes/visits';
import { createAdminRouter } from './routes/admin';
import { createAssistantRouter } from './routes/assistant';
import { createFhirRouter } from './routes/fhir';
import { createIntegrationsRouter } from './routes/integrations';
import { createAuthPhase4Router } from './routes/auth-phase4';
import { createAccessRequestRouter } from './routes/access-request';
import { createAuditRouter } from './routes/audit';
import { createMfaRouter } from './routes/mfa.routes';
import { createAnalyticsRouter } from './routes/analytics.routes';
import { createWebhookAdminRouter } from './routes/webhook-admin.routes';
import { createConnectedSystemsRouter } from './routes/connected-systems.routes';
import { createOpsRouter } from './routes/ops.routes';

// Migrations
import { runMigrations } from './migrations/runner';

// Phase 2 Routes
import { availabilityRouter } from './routes/availability';
import { matchingRouter } from './routes/matching';
import { createRealtimeRoutes } from './routes/realtime.routes';
import { startWebhookWorker } from './integrations/webhook-worker';

// Monitoring
import { httpRequestDurationMs, httpRequestsTotal, getMetrics, getMetricsContentType } from './monitoring/metrics';

// Database
import { pool } from './db';

validateEnv();

const app: Express = express();
const PORT = parseInt(process.env.PORT || '6005', 10);
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: Function) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    httpRequestDurationMs.observe({ method: req.method, route: req.path, status: res.statusCode }, duration);
    httpRequestsTotal.inc({ method: req.method, route: req.path, status: res.statusCode });
    logger.info('HTTP request', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: duration,
    });
  });

  next();
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

app.use('/auth', authLimiter);

// Operational routes
app.use('/', createOpsRouter(pool));

app.get('/metrics', async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', getMetricsContentType());
    res.end(await getMetrics());
  } catch (err: any) {
    logger.error('Metrics error', { error: err?.message });
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
});

// Frontend static (if bundled with backend image)
const frontendDistCandidates = [
  path.join(__dirname, '../public'),
  path.join(process.cwd(), 'public'),
];
const frontendDist = frontendDistCandidates.find((dir) => fs.existsSync(dir));
const shouldServeBundledFrontend = !process.env.FRONTEND_URL && !!frontendDist;

if (shouldServeBundledFrontend && frontendDist) {
  app.use(express.static(frontendDist));
  logger.info('Frontend static middleware enabled', { frontendDist });
} else {
  logger.warn('Bundled frontend static middleware disabled', {
    frontendDistFound: !!frontendDist,
    frontendUrlConfigured: !!process.env.FRONTEND_URL,
  });
}

// Setup PostgreSQL-backed routes
setupRequestsPostgres(pool);
setupPostgresVisitRoutes(pool);

// API routes
app.use('/auth', authRoutes);
app.use('/auth/phase4', createAuthPhase4Router(pool));
app.use('/access', createAccessRequestRouter(pool));
app.use('/audit', createAuditRouter(pool));
app.use('/mfa', createMfaRouter(pool));
app.use('/analytics', createAnalyticsRouter(pool));
app.use('/webhooks/admin', createWebhookAdminRouter(pool));
app.use('/connected-systems', createConnectedSystemsRouter(pool));
app.use('/users', userRoutes);
app.use('/requests', requestRoutes);
app.use('/visits', visitRoutes);
app.use('/admin', createAdminRouter(pool));
app.use('/assistant', createAssistantRouter(pool));
app.use('/fhir', createFhirRouter(pool));
app.use('/integrations', createIntegrationsRouter(pool));
app.use('/availability', availabilityRouter(pool));
app.use('/matching', matchingRouter(pool));
app.use('/realtime', createRealtimeRoutes(pool));

try {
  startWebhookWorker(pool);
} catch (err: any) {
  logger.warn('Webhook worker initialization failed (non-critical)', { error: err?.message });
}

const API_ROUTES = [
  '/api',
  '/auth',
  '/access',
  '/audit',
  '/mfa',
  '/analytics',
  '/webhooks',
  '/connected-systems',
  '/users',
  '/requests',
  '/visits',
  '/admin',
  '/assistant',
  '/fhir',
  '/integrations',
  '/availability',
  '/matching',
  '/realtime',
  '/health',
  '/ready',
  '/metrics',
];

const isApiRoute = (routePath: string) => API_ROUTES.some((route) => routePath.startsWith(route));

app.get('*', (req: Request, res: Response) => {
  if (isApiRoute(req.path)) {
    return res.status(404).json({
      error: 'Not found',
      path: req.path,
      method: req.method,
    });
  }

  if (process.env.FRONTEND_URL) {
    return res.redirect(302, process.env.FRONTEND_URL);
  }

  if (!frontendDist) {
    return res.status(503).json({
      error: 'Frontend bundle not available in this service',
      hint: 'Deploy frontend separately or set FRONTEND_URL',
    });
  }

  const indexPath = path.join(frontendDist, 'index.html');
  return res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({
        error: 'Not found',
        path: req.path,
        method: req.method,
      });
    }
  });
});

app.use((err: any, _req: Request, res: Response, _next: Function) => {
  logger.error('Unhandled express error', { error: err?.message, stack: err?.stack });
  res.status(500).json({ error: 'Internal server error' });
});

let server: any;

async function shutdown(signal: string) {
  logger.warn('Shutdown started', { signal });

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    await pool.end();
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (err: any) {
    logger.error('Shutdown failed', { error: err?.message });
    process.exit(1);
  }
}

async function startServer() {
  try {
    logger.info('Running database migrations');
    await runMigrations();
    logger.info('Migrations completed');

    await pool.query('SELECT 1');
    logger.info('Database connected');

    server = app.listen(PORT, '0.0.0.0', () => {
      logger.info('Server started', {
        port: PORT,
        env: process.env.NODE_ENV || 'development',
      });
    });
  } catch (err: any) {
    logger.error('Startup failed', { error: err?.message, stack: err?.stack });
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();

export default app;
