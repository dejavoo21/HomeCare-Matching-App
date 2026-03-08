require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function applySeeds() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  const files = [
    'seed_connected_systems.sql',
    'seed_webhook_subscriptions.sql',
    'seed_webhook_deliveries.sql',
    'seed_webhook_dead_letters.sql',
  ];

  try {
    for (const file of files) {
      const sqlPath = path.join(__dirname, 'sql', 'seeds', file);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      console.log(`Applying ${file}...`);
      await pool.query(sql);
      console.log(`Applied ${file}`);
    }

    const counts = await pool.query(`
      SELECT
        (SELECT count(*) FROM connected_systems) AS connected_systems,
        (SELECT count(*) FROM webhook_subscriptions) AS webhook_subscriptions,
        (SELECT count(*) FROM webhook_deliveries) AS webhook_deliveries,
        (SELECT count(*) FROM webhook_dead_letters) AS webhook_dead_letters
    `);
    console.log('Seed counts:', counts.rows[0]);
  } catch (err) {
    console.error('Seed error:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

applySeeds();
