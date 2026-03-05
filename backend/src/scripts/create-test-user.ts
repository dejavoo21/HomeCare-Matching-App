import { pool } from '../db';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

async function createTestUser() {
  try {
    const email = 'onboarding@sochristventures.com';
    const password = 'test123456';
    const passwordHash = await bcrypt.hash(password, 10);

    // Use admin role already defined in UserRole enum
    const result = await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, is_active, created_at)
       VALUES (gen_random_uuid(), 'Onboarding Admin', $1, $2, 'admin', true, now())
       ON CONFLICT (email) DO UPDATE SET password_hash = $2, name = 'Onboarding Admin'
       RETURNING id, email, role`,
      [email, passwordHash]
    );

    console.log('✅ Test user created/updated:', result.rows[0]);
    console.log(`\nTest credentials:\nEmail: ${email}\nPassword: ${password}`);
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating test user:', err);
    await pool.end();
    process.exit(1);
  }
}

createTestUser();
