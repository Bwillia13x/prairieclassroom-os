/**
 * DayArc.tsx — Signature dashboard hero visualization
 *
 * Unifies the day's forecast, priority students, debt pressure, and
 * time-of-day into a single horizontal landscape. The complexity
 * ridge is the day's shape, the student constellation is the
 * attention budget, the debt motes are floating threads, and the
 * now-line locates the viewer in the moment.
 *
 * Pure SVG. No external dependencies. Animates on mount, respects
 * prefers-reduced-motion through DayArc.css.
 */

import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import type {
  ComplexityForecast,
  ComplexityBlock,
  StudentSummary,
  DebtItem,
  ClassroomHealth,
} from "../types";
import "./DayArc.css";

interface Props {
  forecast: ComplexityForecast | null;
  students: StudentSummary[];
  debtItems: DebtItem[];
  health: ClassroomHealth | null;
  onStudentClick?: (alias: string) => void;
  onBlockClick?: (blockIndex: number) => void;
  /** Current moment — injected for testability. Defaults to `new Date()`. */
  now?: Date;
}

const VIEW_W = 900;
const VIEW_H = 260;
const PAD_X = 40;
const PAD_TOP = 56;
const PAD_BOTTOM = 82;
const RIDGE_MAX_H = VIEW_H - PAD_TOP - PAD_BOTTOM;
const BASELINE_Y = PAD_TOP + RIDGE_MAX_H;

const SCHOOL_START_HOUR = 8.5;
const SCHOOL_END_HOUR = 15.5;

const LEVEL_AMPLITUDE: Record<"low" | "medium" | "high", number> = {
  low: 0.28,
  medium: 0.62,
  high: 1.0,
};

const LEVEL_NUMERIC: Record<"low" | "medium" | "high", number> = {
  low: 1,
  medium: 2,
  high: 3,
};

type StarTone = "danger" | "warning" | "analysis";

interface Star {
  alias: string;
  urgency: number;
  pending: number;
  x: number;
  y: number;
  radius: number;
  tone: StarTone;
  reason: string;
}

interface Mote {
  category: string;
  count: number;
  x: number;
  y: number;
  radius: number;
}

interface RidgePoint {
  x: number;
  y: number;
  level: "low" | "medium" | "high";
  block: ComplexityBlock;
  index: number;
}

