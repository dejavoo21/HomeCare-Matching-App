require('dotenv').config();
const { Pool } = require('pg');

async function checkUser() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });

  try {
    const result = await pool.query(
      'SELECT id, name, email, role FROM users WHERE email = $1',
      ['onboarding@sochristventures.com']
    );

    if (result.rows.length === 0) {
      console.log('❌ User NOT found');
    } else {
      console.log('✅ User found:');
      console.log(JSON.stringify(result.rows[0], null, 2));
    }
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkUser();
