import { useAuth } from '../../contexts/AuthContext';
import { hasAllPermissions, hasAnyPermission, hasPermission } from '../../lib/auth/access';

export default function PermissionGate({
  permission,
  anyOf,
  allOf,
  fallback = null,
  children,
}: {
  permission?: string;
  anyOf?: string[];
  allOf?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  let allowed = true;

  if (permission) allowed = hasPermission(user, permission);
  if (anyOf) allowed = hasAnyPermission(user, anyOf);
  if (allOf) allowed = hasAllPermissions(user, allOf);

  return allowed ? <>{children}</> : <>{fallback}</>;
}
