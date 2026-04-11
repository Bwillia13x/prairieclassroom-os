import "./DataViz.css";

/* ============================================================
   DataViz — lightweight data visualisation sub-components
   ============================================================ */

// ---- Sparkline -------------------------------------------------

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  label?: string;
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  label = "Sparkline",
}: SparklineProps) {
  if (data.length < 2) {
    return (
      <span className="dataviz-sparkline dataviz-sparkline--empty" aria-label={label}>
        --
      </span>
    );
  }

  const padding = 2;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = padding + (i / (data.length - 1)) * innerW;
      const y = padding + (1 - (v - min) / range) * innerH;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      className="dataviz-sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--ds-accent)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---- TrendIndicator -------------------------------------------

interface TrendIndicatorProps {
  value: number;
  direction: "up" | "down" | "flat";
}

const ARROWS: Record<string, string> = { up: "\u2191", down: "\u2193", flat: "\u2192" };

export function TrendIndicator({ value, direction }: TrendIndicatorProps) {
  const sign = value > 0 ? "+" : "";
  const arrow = ARROWS[direction] ?? ARROWS.flat;
  return (
    <span
      className={`dataviz-trend dataviz-trend--${direction}`}
      aria-label={`${direction} ${sign}${value.toFixed(1)}%`}
    >
      <span className="dataviz-trend__arrow" aria-hidden="true">{arrow}</span>
      <span className="dataviz-trend__value">{sign}{value.toFixed(1)}%</span>
    </span>
  );
}

// ---- HealthDot ------------------------------------------------

interface HealthDotProps {
  status: "healthy" | "warning" | "critical";
  tooltip?: string;
}

export function HealthDot({ status, tooltip }: HealthDotProps) {
  return (
    <span
      className={`dataviz-health-dot dataviz-health-dot--${status}`}
      title={tooltip}
      aria-label={tooltip ?? status}
      role="img"
    />
  );
}

// ---- ProgressBar ----------------------------------------------

interface ProgressBarProps {
  value: number;
  label?: string;
  max?: number;
}

export function ProgressBar({
  value,
  label = "Progress",
  max = 100,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(value, max));
  const pct = max > 0 ? (clamped / max) * 100 : 0;

  return (
    <div className="dataviz-progress">
      {label && <span className="dataviz-progress__label">{label}</span>}
      <div
        className="dataviz-progress__track"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className="dataviz-progress__fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
