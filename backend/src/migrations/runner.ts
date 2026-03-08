import * as dotenv from 'dotenv';
dotenv.config();

import { pool } from '../db';
import * as fs from 'fs';
import * as path from 'path';

interface Migration {
  id: string;
  filename: string;
  sql: string;
}

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await pool.query('SELECT id FROM schema_migrations ORDER BY applied_at');
  return new Set(result.rows.map((row) => row.id as string));
}

function loadMigrations(): Migration[] {
  const compiledPath = __dirname;
  const srcPath = path.join(__dirname, '../../src/migrations');
  const migrationsDir = fs.existsSync(srcPath) ? srcPath : compiledPath;

  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
    return [];
  }

  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((filename) => {
      const sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf-8');
      const id = filename.replace('.sql', '');
      return { id, filename, sql };
    });
}

export async function runMigrations(): Promise<void> {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();
  const migrations = loadMigrations();
  const pending = migrations.filter((m) => !applied.has(m.id));

  for (const migration of pending) {
    try {
      await pool.query(migration.sql);
    } catch (err: any) {
      // Legacy environments may already have schema objects that predate schema_migrations tracking.
      // Treat duplicate object errors as idempotent so startup can proceed.
      const duplicateObjectCodes = new Set(['42P07', '42710', '42P16']);
      if (!duplicateObjectCodes.has(err?.code)) {
        throw err;
      }
    }

    await pool.query('INSERT INTO schema_migrations (id) VALUES ($1) ON CONFLICT (id) DO NOTHING', [migration.id]);
  }
}

if (require.main === module) {
  runMigrations().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
