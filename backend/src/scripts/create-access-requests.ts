import { pool } from '../db';
import * as dotenv from 'dotenv';

dotenv.config();

async function createAccessRequestsTable() {
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS access_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        requester_name VARCHAR(255) NOT NULL,
        requester_email VARCHAR(255) NOT NULL,
        requested_role VARCHAR(50) NOT NULL,
        reason TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMPTZ,
        review_notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_access_requests_email ON access_requests(requester_email);
      CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);
      CREATE INDEX IF NOT EXISTS idx_access_requests_created_at ON access_requests(created_at DESC);
    `;

    await pool.query(sql);
    console.log('✅ access_requests table created successfully');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating table:', err);
    await pool.end();
    process.exit(1);
  }
}

createAccessRequestsTable();
