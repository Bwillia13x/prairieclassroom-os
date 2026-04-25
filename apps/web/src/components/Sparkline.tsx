import type { SectionTone } from "../appReducer";

interface Props {
  data: number[];
  tone?: SectionTone;
  label?: string;
  width?: number;
  height?: number;
}

const TONE_COLORS: Record<SectionTone, string> = {
  sun: "var(--color-section-watchpoint)",
  sage: "var(--color-section-family)",
  slate: "var(--color-section-ea)",
  forest: "var(--color-section-trend)",
  muted: "var(--color-text-tertiary)",
};

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export default function Sparkline({
  data,
  tone = "slate",
  label,
  width = 80,
  height = 24,
}: Props) {
  if (data.length < 3) return null;

  const padding = 2;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, i) => {
    const x = padding + (i / (data.length - 1)) * innerWidth;
    const y = padding + (1 - (value - min) / range) * innerHeight;
    return `${x},${y}`;
  });

  const lastPoint = points[points.length - 1];
  const [lx, ly] = lastPoint.split(",").map(Number);

  const recent = data.slice(-3);
  const rolling3 = average(recent);
  const rolling14 = average(data.slice(-14));
  const pctDiff = rolling14 === 0 ? 0 : (rolling3 - rolling14) / Math.abs(rolling14);

  let trendArrow: string | null = null;
  let trendDescription: string;

  if (pctDiff > 0.2) {
    trendArrow = "↑";
    trendDescription = "Trending up over 14 days";
  } else if (pctDiff < -0.2) {
    trendArrow = "↓";
    trendDescription = "Trending down over 14 days";
  } else {
    trendDescription = "Stable over 14 days";
  }

  const color = TONE_COLORS[tone];

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
        style={{ display: "block", flexShrink: 0 }}
      >
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={lx} cy={ly} r={2} fill={color} />
      </svg>
      {trendArrow !== null && (
        <span aria-hidden="true" style={{ color, fontSize: "0.75rem", lineHeight: 1 }}>
          {trendArrow}
        </span>
      )}
      <span className="sr-only">{label ?? trendDescription}</span>
    </span>
  );
}
