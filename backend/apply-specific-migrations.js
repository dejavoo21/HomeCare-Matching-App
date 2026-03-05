require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function applyMigration(pool, filename, sqlPath) {
  const migrationId = filename.replace('.sql', '');
  
  // Check if already applied
  const applied = await pool.query(
    'SELECT id FROM schema_migrations WHERE id = $1',
    [migrationId]
  );
  
  if (applied.rows.length > 0) {
    console.log(`⏭️  Skipped ${filename} (already applied)`);
    return;
  }

  try {
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    console.log(`⏳ Applying ${filename}...`);
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (id) VALUES ($1)', [migrationId]);
    console.log(`✅ Applied ${filename}`);
  } catch (err) {
    console.error(`❌ Error applying ${filename}:`, err.message);
    throw err;
  }
}

async function main() {
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
    console.log('✅ schema_migrations table ready\n');

    // Apply specific migrations in order, skipping ones that fail
    const migrationsDir = path.join(__dirname, 'src', 'migrations');
    
    // Apply only the ones we need/want
    const migrationsToApply = [
      '006_add_columns.sql',
      '007_visit_checkins.sql',
      '008_notification_outbox.sql',
      '010_refresh_tokens.sql',
      '011_event_outbox.sql'
    ];

    for (const migrationFile of migrationsToApply) {
      const fullPath = path.join(migrationsDir, migrationFile);
      if (!fs.existsSync(fullPath)) {
        console.log(`⏭️  Skipped ${migrationFile} (file not found)`);
        continue;
      }
      
      try {
        await applyMigration(pool, migrationFile, fullPath);
      } catch (err) {
        console.log(`\n⚠️  Continuing despite error in ${migrationFile}\n`);
        // Continue to next migration
      }
    }

    console.log('\n📝 Migration process completed');
    await pool.end();
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  }
}

main();
