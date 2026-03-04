#!/usr/bin/env node

/**
 * Setup demo users with RBAC roles
 * Run: npx ts-node src/scripts/setup-demo-roles.ts
 */

import { pool } from '../db';

async function setupDemoRoles() {
  console.log('🔐 Setting up demo user roles...\n');

  try {
    // Get demo users
    const usersRes = await pool.query('SELECT id, email, role FROM users LIMIT 20');
    const users = usersRes.rows;

    if (users.length === 0) {
      console.log('❌ No users found. Please create users first.');
      process.exit(1);
    }

    console.log(`Found ${users.length} users. Assigning roles...\n`);

    for (const user of users) {
      const email = String(user.email).toLowerCase();
      let roleCode = user.role; // Default: use existing role

      // Map by email for demo accounts
      if (email.includes('admin')) roleCode = 'admin';
      else if (email.includes('dispatcher')) roleCode = 'dispatcher';
      else if (email.includes('auditor')) roleCode = 'auditor';
      else if (email.includes('nurse')) roleCode = 'nurse';
      else if (email.includes('doctor')) roleCode = 'doctor';
      else if (email.includes('client')) roleCode = 'client';

      // Assign role
      await pool.query(
        `INSERT INTO user_roles (user_id, role_code)
         VALUES ($1, $2)
         ON CONFLICT (user_id, role_code) DO NOTHING`,
        [user.id, roleCode]
      );

      // Get permissions for this role
      const permsRes = await pool.query(
        `SELECT permission_code FROM role_permissions WHERE role_code = $1`,
        [roleCode]
      );

      const permissions = permsRes.rows.map((r: any) => r.permission_code);

      console.log(`✓ ${user.email}`);
      console.log(`  Role: ${roleCode}`);
      console.log(`  Permissions: ${permissions.length > 0 ? permissions.join(', ') : '(none)'}`);
      console.log('');
    }

    console.log('✅ Demo roles setup complete!\n');
    console.log('Demo Credentials:');
    console.log('- Admin: admin@homecare.local / password');
    console.log('- Dispatcher: dispatcher@homecare.local / password');
    console.log('- Nurse: nurse@homecare.local / password');
    console.log(''); console.log('Note: All logins now require OTP verification.');
    console.log('OTP codes are sent to notification_outbox.\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Setup failed:', err);
    process.exit(1);
  }
}

setupDemoRoles();
