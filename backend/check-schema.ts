import * as dotenv from 'dotenv';
dotenv.config();

import { pool } from './src/db';

async function checkSchema() {
  try {
    console.log('Checking database schema...\n');
    
    // Check users table
    console.log('1. Checking users table:');
    const usersResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
    if (usersResult.rows.length > 0) {
      console.log('✅ users table exists');
      usersResult.rows.slice(0, 5).forEach(r => console.log(`   - ${r.column_name}: ${r.data_type}`));
    } else {
      console.log('❌ users table does NOT exist');
    }
    
    // Check refresh_tokens table
    console.log('\n2. Checking refresh_tokens table:');
    const rtResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'refresh_tokens'
      ORDER BY ordinal_position;
    `);
    if (rtResult.rows.length > 0) {
      console.log('✅ refresh_tokens table exists');
      rtResult.rows.forEach(r => console.log(`   - ${r.column_name}: ${r.data_type}`));
    } else {
      console.log('❌ refresh_tokens table does NOT exist');
    }
    
    // List all tables
    console.log('\n3. All tables in database:');
    const allTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    allTables.rows.forEach(t => console.log(`   - ${t.table_name}`));
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkSchema();
