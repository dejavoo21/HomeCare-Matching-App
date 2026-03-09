import { cn } from '../../lib/ui/cn';

export default function SectionCard({
  title,
  subtitle,
  actions,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-3xl border border-slate-200 bg-white p-5 shadow-sm', className)}>
      {(title || subtitle || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {title ? <h2 className="text-lg font-semibold text-slate-900">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          {actions}
        </div>
      )}

      <div className={title || subtitle || actions ? 'mt-5' : ''}>{children}</div>
    </div>
  );
}
