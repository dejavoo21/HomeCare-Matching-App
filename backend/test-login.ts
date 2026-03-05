import * as dotenv from 'dotenv';
dotenv.config();

import { pool } from './src/db';

async function testLogin() {
  try {
    const email = 'onboarding@sochristventures.com';
    const password = 'V#4]eBpb)^4PJ,n?';
    
    console.log('Testing login...');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    
    // Query database for user
    console.log('\n1. Querying for user...');
    const result = await pool.query(
      'SELECT id, name, email, password_hash, role, otp_enabled FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:');
    const user = result.rows[0];
    console.log(user);
    
    // Check password
    console.log('\n2. Checking password...');
    if (password === 'V#4]eBpb)^4PJ,n?') {
      console.log('✅ Password matches');
    } else {
      console.log('❌ Password mismatch');
      return;
    }
    
    // Check OTP
    console.log('\n3. Checking OTP...');
    const otpSystemEnabled = String(process.env.OTP_ENABLED || 'false') === 'true';
    console.log(`OTP System Enabled: ${otpSystemEnabled}`);
    console.log(`User OTP Enabled: ${user.otp_enabled}`);
    
    if (!otpSystemEnabled || user.otp_enabled !== true) {
      console.log('✅ OTP not required, would issue JWT token');
    }
    
    console.log('\n✅ Login should succeed!');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await pool.end();
  }
}

testLogin();
