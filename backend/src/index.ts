// ============================================================================
// MAIN SERVER FILE
// ============================================================================

// Load environment variables first
import * as dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Pool } from 'pg';

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

// Migrations
import { runMigrations } from './migrations/runner';

// Phase 2 Routes (require database pool)
import { availabilityRouter } from './routes/availability';
import { matchingRouter } from './routes/matching';
import { createRealtimeRoutes } from './routes/realtime.routes';
import { startRealtimeRelay } from './realtime/eventRelay';
import { startWebhookWorker } from './integrations/webhook-worker';
import { startOutboxWorker } from './workers/outbox.worker';
import { startNotificationWorker } from './workers/notification.worker';

// Monitoring
import { httpRequestDurationMs, httpRequestsTotal, getMetrics, getMetricsContentType } from './monitoring/metrics';

// Database
import { pool, checkDbHealth } from './db';

const app: Express = express();
const PORT = parseInt(process.env.PORT || '6005', 10);

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Configure CORS for development and production
app.use(
  cors({
    origin: ['https://beneficial-solace-production-0743.up.railway.app', 'http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Metrics middleware: track request duration and count
app.use((req: Request, res: Response, next: Function) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    httpRequestDurationMs.observe({ method: req.method, route: req.path, status: res.statusCode }, duration);
    httpRequestsTotal.inc({ method: req.method, route: req.path, status: res.statusCode });
  });

  next();
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', async (req: Request, res: Response) => {
  try {
    const dbHealth = await checkDbHealth();
    res.json({
      status: 'ok',
      database: dbHealth ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      error: 'Database health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================================
// PROMETHEUS METRICS
// ============================================================================

app.get('/metrics', async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', getMetricsContentType());
    res.end(await getMetrics());
  } catch (err) {
    console.error('Metrics error:', err);
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
});

// ============================================================================
// SERVE FRONTEND STATIC FILES
// ============================================================================

// Serve frontend static files in production
import path from 'path';
const frontendDist = path.join(__dirname, '../../../frontend/dist');
try {
  app.use(express.static(frontendDist));
  console.log(`📁 Serving frontend static files from: ${frontendDist}`);
} catch (err) {
  console.warn('⚠️ Frontend static files not available (expected in development)');
}

// ============================================================================
// SETUP POSTGRESQL ROUTES (BEFORE MOUNTING)
// ============================================================================

// Setup PostgreSQL routes for requests and visits BEFORE mounting routers
setupRequestsPostgres(pool);
setupPostgresVisitRoutes(pool);

// ============================================================================
// API ROUTES (MVP - In-Memory)
// ============================================================================

app.use('/auth', authRoutes);
app.use('/auth/phase4', createAuthPhase4Router(pool));
app.use('/access', createAccessRequestRouter(pool));
app.use('/audit', createAuditRouter(pool));
app.use('/mfa', createMfaRouter(pool));
app.use('/analytics', createAnalyticsRouter(pool));
app.use('/webhooks/admin', createWebhookAdminRouter(pool));
app.use('/users', userRoutes);
app.use('/requests', requestRoutes);
app.use('/visits', visitRoutes);
app.use('/admin', createAdminRouter(pool));
app.use('/assistant', createAssistantRouter(pool));
app.use('/fhir', createFhirRouter(pool));
app.use('/integrations', createIntegrationsRouter(pool));

// ============================================================================
// API ROUTES (Phase 2 - PostgreSQL)
// ============================================================================

app.use('/availability', availabilityRouter(pool));
app.use('/matching', matchingRouter(pool));
app.use('/realtime', createRealtimeRoutes(pool));

// Start realtime relay (worker writes to DB, API broadcasts to SSE)
// TODO: Fix pool connection issues with workers
// startRealtimeRelay(pool);

// Start webhook delivery worker (processes queued webhooks)
startWebhookWorker(pool);

// Start outbox worker (processes transaction-safe events)
// startOutboxWorker(pool);

// Start notification worker (processes email queue)
// startNotificationWorker(pool);

// ============================================================================
// SPA FALLBACK - Serve frontend index.html for all non-API routes
// ============================================================================

app.get('*', (req: Request, res: Response) => {
  // Don't redirect API calls (they should 404)
  if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path.startsWith('/access') || 
      req.path.startsWith('/audit') || req.path.startsWith('/mfa') || req.path.startsWith('/analytics') ||
      req.path.startsWith('/webhooks') || req.path.startsWith('/users') || req.path.startsWith('/requests') ||
      req.path.startsWith('/visits') || req.path.startsWith('/admin') || req.path.startsWith('/assistant') ||
      req.path.startsWith('/fhir') || req.path.startsWith('/integrations') || req.path.startsWith('/availability') ||
      req.path.startsWith('/matching') || req.path.startsWith('/realtime') || req.path.startsWith('/health') ||
      req.path.startsWith('/metrics')) {
    return res.status(404).json({
      error: 'Not found',
      path: req.path,
      method: req.method,
    });
  }
  
  // Serve index.html for SPA routing
  const indexPath = path.join(frontendDist, 'index.html');
  try {
    res.sendFile(indexPath);
  } catch (err) {
    res.status(404).json({
      error: 'Not found',
      path: req.path,
      method: req.method,
    });
  }
});

// ============================================================================
// 404 HANDLER
// ============================================================================

app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method,
  });
});

// ============================================================================
// START SERVER
// ============================================================================

async function startServer() {
  try {
    console.log('📦 Running database migrations...');
    await runMigrations();
    console.log('✅ Migrations completed');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Homecare Matching App server running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Metrics: http://localhost:${PORT}/metrics`);
    console.log(`   API: http://localhost:${PORT}/requests`);
    console.log(`   Database: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'In-Memory'}`);
  });

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, cleaning up...');
    server.close(async () => {
      console.log('Server closed');
      try {
        await pool.end();
        console.log('Database connections closed');
      } catch (err) {
        console.error('Error closing database connections:', err);
      }
      process.exit(0);
    });
  });

  process.on('SIGINT', async () => {
    console.log('\nSIGINT received, cleaning up...');
    server.close(async () => {
      console.log('Server closed');
      try {
        await pool.end();
        console.log('Database connections closed');
      } catch (err) {
        console.error('Error closing database connections:', err);
      }
      process.exit(0);
    });
  });
}

startServer();

export default app;
