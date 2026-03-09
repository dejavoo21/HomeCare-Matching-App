import type { User } from '../../types';
import { getDefaultPermissionsForRole } from './permissions';

export function getUserPermissions(user?: User | null) {
  if (!user) return [];
  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    return user.permissions;
  }
  return getDefaultPermissionsForRole(user.role);
}

export function hasPermission(user: User | null | undefined, permission: string) {
  return getUserPermissions(user).includes(permission);
}

export function hasAnyPermission(user: User | null | undefined, permissions: string[] = []) {
  if (!permissions.length) return true;
  return permissions.some((permission) => hasPermission(user, permission));
}

export function hasAllPermissions(user: User | null | undefined, permissions: string[] = []) {
  if (!permissions.length) return true;
  return permissions.every((permission) => hasPermission(user, permission));
}