export default function DayArc({
  forecast,
  students,
  debtItems,
  health,
  onStudentClick,
  onBlockClick,
  now,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const currentTime = useMemo(() => now ?? new Date(), [now]);

  const ridge = useMemo<RidgePoint[] | null>(() => {
    if (!forecast || forecast.blocks.length === 0) return null;
    const blocks = forecast.blocks;
    const n = blocks.length;
    const innerW = VIEW_W - PAD_X * 2;
    const xStep = n === 1 ? 0 : innerW / (n - 1);
    return blocks.map((block, i) => {
      const x = n === 1 ? PAD_X + innerW / 2 : PAD_X + i * xStep;
      const amplitude = LEVEL_AMPLITUDE[block.level];
      const y = BASELINE_Y - RIDGE_MAX_H * amplitude;
      return { x, y, level: block.level, block, index: i };
    });
  }, [forecast]);

  const deltas = useMemo(() => {
    // peak_complexity_14d is ordered oldest-first; the last entry is today.
    // We exclude the last entry and average the remaining 13 days as the
    // historical baseline, then compare each forecast block's level against it.
    if (!ridge || !health?.trends?.peak_complexity_14d) return [];
    const history = health.trends.peak_complexity_14d;
    if (history.length < 2) return [];
    const baselineSlice = history.slice(0, -1);
    const baseline =
      baselineSlice.reduce((sum, v) => sum + v, 0) / baselineSlice.length;
    return ridge.map((p) => {
      const todayLevel = LEVEL_NUMERIC[p.level];
      const diff = todayLevel - baseline;
      if (Math.abs(diff) < 0.6) return 0;
      return diff > 0 ? 1 : -1;
    });
  }, [ridge, health]);

  const constellation = useMemo<Star[]>(() => {
    const scored = students
      .map((s) => {
        const staleness = s.last_intervention_days ?? 0;
        const urgency =
          s.pending_action_count * 3 +
          Math.min(staleness / 2, 5) +
          (s.active_pattern_count ?? 0) * 1.5 +
          (s.pending_message_count ?? 0) * 1.2;
        return { student: s, urgency };
      })
      .filter(
        ({ student, urgency }) =>
          urgency > 0 ||
          student.pending_action_count > 0 ||
          (student.last_intervention_days !== null &&
            student.last_intervention_days > 4),
      )
      .sort((a, b) => b.urgency - a.urgency)
      .slice(0, 7);

    if (scored.length === 0) return [];

    const maxUrgency = Math.max(1, ...scored.map((x) => x.urgency));
    const innerW = VIEW_W - PAD_X * 2;
    const laneTop = BASELINE_Y + 16;
    const laneBottom = VIEW_H - 30;

    return scored.map((entry, i) => {
      const { student, urgency } = entry;
      const urgencyPct = urgency / maxUrgency;
      const x =
        scored.length === 1
          ? PAD_X + innerW / 2
          : PAD_X + ((i + 0.5) / scored.length) * innerW;
      const y = laneTop + (1 - urgencyPct) * (laneBottom - laneTop);
      const radius = 4.5 + urgencyPct * 3.5;
      const tone: StarTone =
        student.pending_action_count >= 3
          ? "danger"
          : student.pending_action_count >= 1
            ? "warning"
            : "analysis";
      return {
        alias: student.alias,
        urgency,
        pending: student.pending_action_count,
        x,
        y,
        radius,
        tone,
        reason: student.latest_priority_reason ?? "",
      };
    });
  }, [students]);

  const motes = useMemo<Mote[]>(() => {
    if (debtItems.length === 0) return [];
    const byCategory = new Map<string, number>();
    for (const item of debtItems) {
      byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + 1);
    }
    const moteSpacing = 46;
    const maxMotes = Math.max(
      1,
      Math.floor((VIEW_W - PAD_X * 2) / moteSpacing / 2),
    );
    const entries = Array.from(byCategory.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxMotes);
    const rightEdge = VIEW_W - PAD_X;
    return entries.map(([category, count], i) => ({
      category,
      count,
      x: rightEdge - i * moteSpacing,
      y: 22 + (i % 2) * 14,
      radius: 10 + Math.min(count, 5) * 1.6,
    }));
  }, [debtItems]);

  const nowX = useMemo(() => {
    const hours = currentTime.getHours() + currentTime.getMinutes() / 60;
    if (hours < SCHOOL_START_HOUR || hours >= SCHOOL_END_HOUR) return null;
    const pct =
      (hours - SCHOOL_START_HOUR) / (SCHOOL_END_HOUR - SCHOOL_START_HOUR);
    return PAD_X + pct * (VIEW_W - PAD_X * 2);
  }, [currentTime]);

  if (!forecast || forecast.blocks.length === 0 || !ridge) {
    return (
      <section className="day-arc day-arc--empty" aria-label="Today's shape — waiting for forecast">
        <header className="day-arc__header">
          <h2 className="day-arc__title">Today's Shape</h2>
        </header>
        <p className="day-arc__empty-text">
          The day's arc will draw itself once tomorrow's forecast is generated.
        </p>
      </section>
    );
  }

  const ridgePathD = buildRidgePath(ridge);
  const ridgeStrokeD = buildRidgeStrokePath(ridge);

  const peak = ridge.reduce((best, p) =>
    LEVEL_NUMERIC[p.level] > LEVEL_NUMERIC[best.level] ? p : best,
  );

  const watchingCount = constellation.length;
  const threadsCount = debtItems.length;

  const ariaLabel = buildAriaLabel(
    forecast.blocks.length,
    peak.block.time_slot,
    peak.level,
    watchingCount,
    threadsCount,
  );

  return (
    <section
      className={`day-arc${mounted ? " day-arc--mounted" : ""}`}
      aria-labelledby="day-arc-title"
    >
      <header className="day-arc__header">
        <div>
          <h2 id="day-arc-title" className="day-arc__title">Today's Shape</h2>
          <p className="day-arc__subtitle">
            <span>{forecast.blocks.length} blocks</span>
            <span aria-hidden="true">·</span>
            <span>
              {watchingCount} {watchingCount === 1 ? "student" : "students"} watching
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {threadsCount} open {threadsCount === 1 ? "thread" : "threads"}
            </span>
          </p>
        </div>
      </header>

      <svg
        className="day-arc__svg"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label={ariaLabel}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="day-arc-horizon" x1="0" y1="0" x2="1" y2="0">
            <stop
              offset="0%"
              stopColor="var(--color-bg-sun)"
              stopOpacity="0.55"
            />
            <stop
              offset="45%"
              stopColor="var(--color-bg-muted)"
              stopOpacity="0.15"
            />
            <stop
              offset="100%"
              stopColor="var(--color-bg-analysis)"
              stopOpacity="0.4"
            />
          </linearGradient>
          <linearGradient id="day-arc-ridge-fill" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-forecast-high)"
              stopOpacity="0.58"
            />
            <stop
              offset="55%"
              stopColor="var(--color-forecast-medium)"
              stopOpacity="0.34"
            />
            <stop
              offset="100%"
              stopColor="var(--color-forecast-low)"
              stopOpacity="0.1"
            />
          </linearGradient>
          <radialGradient id="day-arc-mote-fill" cx="0.5" cy="0.5" r="0.5">
            <stop
              offset="0%"
              stopColor="var(--color-pending)"
              stopOpacity="0.72"
            />
            <stop
              offset="100%"
              stopColor="var(--color-pending)"
              stopOpacity="0.12"
            />
          </radialGradient>
        </defs>

        <rect
          x="0"
          y="0"
          width={VIEW_W}
          height={VIEW_H}
          fill="url(#day-arc-horizon)"
        />

        <line
          x1={PAD_X}
          y1={BASELINE_Y}
          x2={VIEW_W - PAD_X}
          y2={BASELINE_Y}
          stroke="var(--color-border)"
          strokeWidth="1"
          strokeDasharray="2,5"
          opacity="0.55"
        />

        <path
          className="day-arc__ridge-fill"
          d={ridgePathD}
          fill="url(#day-arc-ridge-fill)"
          pathLength={1}
        />
        <path
          className="day-arc__ridge-stroke"
          d={ridgeStrokeD}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
        />

        {ridge.map((p, i) => {
          const delta = deltas[i] ?? 0;
          const whisker =
            delta === 0
              ? null
              : delta > 0
                ? `M ${p.x} ${p.y - 8} L ${p.x - 3} ${p.y - 13} M ${p.x} ${p.y - 8} L ${p.x + 3} ${p.y - 13}`
                : `M ${p.x} ${p.y + 8} L ${p.x - 3} ${p.y + 13} M ${p.x} ${p.y + 8} L ${p.x + 3} ${p.y + 13}`;
          const whiskerTone =
            delta > 0 ? "var(--color-danger)" : "var(--color-success)";
          return (
            <g
              key={`block-${i}`}
              className="day-arc__block-group"
              style={{ animationDelay: `${360 + i * 70}ms` }}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r="4.5"
                fill={`var(--color-forecast-${p.level})`}
                stroke="var(--color-surface-elevated)"
                strokeWidth="2"
              />
              {whisker && (
                <path
                  d={whisker}
                  stroke={whiskerTone}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.9"
                />
              )}
              <text
                x={p.x}
                y={BASELINE_Y + 16}
                textAnchor="middle"
                className="day-arc__block-label"
              >
                {blockStartLabel(p.block.time_slot)}
              </text>
            </g>
          );
        })}

        {onBlockClick &&
          ridge.map((p, i) => {
            const hitLeft =
              i === 0 ? PAD_X : (ridge[i - 1].x + p.x) / 2;
            const hitRight =
              i === ridge.length - 1
                ? VIEW_W - PAD_X
                : (p.x + ridge[i + 1].x) / 2;
            const hitW = Math.max(20, hitRight - hitLeft);
            return (
              <g
                key={`hit-${i}`}
                className="day-arc__block-hit"
                tabIndex={0}
                role="button"
                aria-label={`${p.block.time_slot} ${p.block.activity}: ${p.block.level} complexity. Open detail.`}
                onClick={() => onBlockClick(i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onBlockClick(i);
                  }
                }}
              >
                <rect
                  x={hitLeft}
                  y={PAD_TOP - 6}
                  width={hitW}
                  height={RIDGE_MAX_H + 22}
                  fill="transparent"
                />
              </g>
            );
          })}

        {nowX !== null && (
          <g className="day-arc__now" aria-hidden="true">
            <line
              className="day-arc__now-line"
              x1={nowX}
              y1={PAD_TOP - 10}
              x2={nowX}
              y2={BASELINE_Y + 4}
              stroke="var(--color-accent)"
              strokeWidth="1.5"
              strokeDasharray="3,4"
            />
            <circle
              className="day-arc__now-dot"
              cx={nowX}
              cy={PAD_TOP - 10}
              r="3.2"
              fill="var(--color-accent)"
            />
            <text
              x={nowX}
              y={PAD_TOP - 16}
              textAnchor="middle"
              className="day-arc__now-label"
            >
              now
            </text>
          </g>
        )}

        {constellation.map((s, i) => {
          const clickable = Boolean(onStudentClick);
          const label = `${s.alias}: ${s.pending} pending ${s.pending === 1 ? "action" : "actions"}${s.reason ? `, ${s.reason}` : ""}. Open detail.`;
          const interactiveProps = clickable
            ? {
                tabIndex: 0,
                role: "button" as const,
                "aria-label": label,
                onClick: () => onStudentClick!(s.alias),
                onKeyDown: (e: KeyboardEvent<SVGGElement>) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onStudentClick!(s.alias);
                  }
                },
              }
            : {};
          return (
            <g
              key={s.alias}
              className={`day-arc__star day-arc__star--${s.tone}${clickable ? " day-arc__star--clickable" : ""}`}
              style={{ animationDelay: `${560 + i * 70}ms` }}
              {...interactiveProps}
            >
              <line
                x1={s.x}
                y1={BASELINE_Y + 2}
                x2={s.x}
                y2={s.y - s.radius}
                stroke={`var(--color-${s.tone})`}
                strokeOpacity="0.32"
                strokeWidth="1"
                strokeDasharray="1.5,2.5"
              />
              <circle
                className="day-arc__star-halo"
                cx={s.x}
                cy={s.y}
                r={s.radius + 4}
                fill="none"
                stroke={`var(--color-${s.tone})`}
                strokeOpacity="0.22"
                strokeWidth="1"
              />
              <circle
                cx={s.x}
                cy={s.y}
                r={s.radius}
                fill={`var(--color-${s.tone})`}
                fillOpacity="0.9"
                stroke="var(--color-surface-elevated)"
                strokeWidth="1.5"
              />
              <text
                x={s.x}
                y={s.y + s.radius + 12}
                textAnchor="middle"
                className="day-arc__star-label"
              >
                {s.alias}
              </text>
              {clickable && (
                <circle
                  className="day-arc__star-hit"
                  cx={s.x}
                  cy={s.y}
                  r={Math.max(14, s.radius + 6)}
                  fill="transparent"
                />
              )}
            </g>
          );
        })}

        {motes.map((m, i) => (
          <g
            key={m.category}
            className="day-arc__mote"
            style={{ animationDelay: `${720 + i * 90}ms` }}
            aria-hidden="true"
          >
            <circle
              cx={m.x}
              cy={m.y}
              r={m.radius}
              fill="url(#day-arc-mote-fill)"
              stroke="var(--color-pending)"
              strokeOpacity="0.55"
              strokeWidth="1"
            />
            <text
              x={m.x}
              y={m.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="day-arc__mote-count"
            >
              {m.count}
            </text>
          </g>
        ))}
      </svg>
    </section>
  );
}

