require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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

    // Check if refresh_tokens migration already applied
    const applied = await pool.query(
      'SELECT id FROM schema_migrations WHERE id = $1',
      ['010_refresh_tokens']
    );

    if (applied.rows.length > 0) {
      console.log('✅ refresh_tokens migration already applied');
      
      // Check if table exists
      const tableCheck = await pool.query(`
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema='public' AND table_name='refresh_tokens'
      `);
      
      if (tableCheck.rows[0].count > 0) {
        console.log('✅ refresh_tokens table exists');
      } else {
        console.log('⚠️  Migration marked as applied but table missing - applying migration anyway');
        const sql = fs.readFileSync(
          path.join(__dirname, 'sql', 'schema-refresh-tokens.sql'), 
          'utf-8'
        );
        await pool.query(sql);
        console.log('✅ Applied refresh_tokens migration');
      }
    } else {
      // Apply the migration
      const sql = fs.readFileSync(
        path.join(__dirname, 'sql', 'schema-refresh-tokens.sql'), 
        'utf-8'
      );
      
      console.log('⏳ Applying refresh_tokens migration...');
      await pool.query(sql);
      await pool.query(
        'INSERT INTO schema_migrations (id) VALUES ($1)',
        ['010_refresh_tokens']
      );
      console.log('✅ Applied refresh_tokens migration');
    }

    // Verify table exists and has correct structure
    const tableCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name='refresh_tokens'
      ORDER BY ordinal_position
    `);
    
    console.log('\nrefresh_tokens table columns:');
    if (tableCheck.rows.length === 0) {
      console.log('❌ Table does not exist!');
    } else {
      tableCheck.rows.forEach(row => {
        console.log(`  ✅ ${row.column_name}: ${row.data_type}`);
      });
    }

    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
