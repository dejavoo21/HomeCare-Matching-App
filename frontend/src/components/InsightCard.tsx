import { type ReactNode } from 'react';
import KpiCard from './ui/KpiCard';

type InsightTone = 'indigo' | 'amber' | 'blue' | 'green' | 'rose';

export function InsightCard({
  label,
  value,
  detail,
  trend,
  tone,
  action,
}: {
  label: string;
  value: number | string;
  detail: string;
  trend?: string;
  tone: InsightTone;
  action?: ReactNode;
}) {
  const accent =
    tone === 'indigo'
      ? 'violet'
      : tone === 'amber'
        ? 'warning'
        : tone === 'blue'
          ? 'info'
          : tone === 'green'
            ? 'success'
            : 'danger';

  const trendTone =
    tone === 'green'
      ? 'success'
      : tone === 'amber'
        ? 'warning'
        : tone === 'rose'
          ? 'danger'
          : 'info';

  return (
    <article>
      <KpiCard
        title={label}
        value={value}
        subtitle={detail}
        trend={trend}
        trendTone={trend ? trendTone : 'neutral'}
        accent={accent}
      >
        {action ? <div className="insightCardActionRow">{action}</div> : null}
      </KpiCard>
    </article>
  );
}
