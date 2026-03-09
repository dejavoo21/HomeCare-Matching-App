import Badge from '../ui/Badge';

export default function PermissionNotice({
  title = 'Limited access',
  description = 'Some actions in this section are restricted by your role.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center gap-3">
        <Badge variant="warning">RBAC</Badge>
        <div>
          <div className="text-sm font-semibold text-amber-900">{title}</div>
          <div className="mt-1 text-sm text-amber-800">{description}</div>
        </div>
      </div>
    </div>
  );
}
