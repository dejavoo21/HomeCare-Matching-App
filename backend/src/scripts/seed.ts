// ============================================================================
// SEED SCRIPT
// ============================================================================
// Insert demo users for local development testing

// Load environment variables first
import * as dotenv from 'dotenv';
dotenv.config();

import { pool } from '../db';

async function seed(): Promise<void> {
  try {
    console.log('🌱 Seeding demo users...');

    // Sochrist Ventures admin user
    const adminUser = {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Sochrist Ventures Admin',
      email: 'onboarding@sochristventures.com',
      password_hash: 'hashed_password', // In production, use bcrypt
      role: 'admin',
      phone: null,
    };

    // Check if admin already exists
    const existing = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE email = $1',
      [adminUser.email]
    );

    if (existing.rows[0].count > 0) {
      console.log('✅ Admin user already exists, skipping seed');
      return;
    }

    // Delete all existing demo users (clean slate)
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['%@homecare.local']);
    await pool.query('DELETE FROM users WHERE email = $1', ['john@email.com']);
    await pool.query('DELETE FROM users WHERE email = $1', ['margaret@email.com']);
    console.log('✓ Removed all demo accounts');

    // Insert admin user
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, phone, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [adminUser.id, adminUser.name, adminUser.email, adminUser.password_hash, adminUser.role, adminUser.phone]
    );
    console.log(`✓ Created ${adminUser.role}: ${adminUser.email}`);

    console.log('\n✅ Seed completed successfully');
    console.log('\n📝 Login credentials:');
    console.log('   Admin: onboarding@sochristventures.com / V#4]eBpb)^4PJ,n?');

  } catch (err) {
    console.error('❌ Seed failed:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  seed().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export default seed;
