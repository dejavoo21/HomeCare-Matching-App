require('dotenv').config();
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });

  try {
    const result = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      ['onboarding@sochristventures.com']
    );

    if (result.rows.length === 0) {
      console.log('User not found');
    } else {
      const user = result.rows[0];
      console.log(`Email: ${user.email}`);
      console.log(`ID: ${user.id}`);
      console.log(`Password hash: ${user.password_hash}`);
    }

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
