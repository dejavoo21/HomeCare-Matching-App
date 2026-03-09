import { cn } from '../../lib/ui/cn';

function HeroStat({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: React.ReactNode;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
      <div className="text-xs uppercase tracking-wide text-white/75">{label}</div>
      <div className="mt-1 text-xl font-bold text-white sm:text-2xl">{value}</div>
      <div className="mt-1 text-sm text-white/80">{subtitle}</div>
    </div>
  );
}

export default function PageHero({
  eyebrow,
  title,
  description,
  stats = [],
  rightContent,
  className = '',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  stats?: Array<{ label: string; value: React.ReactNode; subtitle: string }>;
  rightContent?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-3xl bg-gradient-to-r from-slate-950 via-sky-950 to-indigo-900 px-5 py-5 text-white shadow-xl sm:px-6',
        className
      )}
    >
      <div
        className={cn(
          'grid items-start gap-5',
          rightContent ? '2xl:grid-cols-[minmax(0,1fr)_380px]' : ''
        )}
      >
        <div className="min-w-0">
          {eyebrow ? <p className="text-sm font-medium text-white/75">{eyebrow}</p> : null}
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {description ? <p className="mt-3 max-w-2xl text-sm text-white/80">{description}</p> : null}

          {stats.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <HeroStat
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  subtitle={stat.subtitle}
                />
              ))}
            </div>
          ) : null}
        </div>

        {rightContent ? (
          <div className="self-start rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
            {rightContent}
          </div>
        ) : null}
      </div>
    </div>
  );
}
