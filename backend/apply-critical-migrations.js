require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function applyCriticalMigrations() {
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

    const files = ['015_user_mfa_totp.sql', '016_webhook_integration.sql'];

    for (const file of files) {
      const migrationId = file.replace('.sql', '');
      const sqlPath = path.join(__dirname, 'src', 'migrations', file);
      const sql = fs.readFileSync(sqlPath, 'utf8');

      console.log(`Applying ${file}...`);
      await pool.query(sql);
      await pool.query(
        `INSERT INTO schema_migrations (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
        [migrationId]
      );
      console.log(`Applied ${file}`);
    }

    const check = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('user_mfa_totp', 'webhook_deliveries')
      ORDER BY table_name
    `);

    console.log('Tables present:', check.rows.map((r) => r.table_name).join(', '));
    await pool.end();
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

applyCriticalMigrations();
