// ============================================================================
// MIGRATION RUNNER
// ============================================================================
// Reads SQL migration files from src/migrations/ and tracks applied migrations
// in schema_migrations table.

// Load environment variables first
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
  try {
    // Always drop and recreate - ensures correct schema (VARCHAR not UUID)
    console.log('🔄 Ensuring schema_migrations table with correct VARCHAR schema...');
    await pool.query('DROP TABLE IF EXISTS schema_migrations CASCADE;');
    
    await pool.query(`
      CREATE TABLE schema_migrations (
        id VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log('✅ schema_migrations table ready');
  } catch (err) {
    console.error('❌ Error ensuring migrations table:', err);
    throw err;
  }
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await pool.query(
    'SELECT id FROM schema_migrations ORDER BY applied_at'
  );
  return new Set(result.rows.map((row) => row.id));
}

function loadMigrations(): Migration[] {
  // Find migrations directory relative to this file
  // At runtime: __dirname is dist/migrations
  // We need to look in src/migrations (source) since SQL files aren't copied to dist
  const compiledPath = __dirname;
  const srcPath = path.join(__dirname, '../../src/migrations');
  const migrationsDir = fs.existsSync(srcPath) ? srcPath : compiledPath;

  if (!fs.existsSync(migrationsDir)) {
    console.log('📁 Migrations directory does not exist. Creating it...');
    fs.mkdirSync(migrationsDir, { recursive: true });
    return [];
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  return files.map((filename) => {
    const sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf-8');
    const id = filename.replace('.sql', '');
    return { id, filename, sql };
  });
}

export async function runMigrations(): Promise<void> {
  try {
    console.log('🚀 Starting migrations...');

    await ensureMigrationsTable();
    const applied = await getAppliedMigrations();
    const migrations = loadMigrations();

    if (migrations.length === 0) {
      console.log('✅ No migrations to run');
      return;
    }

    const pending = migrations.filter((m) => !applied.has(m.id));

    if (pending.length === 0) {
      console.log('✅ All migrations already applied');
      return;
    }

    console.log(`📋 Found ${pending.length} pending migration(s)`);

    for (const migration of pending) {
      try {
        console.log(`  ⏳ Applying: ${migration.filename}`);
        await pool.query(migration.sql);
        await pool.query(
          'INSERT INTO schema_migrations (id) VALUES ($1)',
          [migration.id]
        );
        console.log(`  ✅ Applied: ${migration.filename}`);
      } catch (err) {
        console.error(`❌ Failed to apply ${migration.filename}:`, err);
        throw err;
      }
    }

    console.log('✅ All migrations applied successfully');
  } catch (err) {
    console.error('❌ Migration runner error:', err);
    throw err;
  }
  // NOTE: Do NOT close the pool here - server needs it for requests
}

// Run if called directly
if (require.main === module) {
  runMigrations().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
