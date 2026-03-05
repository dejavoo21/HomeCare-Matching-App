require('dotenv').config();
const { Pool } = require('pg');

async function checkTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });

  try {
    const result = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'refresh_tokens'"
    );

    if (result.rows.length > 0) {
      console.log('✅ refresh_tokens table EXISTS');
      const cols = await pool.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'refresh_tokens'"
      );
      console.log('Columns:', cols.rows.map(r => r.column_name).join(', '));
    } else {
      console.log('❌ refresh_tokens table DOES NOT EXIST');
    }
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkTable();
