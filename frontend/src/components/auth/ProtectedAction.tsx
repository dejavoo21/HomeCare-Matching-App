import { useAuth } from '../../contexts/AuthContext';
import { hasPermission } from '../../lib/auth/access';
import Button from '../ui/Button';

export default function ProtectedAction({
  permission,
  children,
  onClick,
  deniedReason = 'You do not have permission to perform this action.',
  variant = 'primary',
  size = 'md',
  className = '',
}: {
  permission: string;
  children: React.ReactNode;
  onClick?: () => void;
  deniedReason?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const { user } = useAuth();
  const allowed = hasPermission(user, permission);

  return (
    <div className="space-y-2">
      <Button
        variant={variant}
        size={size}
        onClick={allowed ? onClick : undefined}
        disabled={!allowed}
        title={!allowed ? deniedReason : undefined}
        className={className}
      >
        {children}
      </Button>

      {!allowed ? <p className="text-xs text-slate-500">{deniedReason}</p> : null}
    </div>
  );
}
