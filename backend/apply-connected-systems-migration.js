require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function applyConnectedSystemsMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationId = '017_connected_systems';
    const already = await pool.query('SELECT id FROM schema_migrations WHERE id = $1', [migrationId]);

    if (already.rows.length > 0) {
      console.log(`${migrationId} already tracked`);
      return;
    }

    const sqlPath = path.join(__dirname, 'src', 'migrations', `${migrationId}.sql`);
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (id) VALUES ($1) ON CONFLICT (id) DO NOTHING', [migrationId]);
    console.log(`Applied ${migrationId}`);
  } catch (err) {
    console.error('Migration apply error:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

applyConnectedSystemsMigration();
