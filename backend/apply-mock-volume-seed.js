require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    const sqlPath = path.join(__dirname, 'sql', 'seeds', 'mock_volume_seed.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);

    const summary = await pool.query(`
      SELECT
        (SELECT count(*) FROM users WHERE email LIKE '%@homecare.local') AS users_homecare_local,
        (SELECT count(*) FROM care_requests WHERE id::text LIKE '10000000-%') AS seeded_requests,
        (SELECT count(*) FROM care_requests WHERE status = 'queued') AS queued_count,
        (SELECT count(*) FROM care_requests WHERE status = 'offered') AS offered_count,
        (SELECT count(*) FROM care_requests WHERE status = 'accepted') AS accepted_count,
        (SELECT count(*) FROM care_requests WHERE status = 'enroute') AS enroute_count,
        (SELECT count(*) FROM care_requests WHERE status = 'completed') AS completed_count,
        (SELECT count(*) FROM care_requests WHERE status = 'cancelled') AS cancelled_count
    `);

    console.log('Mock volume seed applied:', summary.rows[0]);
  } catch (err) {
    console.error('Mock volume seed error:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
