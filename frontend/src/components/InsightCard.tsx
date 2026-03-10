type InsightTone = 'indigo' | 'blue' | 'amber' | 'green' | 'rose';

type InsightCardProps = {
  label: string;
  value: string | number;
  helper: string;
  trendLabel?: string;
  tone?: InsightTone;
  points?: number[];
};

function toneClass(tone: InsightTone) {
  switch (tone) {
    case 'blue':
      return 'insightCard insightCard-blue';
    case 'amber':
      return 'insightCard insightCard-amber';
    case 'green':
      return 'insightCard insightCard-green';
    case 'rose':
      return 'insightCard insightCard-rose';
    default:
      return 'insightCard insightCard-indigo';
  }
}

function Sparkline({ points = [] }: { points?: number[] }) {
  if (!points.length) {
    return <div className="insightSparklineEmpty" />;
  }

  const width = 220;
  const height = 56;
  const padding = 6;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = (width - padding * 2) / Math.max(points.length - 1, 1);

  const coords = points.map((point, index) => {
    const x = padding + index * stepX;
    const y = height - padding - ((point - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  return (
    <svg
      className="insightSparkline"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords.join(' ')}
      />
    </svg>
  );
}

export function InsightCard({
  label,
  value,
  helper,
  trendLabel,
  tone = 'indigo',
  points = [],
}: InsightCardProps) {
  return (
    <div className={toneClass(tone)}>
      <div className="insightCardHeader">
        <div className="insightCardLabel">{label}</div>
        {trendLabel ? <div className="insightTrendPill">{trendLabel}</div> : null}
      </div>

      <div className="insightCardValue">{value}</div>
      <div className="insightCardHelper">{helper}</div>

      <div className="insightSparklineWrap">
        <Sparkline points={points} />
      </div>
    </div>
  );
}
