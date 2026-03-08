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
    const sqlPath = path.join(__dirname, 'sql', 'seeds', 'master_seed.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);

    const counts = await pool.query(`
      SELECT
        (SELECT count(*) FROM users WHERE email LIKE '%@homecare.local') AS users_seeded,
        (SELECT count(*) FROM care_requests WHERE id::text LIKE '10000000-%') AS care_requests_seeded,
        (SELECT count(*) FROM visit_assignments WHERE id::text LIKE '20000000-%') AS visit_assignments_seeded,
        (SELECT count(*) FROM access_requests WHERE id::text LIKE '30000000-%') AS access_requests_seeded,
        (SELECT count(*) FROM audit_events WHERE id::text LIKE '40000000-%') AS audit_events_seeded,
        (SELECT count(*) FROM connected_systems WHERE id::text LIKE '50000000-%') AS connected_systems_seeded,
        (SELECT count(*) FROM webhook_subscriptions WHERE id::text LIKE '60000000-%') AS webhook_subscriptions_seeded,
        (SELECT count(*) FROM webhook_deliveries WHERE id::text LIKE '70000000-%') AS webhook_deliveries_seeded,
        (SELECT count(*) FROM webhook_dead_letters WHERE id::text LIKE '80000000-%') AS webhook_dead_letters_seeded
    `);

    console.log('Master seed applied:', counts.rows[0]);
  } catch (err) {
    console.error('Master seed error:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
