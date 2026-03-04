// ============================================================================
// DATABASE CONNECTION & POOL MANAGEMENT
// ============================================================================
// Connects to PostgreSQL using DATABASE_URL with conditional SSL support
// - Local dev: SSL disabled
// - Production (Railway, etc): SSL enabled with rejectUnauthorized=false

// Load environment variables first
import * as dotenv from 'dotenv';
dotenv.config();

import { Pool, PoolClient } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const isDev = process.env.NODE_ENV !== 'production';
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const validDatabaseUrl: string = databaseUrl;

// ============================================================================
// SSL CONFIGURATION
// ============================================================================

interface PoolConfig {
  connectionString: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
}

function getPoolConfig(): PoolConfig {
  const config: PoolConfig = {
    connectionString: validDatabaseUrl,
  };

  if (isDev) {
    // Local development: no SSL
    config.ssl = false;
  } else {
    // Production: SSL enabled, but allow self-signed certs (common in Railway)
    config.ssl = {
      rejectUnauthorized: false,
    };
  }

  return config;
}

// ============================================================================
// POOL INITIALIZATION
// ============================================================================

export const pool = new Pool(getPoolConfig());

// Log pool events
pool.on('connect', () => {
  console.log('✅ Database pool connected');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client:', err);
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

export async function checkDbHealth(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT NOW()');
    return !!result.rows[0];
  } catch (err) {
    console.error('Database health check failed:', err);
    return false;
  }
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

export async function query<T = any>(
  sql: string,
  values?: any[]
): Promise<T[]> {
  const result = await pool.query(sql, values);
  return result.rows as T[];
}

export async function queryOne<T = any>(
  sql: string,
  values?: any[]
): Promise<T | null> {
  const result = await pool.query(sql, values);
  return (result.rows[0] as T) || null;
}

export async function execute(sql: string, values?: any[]): Promise<number> {
  const result = await pool.query(sql, values);
  return result.rowCount || 0;
}

// ============================================================================
// TRANSACTION HELPER
// ============================================================================

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

export async function closePool(): Promise<void> {
  await pool.end();
  console.log('✅ Database pool closed');
}
