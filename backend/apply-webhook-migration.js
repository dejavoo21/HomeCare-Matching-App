require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
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

    // Check if webhook migration already applied
    const applied = await pool.query(
      'SELECT id FROM schema_migrations WHERE id = $1',
      ['013_webhook_jobs']
    );

    if (applied.rows.length > 0) {
      console.log('✅ 013_webhook_jobs migration already applied');
    } else {
      // Apply the migration
      const sql = fs.readFileSync(
        path.join(__dirname, 'src', 'migrations', '013_webhook_jobs.sql'), 
        'utf-8'
      );
      
      console.log('⏳ Applying 013_webhook_jobs migration...');
      await pool.query(sql);
      await pool.query(
        'INSERT INTO schema_migrations (id) VALUES ($1)',
        ['013_webhook_jobs']
      );
      console.log('✅ Applied webhook_jobs migration');
    }

    // Verify tables exist
    const tableCheck = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema='public' AND table_name IN ('webhook_jobs', 'webhook_dead_letters')
      ORDER BY table_name
    `);
    
    console.log('\nWebhook tables:');
    if (tableCheck.rows.length === 0) {
      console.log('❌ Tables do not exist!');
    } else {
      tableCheck.rows.forEach(row => {
        console.log(`  ✅ ${row.table_name}`);
      });
    }

    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

applyMigration();