function buildRidgePath(ridge: RidgePoint[]): string {
  if (ridge.length === 0) return "";
  const first = ridge[0];
  let d = `M ${PAD_X} ${BASELINE_Y} L ${first.x} ${first.y}`;
  for (let i = 0; i < ridge.length - 1; i++) {
    const a = ridge[i];
    const b = ridge[i + 1];
    const midX = (a.x + b.x) / 2;
    d += ` C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x} ${b.y}`;
  }
  d += ` L ${VIEW_W - PAD_X} ${BASELINE_Y} Z`;
  return d;
}

function buildRidgeStrokePath(ridge: RidgePoint[]): string {
  if (ridge.length === 0) return "";
  if (ridge.length === 1) {
    const { x, y } = ridge[0];
    return `M ${x - 10} ${y} L ${x + 10} ${y}`;
  }
  const first = ridge[0];
  let d = `M ${first.x} ${first.y}`;
  for (let i = 0; i < ridge.length - 1; i++) {
    const a = ridge[i];
    const b = ridge[i + 1];
    const midX = (a.x + b.x) / 2;
    d += ` C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x} ${b.y}`;
  }
  return d;
}

function blockStartLabel(timeSlot: string): string {
  const start = timeSlot.split("-")[0]?.trim();
  if (!start) return timeSlot;
  return start.replace(/^0/, "").replace(/:00$/, "");
}

function buildAriaLabel(
  blockCount: number,
  peakSlot: string,
  peakLevel: string,
  students: number,
  threads: number,
): string {
  const parts = [
    `Day arc visualization: ${blockCount} ${blockCount === 1 ? "block" : "blocks"}`,
    `peaks at ${peakSlot} with ${peakLevel} complexity`,
    `${students} priority ${students === 1 ? "student" : "students"}`,
    `${threads} open ${threads === 1 ? "thread" : "threads"}`,
  ];
  return parts.join(", ") + ".";
}
