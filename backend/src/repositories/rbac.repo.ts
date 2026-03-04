import type { Pool } from 'pg';

/**
 * Get all permissions for a user based on their roles
 */
export async function getUserPermissions(pool: Pool, userId: string): Promise<string[]> {
  const res = await pool.query(
    `SELECT DISTINCT rp.permission_code as code
     FROM user_roles ur
     JOIN role_permissions rp ON rp.role_code = ur.role_code
     WHERE ur.user_id = $1
     ORDER BY rp.permission_code`,
    [userId]
  );

  return res.rows.map((r: any) => r.code);
}

/**
 * Get all roles for a user
 */
export async function getUserRoles(pool: Pool, userId: string): Promise<string[]> {
  const res = await pool.query(
    `SELECT role_code as code
     FROM user_roles
     WHERE user_id = $1
     ORDER BY role_code`,
    [userId]
  );

  return res.rows.map((r: any) => r.code);
}

/**
 * Assign a role to a user
 */
export async function assignRoleToUser(
  pool: Pool,
  userId: string,
  roleCode: string
): Promise<void> {
  await pool.query(
    `INSERT INTO user_roles (user_id, role_code)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [userId, roleCode]
  );
}

/**
 * Remove a role from a user
 */
export async function removeRoleFromUser(
  pool: Pool,
  userId: string,
  roleCode: string
): Promise<void> {
  await pool.query(
    `DELETE FROM user_roles
     WHERE user_id = $1 AND role_code = $2`,
    [userId, roleCode]
  );
}

/**
 * Check if user has a specific permission
 */
export async function userHasPermission(
  pool: Pool,
  userId: string,
  permission: string
): Promise<boolean> {
  const perms = await getUserPermissions(pool, userId);
  return perms.includes(permission);
}

/**
 * Check if user has any of the provided permissions
 */
export async function userHasAnyPermission(
  pool: Pool,
  userId: string,
  permissions: string[]
): Promise<boolean> {
  const perms = await getUserPermissions(pool, userId);
  return permissions.some((p) => perms.includes(p));
}

/**
 * Check if user has all of the provided permissions
 */
export async function userHasAllPermissions(
  pool: Pool,
  userId: string,
  permissions: string[]
): Promise<boolean> {
  const perms = await getUserPermissions(pool, userId);
  return permissions.every((p) => perms.includes(p));
}
