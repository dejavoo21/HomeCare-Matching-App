import { useAuth } from '../../contexts/AuthContext';
import { hasPermission } from '../../lib/auth/access';
import Badge from '../ui/Badge';

export default function LockedField({
  permission,
  label,
  deniedReason = 'Read only',
  children,
  readOnlyValue,
}: {
  permission: string;
  label: string;
  deniedReason?: string;
  children: React.ReactNode;
  readOnlyValue?: React.ReactNode;
}) {
  const { user } = useAuth();
  const allowed = hasPermission(user, permission);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        {!allowed ? <Badge variant="warning">{deniedReason}</Badge> : null}
      </div>

      {allowed ? (
        children
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {readOnlyValue ?? 'You can view this field but cannot edit it.'}
        </div>
      )}
    </div>
  );
}
