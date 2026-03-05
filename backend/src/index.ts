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

// Migrations
import { runMigrations } from './migrations/runner';

// Phase 2 Routes (require database pool)
import { availabilityRouter } from './routes/availability';
import { matchingRouter } from './routes/matching';
import { createRealtimeRoutes } from './routes/realtime.routes';
import { startRealtimeRelay } from './realtime/eventRelay';
import { startWebhookWorker } from './workers/webhook.worker';
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

app.use(cors());
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
// TEMPORARY: SEED TEST USER ENDPOINT
// ============================================================================
// This endpoint is temporary for testing purposes only
// TODO: Remove this endpoint after testing

app.post('/seed-test-user', async (req: Request, res: Response) => {
  try {
    const bcrypt = require('bcrypt');
    const email = 'onboarding@sochristventures.com';
    const password = 'test123456';
    const passwordHash = await bcrypt.hash(password, 10);

    // First, ensure all required tables exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'client', 'nurse', 'doctor')),
        phone VARCHAR(20),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create refresh_tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        revoked BOOLEAN DEFAULT false,
        expires_at TIMESTAMPTZ NOT NULL,
        user_agent TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create audit_events table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100),
        entity_id VARCHAR(100),
        metadata JSONB,
        severity VARCHAR(20) DEFAULT 'info',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    const result = await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, is_active, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Onboarding Admin', $1, $2, 'admin', true, now(), now())
       ON CONFLICT (email) DO UPDATE SET password_hash = $2, name = 'Onboarding Admin', updated_at = now()
       RETURNING id, email, role, is_active`,
      [email, passwordHash]
    );

    res.json({
      success: true,
      message: 'Test user created/updated and tables verified',
      user: result.rows[0],
      credentials: { email, password }
    });
  } catch (err) {
    console.error('Error creating test user:', err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create test user'
    });
  }
});

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
// startWebhookWorker(pool);

// Start outbox worker (processes transaction-safe events)
// startOutboxWorker(pool);

// Start notification worker (processes email queue)
// startNotificationWorker(pool);

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
