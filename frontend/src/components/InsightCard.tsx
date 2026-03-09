import { type ReactNode } from 'react';

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
  return (
    <article className={`insightCard insightCard-${tone}`}>
      <div className="insightCardTop">
        <div className="insightCardLabel">{label}</div>
        {trend ? <div className="insightCardTrend">{trend}</div> : null}
      </div>

      <div className="insightCardValue">{value}</div>
      <div className="insightCardDetail">{detail}</div>

      {action ? <div className="insightCardActionRow">{action}</div> : null}
    </article>
  );
}
