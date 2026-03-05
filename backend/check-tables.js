require('dotenv').config();
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });

  try {
    // Get all tables
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema='public' 
      ORDER BY table_name
    `);
    
    console.log('Tables in database:');
    tables.rows.forEach(row => console.log('  -', row.table_name));

    // Check users table columns
    const usersCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name='users' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nUsers table columns:');
    usersCols.rows.forEach(row => console.log(`  - ${row.column_name}: ${row.data_type}`));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
