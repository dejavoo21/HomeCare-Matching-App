import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { hasPermission } from '../../lib/auth/access';
import Button from '../ui/Button';
import SectionCard from '../ui/SectionCard';

export default function RequirePermission({
  permission,
  children,
  redirectTo = '/dashboard',
}: {
  permission: string;
  children: React.ReactNode;
  redirectTo?: string;
}) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (!hasPermission(user, permission)) {
    return (
      <div className="p-6">
        <SectionCard
          title="Access restricted"
          subtitle="You do not have permission to view this workspace."
        >
          <div className="space-y-4">
            <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              This route is protected because it contains operational data or controlled actions.
            </div>
            <Button variant="secondary" onClick={() => window.location.assign(redirectTo)}>
              Return to safe workspace
            </Button>
          </div>
        </SectionCard>
      </div>
    );
  }

  return <>{children}</>;
}
