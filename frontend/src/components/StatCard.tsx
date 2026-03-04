import type { LucideIcon } from "lucide-react";

type Tone = "indigo" | "amber" | "blue" | "green" | "slate";

type Props = {
  label: string;
  value: number | string;
  Icon: LucideIcon;
  tone?: Tone;
  hint?: string;
};

const TONES: Record<Tone, { bg: string; ring: string; icon: string }> = {
  indigo: { bg: "rgba(99,102,241,.12)", ring: "rgba(99,102,241,.22)", icon: "rgba(55,48,163,.95)" },
  amber:  { bg: "rgba(245,158,11,.12)", ring: "rgba(245,158,11,.22)", icon: "rgba(146,64,14,.95)" },
  blue:   { bg: "rgba(37,99,235,.12)", ring: "rgba(37,99,235,.22)", icon: "rgba(30,58,138,.95)" },
  green:  { bg: "rgba(22,163,74,.12)", ring: "rgba(22,163,74,.22)", icon: "rgba(20,83,45,.95)" },
  slate:  { bg: "rgba(15,23,42,.06)", ring: "rgba(15,23,42,.10)", icon: "rgba(15,23,42,.85)" },
};

export function StatCard({ label, value, Icon, tone = "slate", hint }: Props) {
  const t = TONES[tone];

  return (
    <div className="statCardPro" role="group" aria-label={`${label}: ${value}`}>
      <div className="statCardProTop">
        <div
          className="statIconBadge"
          style={{ background: t.bg, boxShadow: `0 0 0 4px ${t.ring}`, color: t.icon }}
          aria-hidden="true"
        >
          <Icon size={18} />
        </div>

        <div className="statMeta">
          <div className="statLabel">{label}</div>
          {hint ? <div className="statHint">{hint}</div> : null}
        </div>
      </div>

      <div className="statValueRow">
        <div className="statValue">{value}</div>
        <span className="statPill">Live</span>
      </div>
    </div>
  );
}
