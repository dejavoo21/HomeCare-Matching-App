// ============================================================================
// SEED SCRIPT
// ============================================================================
// Insert demo users for local development testing

// Load environment variables first
import * as dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

// Create a separate pool instance for seeding (don't use the shared pool!)
const seedPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'development' ? false : { rejectUnauthorized: false }
});

async function seed(): Promise<void> {
  try {
    console.log('🌱 Seeding demo users...');

    // Sochrist Ventures admin user
    const adminUser = {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Admin User',
      email: 'onboarding@sochristventures.com',
      password_hash: 'V#4]eBpb)^4PJ,n?', // The same password checked in login route
      role: 'admin',
      phone: null,
    };

    // Check if admin already exists
    const existing = await seedPool.query(
      'SELECT COUNT(*) as count FROM users WHERE email = $1',
      [adminUser.email]
    );

    if (existing.rows[0].count > 0) {
      console.log('✅ Admin user already exists, skipping seed');
      return;
    }

    // Delete all existing demo users (clean slate)
    await seedPool.query('DELETE FROM users WHERE email LIKE $1', ['%@homecare.local']);
    await seedPool.query('DELETE FROM users WHERE email = $1', ['john@email.com']);
    await seedPool.query('DELETE FROM users WHERE email = $1', ['margaret@email.com']);
    console.log('✓ Removed all demo accounts');

    // Insert admin user
    await seedPool.query(
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
    await seedPool.end();
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
