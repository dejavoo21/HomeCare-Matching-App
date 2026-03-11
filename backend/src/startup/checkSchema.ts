import { pool } from '../db';

type ColumnCheck = {
  table: string;
  column: string;
};

async function columnExists(table: string, column: string) {
  const result = await pool.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_name = $1
       AND column_name = $2
     LIMIT 1`,
    [table, column]
  );

  return result.rows.length > 0;
}

export async function checkSchema() {
  const requiredChecks: ColumnCheck[] = [
    { table: 'care_requests', column: 'status' },
    { table: 'care_requests', column: 'professional_id' },
    { table: 'care_requests', column: 'follow_up_required' },
    { table: 'care_requests', column: 'admin_follow_up_scheduled' },
    { table: 'care_requests', column: 'preferred_start' },
    { table: 'visit_assignments', column: 'offer_expires_at' },
  ];

  const results = await Promise.all(
    requiredChecks.map(async (check) => ({
      ...check,
      exists: await columnExists(check.table, check.column),
    }))
  );

  const missing = results
    .filter((result) => !result.exists)
    .map((result) => `${result.table}.${result.column}`);

  if (missing.length > 0) {
    throw new Error(`Schema check failed. Missing columns: ${missing.join(', ')}`);
  }
}
