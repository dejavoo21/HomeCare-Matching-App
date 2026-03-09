import { UserRole } from '../../types';

export const PERMISSIONS = {
  DASHBOARD_READ: 'dashboard.read',

  DISPATCH_READ: 'dispatch.read',
  DISPATCH_MANAGE: 'dispatch.manage',

  SCHEDULING_READ: 'scheduling.read',
  SCHEDULING_ASSIGN: 'scheduling.assign',
  SCHEDULING_CREATE: 'scheduling.create',

  TEAM_READ: 'team.read',
  TEAM_MANAGE: 'team.manage',

  ACCESS_REQUESTS_READ: 'access.requests.read',
  ACCESS_REQUESTS_REVIEW: 'access.requests.review',
  ACCESS_REQUESTS_VERIFY: 'access.requests.verify',
  ACCESS_REQUESTS_REQUEST_INFO: 'access.requests.request_info',

  NOTES_REVIEW: 'notes.review',

  ANALYTICS_READ: 'analytics.read',
  AUDIT_READ: 'audit.read',
  CONNECTED_SYSTEMS_READ: 'connected_systems.read',
  RELIABILITY_READ: 'reliability.read',
  FHIR_READ: 'fhir.read',
} as const;

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export function getDefaultPermissionsForRole(role?: UserRole | string | null) {
  const normalized = String(role || '').toLowerCase();

  if (normalized === UserRole.ADMIN) {
    return ALL_PERMISSIONS;
  }

  if (normalized === UserRole.NURSE || normalized === UserRole.DOCTOR) {
    return [
      PERMISSIONS.DASHBOARD_READ,
      PERMISSIONS.SCHEDULING_READ,
      PERMISSIONS.TEAM_READ,
    ];
  }

  if (normalized === UserRole.CLIENT) {
    return [PERMISSIONS.DASHBOARD_READ];
  }

  return [];
}
