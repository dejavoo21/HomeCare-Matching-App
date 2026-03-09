import { cn } from '../../lib/ui/cn';

function TrendPill({
  value,
  tone = 'neutral',
}: {
  value: string;
  tone?: 'neutral' | 'success' | 'danger' | 'warning' | 'info';
}) {
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : tone === 'danger'
        ? 'bg-rose-50 text-rose-700 ring-rose-200'
        : tone === 'warning'
          ? 'bg-amber-50 text-amber-700 ring-amber-200'
          : tone === 'info'
            ? 'bg-sky-50 text-sky-700 ring-sky-200'
            : 'bg-slate-100 text-slate-700 ring-slate-200';

  const symbol =
    tone === 'success' ? '↑' : tone === 'danger' ? '↓' : tone === 'warning' ? '!' : '•';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        toneClass
      )}
    >
      {symbol} {value}
    </span>
  );
}

export default function KpiCard({
  title,
  value,
  subtitle,
  trend,
  trendTone = 'neutral',
  accent = 'default',
  children,
}: {
  title: string;
  value: React.ReactNode;
  subtitle: string;
  trend?: string;
  trendTone?: 'neutral' | 'success' | 'danger' | 'warning' | 'info';
  accent?: 'default' | 'success' | 'danger' | 'warning' | 'info' | 'violet';
  children?: React.ReactNode;
}) {
  const accentClass =
    accent === 'success'
      ? 'from-emerald-500 to-teal-500'
      : accent === 'danger'
        ? 'from-rose-500 to-orange-500'
        : accent === 'warning'
          ? 'from-amber-500 to-yellow-500'
          : accent === 'info'
            ? 'from-sky-500 to-cyan-500'
            : accent === 'violet'
              ? 'from-violet-500 to-fuchsia-500'
              : 'from-slate-500 to-slate-400';

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', accentClass)} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">{title}</div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</div>
          <div className="mt-2 text-sm text-slate-500">{subtitle}</div>
        </div>
        {trend ? <TrendPill value={trend} tone={trendTone} /> : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
