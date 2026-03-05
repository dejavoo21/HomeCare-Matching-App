require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });

  try {
    // Ensure migrations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ schema_migrations table ready');

    // Get applied migrations
    const applied = await pool.query(
      'SELECT id FROM schema_migrations ORDER BY applied_at'
    );
    const appliedSet = new Set(applied.rows.map(r => r.id));

    // Load migration files
    const migrationsDir = path.join(__dirname, 'src', 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const id = file.replace('.sql', '');
      if (!appliedSet.has(id)) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        console.log(`⏳ Applying ${file}...`);
        await pool.query(sql);
        await pool.query('INSERT INTO schema_migrations (id) VALUES ($1)', [id]);
        console.log(`✅ Applied ${file}`);
      }
    }

    console.log('\n📝 All migrations completed');
    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

runMigrations();
