require('dotenv').config();
const { Pool } = require('pg');

async function testLogin() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });

  try {
    // 1. Check user exists
    const userResult = await pool.query(
      'SELECT id, name, email, password_hash, role, otp_enabled FROM users WHERE email = $1',
      ['onboarding@sochristventures.com']
    );

    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found');
    const user = userResult.rows[0];
    console.log(`  - ID: ${user.id}`);
    console.log(`  - Email: ${user.email}`);
    console.log(`  - Role: ${user.role}`);
    console.log(`  - Password hash: ${user.password_hash}`);

    // 2. Check refresh_tokens table exists
    const tableResult = await pool.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema='public' AND table_name='refresh_tokens'
    `);

    if (tableResult.rows[0].count === 0) {
      console.log('❌ refresh_tokens table does not exist');
      return;
    }

    console.log('✅ refresh_tokens table exists');

    // 3. Try to insert a test refresh token
    const testTokenHash = 'test-hash-' + Date.now();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    try {
      await pool.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, testTokenHash, expiresAt, 'test-agent', 'test-ip']
      );
      console.log('✅ Successfully inserted test token into refresh_tokens');

      // Clean up test token
      await pool.query(
        'DELETE FROM refresh_tokens WHERE token_hash = $1',
        [testTokenHash]
      );
    } catch (innerErr) {
      console.error('❌ Failed to insert into refresh_tokens:', innerErr.message);
      return;
    }

    // 4. Check JWT environment variables
    console.log('\n✅ JWT Configuration:');
    console.log(`  - ACCESS_TOKEN_TTL_MIN: ${process.env.ACCESS_TOKEN_TTL_MIN || 15}`);
    console.log(`  - REFRESH_TOKEN_TTL_DAYS: ${process.env.REFRESH_TOKEN_TTL_DAYS || 14}`);
    console.log(`  - JWT_ACCESS_SECRET: ${process.env.JWT_ACCESS_SECRET ? '✅ SET' : '❌ NOT SET'}`);
    console.log(`  - JWT_REFRESH_SECRET: ${process.env.JWT_REFRESH_SECRET ? '✅ SET' : '❌ NOT SET'}`);

    console.log('\n✅ All checks passed - ready for login');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

testLogin();
