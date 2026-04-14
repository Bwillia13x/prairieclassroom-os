/**
 * DataVisualizations.tsx — Rich SVG-based visualization components
 * for teacher navigation and classroom insight.
 *
 * All visualizations are lightweight (React + inline SVG), no external
 * charting library required. Uses the existing design token system.
 */

import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent, ReactElement } from "react";
import type {
  StudentSummary,
  ComplexityBlock,
  EALoadBlock,
  EALoadLevel,
  DebtItem,
  FollowUpGap,
  RecurringTheme,
  InterventionRecord,
} from "../types";
import "./DataVisualizations.css";

/* ================================================================
   1. STUDENT PRIORITY MATRIX
   ================================================================
   Two-axis scatter: X = days since last intervention,
   Y = pending action count. Bubble size = active_pattern_count.
   Answers: "Who needs me most right now?"
   ================================================================ */

interface PriorityMatrixProps {
  students: StudentSummary[];
  onStudentClick?: (alias: string) => void;
}

const MATRIX_W = 360;
const MATRIX_H = 240;
const MATRIX_PAD = { top: 16, right: 16, bottom: 32, left: 40 };

export function StudentPriorityMatrix({ students, onStudentClick }: PriorityMatrixProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const data = useMemo(() => {
    return students
      .filter((s) => s.pending_action_count > 0 || s.last_intervention_days !== null)
      .map((s) => ({
        alias: s.alias,
        x: s.last_intervention_days ?? 0,
        y: s.pending_action_count,
        r: Math.max(4, Math.min(14, 4 + (s.active_pattern_count ?? 0) * 3)),
        hasAttention: s.pending_action_count > 0,
        reason: s.latest_priority_reason,
      }));
  }, [students]);

  if (data.length === 0) return null;

  const maxX = Math.max(7, ...data.map((d) => d.x));
  const maxY = Math.max(3, ...data.map((d) => d.y));
  const innerW = MATRIX_W - MATRIX_PAD.left - MATRIX_PAD.right;
  const innerH = MATRIX_H - MATRIX_PAD.top - MATRIX_PAD.bottom;

  function scaleX(v: number) { return MATRIX_PAD.left + (v / maxX) * innerW; }
  function scaleY(v: number) { return MATRIX_PAD.top + innerH - (v / maxY) * innerH; }

  const attentionCount = data.filter((d) => d.hasAttention).length;
  const mostStale = data.reduce((worst, d) => (d.x > worst.x ? d : worst), data[0]);
  const ariaLabel =
    `Priority matrix: ${data.length} ${data.length === 1 ? "student" : "students"} tracked, ` +
    `${attentionCount} needing attention. Most stale: ${mostStale.alias} at ${mostStale.x} days.`;

  function handleBubbleKey(
    e: KeyboardEvent<SVGGElement>,
    alias: string,
  ) {
    if (!onStudentClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onStudentClick(alias);
    }
  }

  return (
    <div className={`viz-priority-matrix${mounted ? " viz-priority-matrix--mounted" : ""}`}>
      <div className="viz-header">
        <h4 className="viz-title">Student Priority View</h4>
        <span className="viz-subtitle">
          Size = pattern count · Position = urgency
        </span>
      </div>
      <svg
        width="100%"
        viewBox={`0 0 ${MATRIX_W} ${MATRIX_H}`}
        className="viz-svg"
        role="img"
        aria-label={ariaLabel}
      >
        {/* Quadrant backgrounds */}
        <rect
          x={scaleX(maxX / 2)} y={MATRIX_PAD.top}
          width={innerW / 2} height={innerH / 2}
          fill="var(--color-danger)" opacity={0.06} rx={4}
        />
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((pct) => (
          <line key={`gx-${pct}`}
            x1={scaleX(maxX * pct)} y1={MATRIX_PAD.top}
            x2={scaleX(maxX * pct)} y2={MATRIX_PAD.top + innerH}
            stroke="var(--color-border)" strokeWidth={0.5} strokeDasharray="3,3"
          />
        ))}
        {[0.25, 0.5, 0.75].map((pct) => (
          <line key={`gy-${pct}`}
            x1={MATRIX_PAD.left} y1={scaleY(maxY * pct)}
            x2={MATRIX_PAD.left + innerW} y2={scaleY(maxY * pct)}
            stroke="var(--color-border)" strokeWidth={0.5} strokeDasharray="3,3"
          />
        ))}
        {/* Axes */}
        <line
          x1={MATRIX_PAD.left} y1={MATRIX_PAD.top + innerH}
          x2={MATRIX_PAD.left + innerW} y2={MATRIX_PAD.top + innerH}
          stroke="var(--color-text-tertiary)" strokeWidth={1}
        />
        <line
          x1={MATRIX_PAD.left} y1={MATRIX_PAD.top}
          x2={MATRIX_PAD.left} y2={MATRIX_PAD.top + innerH}
          stroke="var(--color-text-tertiary)" strokeWidth={1}
        />
        {/* Axis labels */}
        <text
          x={MATRIX_PAD.left + innerW / 2} y={MATRIX_H - 4}
          textAnchor="middle" className="viz-axis-label"
        >
          Days since intervention →
        </text>
        <text
          x={10} y={MATRIX_PAD.top + innerH / 2}
          textAnchor="middle" className="viz-axis-label"
          transform={`rotate(-90, 10, ${MATRIX_PAD.top + innerH / 2})`}
        >
          Pending actions ↑
        </text>
        {/* Student bubbles */}
        {data.map((d, i) => {
          const clickable = Boolean(onStudentClick);
          return (
            <g
              key={d.alias}
              className="viz-bubble-group"
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              aria-label={clickable ? `${d.alias}: ${d.y} pending ${d.y === 1 ? "action" : "actions"}, ${d.x} days since intervention. Open detail.` : undefined}
              onClick={clickable ? () => onStudentClick!(d.alias) : undefined}
              onKeyDown={clickable ? (e) => handleBubbleKey(e, d.alias) : undefined}
              style={{
                cursor: clickable ? "pointer" : "default",
                animationDelay: `${i * 40}ms`,
              }}
            >
              <circle
                cx={scaleX(d.x)} cy={scaleY(d.y)} r={d.r}
                className={`viz-bubble ${d.hasAttention ? "viz-bubble--attention" : "viz-bubble--calm"}`}
              />
              <text
                x={scaleX(d.x)} y={scaleY(d.y) - d.r - 3}
                textAnchor="middle"
                className="viz-bubble-label"
              >
                {d.alias}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}


/* ================================================================
   2. COMPLEXITY DEBT GAUGE
   ================================================================
   Radial gauge showing total operational debt.
   Green (0–3) → Amber (4–7) → Red (8+).
   Answers: "Am I falling behind?"
   ================================================================ */

interface DebtGaugeProps {
  debtItems: DebtItem[];
  previousTotal?: number;
  onSegmentClick?: (payload: { trendKey: "debt"; label: string; data: number[] }) => void;
}

export function ComplexityDebtGauge({ debtItems, previousTotal, onSegmentClick }: DebtGaugeProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const total = debtItems.length;
  const maxDebt = 12;
  const clamped = Math.min(total, maxDebt);
  const pct = clamped / maxDebt;

  const tone = total <= 3 ? "success" : total <= 7 ? "warning" : "danger";

  const cx = 80;
  const cy = 80;
  const r = 60;
  const startAngle = -210;
  const endAngle = 30;
  const totalArc = endAngle - startAngle; // 240 degrees
  const needleAngle = startAngle + pct * totalArc;

  function polarToCart(angle: number, radius: number) {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  function arcPath(startA: number, endA: number, radius: number) {
    const s = polarToCart(startA, radius);
    const e = polarToCart(endA, radius);
    const largeArc = endA - startA > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  }

  const categories = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of debtItems) {
      map[item.category] = (map[item.category] ?? 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [debtItems]);

  const toneLabel = tone === "success" ? "Manageable" : tone === "warning" ? "Accumulating" : "Critical";
  const topCategory = categories[0]?.[0]?.replace(/_/g, " ") ?? null;

  const delta =
    typeof previousTotal === "number" && previousTotal !== total
      ? total - previousTotal
      : null;

  const ariaLabel =
    `Complexity debt: ${total} ${total === 1 ? "item" : "items"}, ${toneLabel.toLowerCase()}` +
    (topCategory ? `, ${topCategory} leading` : "") +
    (delta !== null ? `, ${delta > 0 ? "up" : "down"} ${Math.abs(delta)} from last check` : "") +
    ".";

  const handleGaugeClick = onSegmentClick
    ? () => onSegmentClick({ trendKey: "debt", label: "Complexity debt", data: [debtItems.length] })
    : undefined;

  const handleGaugeKeyDown = onSegmentClick
    ? (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          if (e.key === " ") e.preventDefault();
          onSegmentClick({ trendKey: "debt", label: "Complexity debt", data: [debtItems.length] });
        }
      }
    : undefined;

  return (
    <div
      className={`viz-debt-gauge${mounted ? " viz-debt-gauge--mounted" : ""}${onSegmentClick ? " viz-debt-gauge--clickable" : ""}`}
      {...(onSegmentClick
        ? {
            role: "button",
            tabIndex: 0,
            "aria-label": ariaLabel,
            "data-testid": "viz-debt-gauge-hit",
            onClick: handleGaugeClick,
            onKeyDown: handleGaugeKeyDown,
          }
        : {})}
    >
      <div className="viz-header">
        <h4 className="viz-title">Complexity Debt</h4>
        <div className="viz-debt-gauge__badges">
          {delta !== null && (
            <span
              className={`viz-debt-gauge__delta viz-debt-gauge__delta--${delta > 0 ? "up" : "down"}`}
              aria-hidden="true"
            >
              {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}
            </span>
          )}
          <span className={`viz-tone-badge viz-tone-badge--${tone}`}>{toneLabel}</span>
        </div>
      </div>
      <div className="viz-debt-gauge__body">
        <svg width="160" height="110" viewBox="0 0 160 110" className="viz-svg" role="img"
          aria-label={ariaLabel}>
          {/* Track */}
          <path d={arcPath(startAngle, endAngle, r)} fill="none"
            stroke="var(--color-border)" strokeWidth={10} strokeLinecap="round" />
          {/* Green zone */}
          <path d={arcPath(startAngle, startAngle + totalArc * 0.25, r)} fill="none"
            stroke="var(--color-success)" strokeWidth={10} strokeLinecap="round" opacity={0.3} />
          {/* Amber zone */}
          <path d={arcPath(startAngle + totalArc * 0.25, startAngle + totalArc * 0.58, r)} fill="none"
            stroke="var(--color-warning)" strokeWidth={10} opacity={0.3} />
          {/* Red zone */}
          <path d={arcPath(startAngle + totalArc * 0.58, endAngle, r)} fill="none"
            stroke="var(--color-danger)" strokeWidth={10} strokeLinecap="round" opacity={0.3} />
          {/* Filled arc — animates from 0 to needleAngle on mount */}
          {total > 0 && (
            <path
              className="viz-debt-gauge__fill"
              d={arcPath(startAngle, needleAngle, r)}
              fill="none"
              stroke={`var(--color-${tone})`}
              strokeWidth={10}
              strokeLinecap="round"
              pathLength={1}
            />
          )}
          {/* Needle dot */}
          {(() => {
            const p = polarToCart(needleAngle, r);
            return (
              <circle
                className="viz-debt-gauge__needle"
                cx={p.x}
                cy={p.y}
                r={5}
                fill={`var(--color-${tone})`}
              />
            );
          })()}
          {/* Center text */}
          <text x={cx} y={cy - 6} textAnchor="middle" className="viz-gauge-number">{total}</text>
          <text x={cx} y={cy + 10} textAnchor="middle" className="viz-gauge-label">items</text>
        </svg>
        {categories.length > 0 && (
          <div className="viz-debt-gauge__breakdown">
            {categories.map(([cat, count]) => (
              <div key={cat} className="viz-debt-gauge__cat">
                <span className="viz-debt-gauge__cat-count">{count}</span>
                <span className="viz-debt-gauge__cat-label">{cat.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


/* ================================================================
   3. CLASSROOM COMPOSITION RINGS
   ================================================================
   Concentric donut rings showing EAL levels, support tag clusters,
   and family language diversity.
   Answers: "Who is in my room?"
   ================================================================ */

interface CompositionRingsProps {
  students: {
    alias: string;
    eal_flag?: boolean;
    support_tags?: string[];
    family_language?: string;
  }[];
}

function drawDonutRing(
  cx: number, cy: number, radius: number, strokeWidth: number,
  segments: { label: string; value: number; color: string }[],
): ReactElement[] {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return [];

  const elements: ReactElement[] = [];
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  for (const seg of segments) {
    const pct = seg.value / total;
    const dashLength = pct * circumference;
    elements.push(
      <circle
        key={`${seg.label}-${radius}`}
        cx={cx} cy={cy} r={radius}
        fill="none" stroke={seg.color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dashLength} ${circumference - dashLength}`}
        strokeDashoffset={-offset}
        transform={`rotate(-90 ${cx} ${cy})`}
        opacity={0.85}
      >
        <title>{seg.label}: {seg.value}</title>
      </circle>,
    );
    offset += dashLength;
  }
  return elements;
}

const LANG_COLORS: Record<string, string> = {
  en: "var(--color-section-slate)",
  tl: "var(--color-section-sun)",
  ar: "var(--color-section-forest)",
  ur: "var(--color-section-sage)",
  so: "var(--color-danger)",
  pa: "var(--color-analysis)",
  es: "var(--color-provenance)",
  vi: "var(--color-pending)",
};

const LANG_LABELS: Record<string, string> = {
  en: "English", tl: "Tagalog", ar: "Arabic", ur: "Urdu",
  so: "Somali", pa: "Punjabi", es: "Spanish", vi: "Vietnamese",
};

export function ClassroomCompositionRings({ students }: CompositionRingsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const stats = useMemo(() => {
    const ealLevels: Record<string, number> = {};
    const tagClusters: Record<string, number> = {};
    const languages: Record<string, number> = {};

    for (const s of students) {
      const lang = s.family_language ?? "en";
      languages[lang] = (languages[lang] ?? 0) + 1;

      for (const tag of s.support_tags ?? []) {
        if (tag.startsWith("eal_level")) {
          ealLevels[tag] = (ealLevels[tag] ?? 0) + 1;
        } else {
          // Cluster related tags
          const cluster = tagToCluster(tag);
          tagClusters[cluster] = (tagClusters[cluster] ?? 0) + 1;
        }
      }
    }

    return { ealLevels, tagClusters, languages };
  }, [students]);

  const cx = 90;
  const cy = 90;

  const ealSegments = [
    { label: "EAL Level 1", value: stats.ealLevels.eal_level_1 ?? 0, color: "var(--color-danger)" },
    { label: "EAL Level 2", value: stats.ealLevels.eal_level_2 ?? 0, color: "var(--color-warning)" },
    { label: "EAL Level 3", value: stats.ealLevels.eal_level_3 ?? 0, color: "var(--color-success)" },
    { label: "Non-EAL", value: students.length - Object.values(stats.ealLevels).reduce((a, b) => a + b, 0), color: "var(--color-border)" },
  ].filter((s) => s.value > 0);

  const clusterOrder = ["transition", "sensory", "academic", "extension", "social", "executive", "other"];
  const clusterColors: Record<string, string> = {
    transition: "var(--color-warning)",
    sensory: "var(--color-danger)",
    academic: "var(--color-analysis)",
    extension: "var(--color-success)",
    social: "var(--color-provenance)",
    executive: "var(--color-section-sun)",
    other: "var(--color-section-slate)",
  };

  const tagSegments = clusterOrder
    .filter((c) => (stats.tagClusters[c] ?? 0) > 0)
    .map((c) => ({ label: c, value: stats.tagClusters[c], color: clusterColors[c] ?? "var(--color-border)" }));

  const langSegments = Object.entries(stats.languages)
    .sort((a, b) => b[1] - a[1])
    .map(([code, count]) => ({
      label: LANG_LABELS[code] ?? code,
      value: count,
      color: LANG_COLORS[code] ?? "var(--color-section-slate)",
    }));

  const ealTotal = Object.values(stats.ealLevels).reduce((a, b) => a + b, 0);
  const langCount = Object.keys(stats.languages).length;

  const topLang = langSegments[0];
  const ariaLabel =
    `Classroom composition: ${students.length} students, ${ealTotal} English language learners across ${Object.keys(stats.ealLevels).length} levels, ` +
    `${langCount} home ${langCount === 1 ? "language" : "languages"}` +
    (topLang && topLang.label !== "English" ? ` (${topLang.label} most common)` : "") +
    `, ${tagSegments.length} support clusters.`;

  return (
    <div className={`viz-composition${mounted ? " viz-composition--mounted" : ""}`}>
      <div className="viz-header">
        <h4 className="viz-title">Classroom Profile</h4>
        <span className="viz-subtitle">{students.length} students · {ealTotal} EAL · {langCount} languages</span>
      </div>
      <div className="viz-composition__body">
        <svg width="180" height="180" viewBox="0 0 180 180" className="viz-svg" role="img"
          aria-label={ariaLabel}>
          <g className="viz-composition__ring viz-composition__ring--outer">
            {/* Outer ring: EAL levels */}
            {drawDonutRing(cx, cy, 78, 14, ealSegments)}
          </g>
          <g className="viz-composition__ring viz-composition__ring--middle">
            {/* Middle ring: support tag clusters */}
            {drawDonutRing(cx, cy, 58, 12, tagSegments)}
          </g>
          <g className="viz-composition__ring viz-composition__ring--inner">
            {/* Inner ring: languages */}
            {drawDonutRing(cx, cy, 40, 10, langSegments)}
          </g>
          {/* Center count */}
          <text x={cx} y={cy - 4} textAnchor="middle" className="viz-gauge-number">{students.length}</text>
          <text x={cx} y={cy + 10} textAnchor="middle" className="viz-gauge-label">students</text>
        </svg>
        <div className="viz-composition__legends">
          <div className="viz-legend-group">
            <span className="viz-legend-title">EAL</span>
            {ealSegments.filter((s) => s.label !== "Non-EAL").map((s) => (
              <span key={s.label} className="viz-legend-item">
                <span className="viz-legend-dot" style={{ background: s.color }} />
                {s.label.replace("EAL ", "L")}: {s.value}
              </span>
            ))}
          </div>
          <div className="viz-legend-group">
            <span className="viz-legend-title">Needs</span>
            {tagSegments.slice(0, 4).map((s) => (
              <span key={s.label} className="viz-legend-item">
                <span className="viz-legend-dot" style={{ background: s.color }} />
                {s.label}: {s.value}
              </span>
            ))}
          </div>
          <div className="viz-legend-group">
            <span className="viz-legend-title">Languages</span>
            {langSegments.filter((s) => s.label !== "English").map((s) => (
              <span key={s.label} className="viz-legend-item">
                <span className="viz-legend-dot" style={{ background: s.color }} />
                {s.label}: {s.value}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function tagToCluster(tag: string): string {
  if (/transition|routine|pre_correction/.test(tag)) return "transition";
  if (/sensory|movement|standing|break/.test(tag)) return "sensory";
  if (/math|reading|literacy|vocab|articulation/.test(tag)) return "academic";
  if (/extension|mentor|strong|writer/.test(tag)) return "extension";
  if (/social|peer|quiet/.test(tag)) return "social";
  if (/executive|checklist|materials/.test(tag)) return "executive";
  return "other";
}


/* ================================================================
   4. COMPLEXITY HEATMAP (Week View)
   ================================================================
   5-row × N-column grid: rows = weekdays, columns = time blocks.
   Cell color = risk level (green/amber/red).
   Answers: "When is it hard?"
   ================================================================ */

interface ComplexityHeatmapProps {
  blocks: ComplexityBlock[];
}

const LEVEL_COLORS = {
  low: "var(--color-forecast-low-bg, var(--color-success))",
  medium: "var(--color-forecast-medium-bg, var(--color-warning))",
  high: "var(--color-forecast-high-bg, var(--color-danger))",
};

export function ComplexityHeatmap({ blocks }: ComplexityHeatmapProps) {
  if (blocks.length === 0) return null;

  const cellW = Math.max(44, Math.min(72, 340 / blocks.length));
  const cellH = 28;
  const labelW = 12;
  const svgW = labelW + blocks.length * (cellW + 2);
  const svgH = cellH + 8;

  return (
    <div className="viz-heatmap">
      <div className="viz-header">
        <h4 className="viz-title">Risk Heatmap</h4>
        <div className="viz-heatmap__legend">
          <span className="viz-heatmap__legend-item viz-heatmap__legend-item--low">Low</span>
          <span className="viz-heatmap__legend-item viz-heatmap__legend-item--medium">Med</span>
          <span className="viz-heatmap__legend-item viz-heatmap__legend-item--high">High</span>
        </div>
      </div>
      <div className="viz-heatmap__scroll">
        <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="viz-svg"
          role="img" aria-label="Complexity heatmap by time block">
          {blocks.map((block, col) => {
            const x = labelW + col * (cellW + 2);
            return (
              <g key={col}>
                <rect
                  x={x} y={0}
                  width={cellW} height={cellH}
                  rx={4}
                  fill={LEVEL_COLORS[block.level]}
                  opacity={0.85}
                >
                  <title>{block.time_slot}: {block.activity} — {block.level}</title>
                </rect>
                <text
                  x={x + cellW / 2} y={cellH / 2 + 1}
                  textAnchor="middle" dominantBaseline="middle"
                  className="viz-heatmap__cell-text"
                >
                  {block.time_slot.split("-")[0]?.replace(/^0/, "") ?? ""}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}


/* ================================================================
   5. INTERVENTION RECENCY TIMELINE
   ================================================================
   Horizontal strip per student showing how long since intervention.
   Sorted by staleness.
   Answers: "Who's gone dark?"
   ================================================================ */

interface RecencyTimelineProps {
  students: StudentSummary[];
  maxDays?: number;
  onStudentClick?: (alias: string) => void;
}

export function InterventionRecencyTimeline({ students, maxDays = 14, onStudentClick }: RecencyTimelineProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const sorted = useMemo(() => {
    return [...students]
      .filter((s) => s.last_intervention_days !== null)
      .sort((a, b) => (b.last_intervention_days ?? 0) - (a.last_intervention_days ?? 0))
      .slice(0, 10);
  }, [students]);

  if (sorted.length === 0) return null;

  const staleCount = sorted.filter(
    (s) => (s.last_intervention_days ?? 0) > 7,
  ).length;
  const ariaLabel =
    `Intervention recency: ${sorted.length} ${sorted.length === 1 ? "student" : "students"} tracked` +
    (staleCount > 0
      ? `, ${staleCount} over a week without a check-in.`
      : ", all within a week.");

  return (
    <div className="viz-recency" role="group" aria-label={ariaLabel}>
      <div className="viz-header">
        <h4 className="viz-title">Intervention Recency</h4>
        <span className="viz-subtitle">Days since last check-in</span>
      </div>
      <div className="viz-recency__list">
        {sorted.map((s, i) => {
          const days = s.last_intervention_days ?? 0;
          const pct = Math.min(1, days / maxDays);
          const displayPct = mounted ? pct : 0;
          const tone = days <= 3 ? "success" : days <= 7 ? "warning" : "danger";
          return (
            <button
              key={s.alias}
              className="viz-recency__row"
              type="button"
              onClick={onStudentClick ? () => onStudentClick(s.alias) : undefined}
              aria-label={`${s.alias}: ${days} days since intervention`}
            >
              <span className="viz-recency__name">{s.alias}</span>
              <span className="viz-recency__bar-track">
                <span
                  className={`viz-recency__bar viz-recency__bar--${tone}`}
                  style={{
                    width: `${displayPct * 100}%`,
                    transitionDelay: `${i * 45}ms`,
                  }}
                />
              </span>
              <span className={`viz-recency__days viz-recency__days--${tone}`}>{days}d</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}


/* ================================================================
   6. EA LOAD STACKED BARS
   ================================================================
   Horizontal bar per time block showing students the EA supports.
   Each segment = a student, color-coded by load intensity.
   Answers: "Where is the EA overloaded?"
   ================================================================ */

interface EALoadStackedBarsProps {
  blocks: EALoadBlock[];
}

const LOAD_FILL: Record<EALoadLevel, string> = {
  high: "var(--color-danger)",
  medium: "var(--color-warning)",
  low: "var(--color-success)",
  break: "var(--color-section-slate)",
};

export function EALoadStackedBars({ blocks }: EALoadStackedBarsProps) {
  if (blocks.length === 0) return null;

  const maxStudents = Math.max(1, ...blocks.map((b) => b.supported_students.length));
  const barMaxW = 200;

  return (
    <div className="viz-ea-bars">
      <div className="viz-header">
        <h4 className="viz-title">EA Load Distribution</h4>
        <span className="viz-subtitle">Students per block</span>
      </div>
      <div className="viz-ea-bars__list">
        {blocks.map((block, i) => {
          const count = block.supported_students.length;
          const isOverloaded = block.load_level === "high" && count >= 3;
          return (
            <div key={`${block.time_slot}-${i}`}
              className={`viz-ea-bars__row ${isOverloaded ? "viz-ea-bars__row--overloaded" : ""}`}>
              <span className="viz-ea-bars__time">{block.time_slot}</span>
              <div className="viz-ea-bars__track" style={{ width: barMaxW }}>
                {block.supported_students.map((student, si) => {
                  const segW = barMaxW / maxStudents;
                  return (
                    <span
                      key={student}
                      className="viz-ea-bars__segment"
                      style={{
                        width: segW,
                        background: LOAD_FILL[block.load_level],
                        left: si * segW,
                      }}
                      title={student}
                    />
                  );
                })}
                {count === 0 && (
                  <span className="viz-ea-bars__empty-label">
                    {block.ea_available ? "No students" : "EA unavailable"}
                  </span>
                )}
              </div>
              <span className={`viz-ea-bars__badge viz-ea-bars__badge--${block.load_level}`}>
                {count > 0 ? count : block.load_level === "break" ? "—" : "0"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ================================================================
   7. SUPPORT PATTERN RADAR
   ================================================================
   Spider chart with axes: transitions, academics, sensory,
   social, extension, executive function.
   Answers: "What's the shape of my classroom's needs?"
   ================================================================ */

interface PatternRadarProps {
  themes: RecurringTheme[];
}

const RADAR_AXES = [
  { key: "transition", label: "Transitions" },
  { key: "academic", label: "Academic" },
  { key: "sensory", label: "Sensory" },
  { key: "social", label: "Social" },
  { key: "extension", label: "Extension" },
  { key: "executive", label: "Executive" },
];

function themeToAxis(theme: string): string {
  const t = theme.toLowerCase();
  if (/transition|routine|arrival|settling|pack|after.?lunch/.test(t)) return "transition";
  if (/academic|reading|writing|math|literacy|comprehen|vocab/.test(t)) return "academic";
  if (/sensory|movement|regulation|calm|break|stim/.test(t)) return "sensory";
  if (/social|peer|interact|conflict|friend/.test(t)) return "social";
  if (/extension|advance|gifted|enrichm|mentor|exceed/.test(t)) return "extension";
  if (/executive|organiz|plan|focus|attention|task.?initi/.test(t)) return "executive";
  return "academic"; // default bucket
}

export function SupportPatternRadar({ themes }: PatternRadarProps) {
  const axisData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const theme of themes) {
      const axis = themeToAxis(theme.theme);
      counts[axis] = (counts[axis] ?? 0) + theme.evidence_count;
    }
    const max = Math.max(1, ...Object.values(counts));
    return RADAR_AXES.map((a) => ({
      ...a,
      value: (counts[a.key] ?? 0) / max,
      raw: counts[a.key] ?? 0,
    }));
  }, [themes]);

  if (themes.length === 0) return null;

  const cx = 100;
  const cy = 100;
  const maxR = 70;
  const n = axisData.length;

  function toPoint(i: number, r: number) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  }

  // Background rings
  const rings = [0.25, 0.5, 0.75, 1];
  const dataPoints = axisData.map((a, i) => toPoint(i, a.value * maxR));
  const dataPath = dataPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ") + " Z";

  return (
    <div className="viz-radar">
      <div className="viz-header">
        <h4 className="viz-title">Support Pattern Shape</h4>
        <span className="viz-subtitle">Theme distribution from records</span>
      </div>
      <svg width="200" height="200" viewBox="0 0 200 200" className="viz-svg" role="img"
        aria-label="Radar chart of support pattern themes">
        {/* Background rings */}
        {rings.map((pct) => (
          <polygon key={pct}
            points={Array.from({ length: n }, (_, i) => {
              const p = toPoint(i, pct * maxR);
              return `${p.x},${p.y}`;
            }).join(" ")}
            fill="none" stroke="var(--color-border)" strokeWidth={0.5} opacity={0.5}
          />
        ))}
        {/* Axis lines + labels */}
        {axisData.map((a, i) => {
          const end = toPoint(i, maxR + 6);
          const labelP = toPoint(i, maxR + 18);
          return (
            <g key={a.key}>
              <line x1={cx} y1={cy} x2={end.x} y2={end.y}
                stroke="var(--color-border)" strokeWidth={0.7} />
              <text x={labelP.x} y={labelP.y}
                textAnchor="middle" dominantBaseline="middle"
                className="viz-radar__label">
                {a.label}
              </text>
            </g>
          );
        })}
        {/* Data shape */}
        <polygon points={dataPath.replace(/[MLZ]/g, "").trim().replace(/\s+/g, " ")}
          fill="var(--color-accent)" fillOpacity={0.2}
          stroke="var(--color-accent)" strokeWidth={2}
        />
        {/* Data dots */}
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3}
            fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth={1.5}>
            <title>{axisData[i].label}: {axisData[i].raw} records</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}


/* ================================================================
   8. ENHANCED PLAN STREAK (Mini Calendar Heatmap)
   ================================================================
   4-week × 5-day grid (like a GitHub contribution chart).
   Green = plan completed, amber = partial, empty = missed.
   Answers: "Am I building momentum?"
   ================================================================ */

interface PlanStreakCalendarProps {
  plans14d: (0 | 1)[];
  onSegmentClick?: (payload: { dayIndex: number; planned: boolean }) => void;
}

export function PlanStreakCalendar({ plans14d, onSegmentClick }: PlanStreakCalendarProps) {
  // Fill to 20 cells (4 weeks of weekdays) — pad with nulls for future
  const cells: (0 | 1 | null)[] = [];

  // Most recent 14 plan data, padded to 20
  for (let i = 0; i < 20; i++) {
    const dataIdx = i - (20 - plans14d.length);
    if (dataIdx >= 0 && dataIdx < plans14d.length) {
      cells.push(plans14d[dataIdx]);
    } else {
      cells.push(null);
    }
  }

  const cellSize = 14;
  const gap = 3;
  const cols = 5; // weekdays
  const rows = 4; // weeks
  const svgW = cols * (cellSize + gap);
  const svgH = rows * (cellSize + gap);
  const planned = plans14d.filter((p) => p === 1).length;

  // Map from cell idx to the original plans14d index
  const dataOffset = 20 - plans14d.length;

  return (
    <div className="viz-plan-streak">
      <div className="viz-plan-streak__header">
        <span className="viz-plan-streak__count">{planned} of {plans14d.length} days planned</span>
      </div>
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="viz-svg"
        role="img" aria-label={`Plan streak: ${planned} of ${plans14d.length} days planned`}>
        {cells.map((val, idx) => {
          const row = Math.floor(idx / cols);
          const col = idx % cols;
          const x = col * (cellSize + gap);
          const y = row * (cellSize + gap);
          const fill = val === null
            ? "var(--color-bg-muted)"
            : val === 1
              ? "var(--color-success)"
              : "color-mix(in srgb, var(--color-border) 50%, transparent)";
          const baseRect = (
            <rect x={x} y={y} width={cellSize} height={cellSize} rx={3}
              fill={fill} opacity={val === null ? 0.3 : 0.85}>
              <title>{val === null ? "No data" : val === 1 ? "Planned" : "No plan"}</title>
            </rect>
          );
          if (onSegmentClick && val !== null) {
            const dayIndex = idx - dataOffset;
            const isPlanned = val === 1;
            const ariaLabel = `Day ${dayIndex + 1}: ${isPlanned ? "Planned" : "Missed"}`;
            return (
              <g key={idx}>
                {baseRect}
                <rect
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  rx={3}
                  fill="transparent"
                  className="viz-plan-streak__cell--clickable"
                  role="button"
                  tabIndex={0}
                  aria-label={ariaLabel}
                  data-testid={`viz-plan-streak-cell-${dayIndex}`}
                  onClick={() => onSegmentClick({ dayIndex, planned: isPlanned })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSegmentClick({ dayIndex, planned: isPlanned });
                    }
                  }}
                />
              </g>
            );
          }
          return <g key={idx}>{baseRect}</g>;
        })}
      </svg>
    </div>
  );
}


/* ================================================================
   9. FOLLOW-UP DECAY INDICATORS
   ================================================================
   Aging bar per follow-up gap that fills green → amber → red.
   Answers: "How stale are my follow-ups?"
   ================================================================ */

interface FollowUpDecayProps {
  gaps: FollowUpGap[];
  onStudentClick?: (alias: string) => void;
}

export function FollowUpDecayIndicators({ gaps, onStudentClick }: FollowUpDecayProps) {
  if (gaps.length === 0) return null;

  const sorted = [...gaps].sort((a, b) => b.days_since - a.days_since);
  const maxDays = Math.max(14, ...sorted.map((g) => g.days_since));

  return (
    <div className="viz-decay">
      <div className="viz-header">
        <h4 className="viz-title">Follow-Up Aging</h4>
        <span className="viz-subtitle">{sorted.length} gap{sorted.length !== 1 ? "s" : ""} awaiting action</span>
      </div>
      <div className="viz-decay__list">
        {sorted.slice(0, 8).map((gap, i) => {
          const pct = Math.min(1, gap.days_since / maxDays);
          const tone = gap.days_since <= 3 ? "success" : gap.days_since <= 7 ? "warning" : "danger";
          return (
            <button
              key={`${gap.original_record_id}-${i}`}
              className="viz-decay__row"
              type="button"
              onClick={onStudentClick && gap.student_refs[0]
                ? () => onStudentClick(gap.student_refs[0])
                : undefined}
              aria-label={`${gap.student_refs.join(", ")}: ${gap.days_since} days overdue`}
            >
              <span className="viz-decay__students">{gap.student_refs.join(", ")}</span>
              <span className="viz-decay__bar-track">
                <span
                  className={`viz-decay__bar viz-decay__bar--${tone}`}
                  style={{ width: `${pct * 100}%` }}
                />
              </span>
              <span className={`viz-decay__days viz-decay__days--${tone}`}>{gap.days_since}d</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}


/* ================================================================
   10. MESSAGE APPROVAL FUNNEL
   ================================================================
   Visual pipeline: Generated → Reviewed → Approved.
   Broken by language.
   Answers: "Where's the communication bottleneck?"
   ================================================================ */

interface MessageFunnelProps {
  messagesTotal: number;
  messagesApproved: number;
}

export function MessageApprovalFunnel({ messagesTotal, messagesApproved }: MessageFunnelProps) {
  if (messagesTotal === 0) return null;

  const pending = messagesTotal - messagesApproved;
  const approvalRate = messagesTotal > 0 ? (messagesApproved / messagesTotal) * 100 : 0;

  const barW = 200;
  const genW = barW;
  const approvedW = (messagesApproved / messagesTotal) * barW;

  return (
    <div className="viz-funnel">
      <div className="viz-header">
        <h4 className="viz-title">Message Pipeline</h4>
        <span className="viz-subtitle">{Math.round(approvalRate)}% approval rate</span>
      </div>
      <div className="viz-funnel__body">
        <div className="viz-funnel__stage">
          <span className="viz-funnel__stage-label">Generated</span>
          <div className="viz-funnel__bar" style={{ width: genW, background: "var(--color-section-slate)" }}>
            <span className="viz-funnel__bar-text">{messagesTotal}</span>
          </div>
        </div>
        <div className="viz-funnel__stage">
          <span className="viz-funnel__stage-label">Approved</span>
          <div className="viz-funnel__bar" style={{ width: Math.max(24, approvedW), background: "var(--color-success)" }}>
            <span className="viz-funnel__bar-text">{messagesApproved}</span>
          </div>
        </div>
        {pending > 0 && (
          <div className="viz-funnel__stage">
            <span className="viz-funnel__stage-label">Pending</span>
            <div className="viz-funnel__bar" style={{ width: Math.max(24, (pending / messagesTotal) * barW), background: "var(--color-warning)" }}>
              <span className="viz-funnel__bar-text">{pending}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


/* ================================================================
   11. SCAFFOLD EFFECTIVENESS (Horizontal Bars)
   ================================================================
   (Used as a static reference from the classroom profile when no
    outcome data is available — shows scaffold frequency.)
   ================================================================ */

interface ScaffoldBarProps {
  scaffolds: { name: string; count: number }[];
}

export function ScaffoldEffectivenessChart({ scaffolds }: ScaffoldBarProps) {
  if (scaffolds.length === 0) return null;

  const maxCount = Math.max(1, ...scaffolds.map((s) => s.count));

  return (
    <div className="viz-scaffold">
      <div className="viz-header">
        <h4 className="viz-title">Active Scaffolds</h4>
        <span className="viz-subtitle">Frequency across students</span>
      </div>
      <div className="viz-scaffold__list">
        {scaffolds.slice(0, 8).map((s) => {
          const pct = s.count / maxCount;
          return (
            <div key={s.name} className="viz-scaffold__row">
              <span className="viz-scaffold__label">{s.name.replace(/_/g, " ")}</span>
              <span className="viz-scaffold__bar-track">
                <span
                  className="viz-scaffold__bar"
                  style={{ width: `${pct * 100}%` }}
                />
              </span>
              <span className="viz-scaffold__count">{s.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ================================================================
   12. PER-STUDENT SPARKLINE INDICATOR
   ================================================================
   Tiny inline sparkline showing a simple attention level.
   Uses pending counts and recency to generate a micro-visual.
   ================================================================ */

interface StudentSparkProps {
  student: StudentSummary;
}

export function StudentSparkIndicator({ student }: StudentSparkProps) {
  // Synthesize a simple "heat" signal as 3 synthetic data points
  // based on available metrics (no time-series in StudentSummary)
  const base = student.pending_action_count;
  const recency = student.last_intervention_days ?? 0;
  const patterns = student.active_pattern_count;

  const signal = [
    Math.max(0, base - 1),
    base,
    base + Math.min(3, Math.floor(recency / 3)) + patterns,
  ];

  const max = Math.max(1, ...signal);
  const w = 40;
  const h = 12;
  const padding = 1;

  const points = signal
    .map((v, i) => {
      const x = padding + (i / (signal.length - 1)) * (w - padding * 2);
      const y = padding + (1 - v / max) * (h - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const tone = base > 2 ? "var(--color-danger)" : base > 0 ? "var(--color-warning)" : "var(--color-success)";

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true"
      className="viz-student-spark">
      <polyline
        points={points}
        fill="none" stroke={tone} strokeWidth={1.5}
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

/* ================================================================
   13. DebtTrendSparkline — 14-day miniature sparkline of total debt
   ================================================================ */

interface DebtTrendProps {
  data: number[];
  onSegmentClick?: (payload: { trendKey: "debt"; label: string; data: number[] }) => void;
}

export function DebtTrendSparkline({ data, onSegmentClick }: DebtTrendProps) {
  const w = 140;
  const h = 32;
  const pad = 4;

  const { points, lastX, lastY, first, last, trend, tone } = useMemo(() => {
    const trimmed = data.slice(-14);
    const max = Math.max(...trimmed, 1);
    const coords = trimmed.map((v, i) => ({
      x: pad + (i / Math.max(trimmed.length - 1, 1)) * (w - pad * 2),
      y: pad + (1 - v / max) * (h - pad * 2),
    }));
    const pts = coords.map((c) => `${c.x},${c.y}`).join(" ");
    const endPt = coords[coords.length - 1] ?? { x: 0, y: 0 };
    const f = trimmed[0] ?? 0;
    const l = trimmed[trimmed.length - 1] ?? 0;
    const tr = l > f ? "rising" : l < f ? "falling" : "flat";
    const tn = tr === "rising" ? "var(--color-danger)" : tr === "falling" ? "var(--color-success)" : "var(--color-warning)";
    return { points: pts, lastX: endPt.x, lastY: endPt.y, first: f, last: l, trend: tr, tone: tn, count: trimmed.length };
  }, [data]);

  if (data.length < 2) return null;

  const toneClass = trend === "rising" ? "danger" : trend === "falling" ? "success" : "warning";
  const count = Math.min(data.length, 14);

  return (
    <div
      className={`viz-debt-trend${onSegmentClick ? " viz-debt-trend--clickable" : ""}`}
      role={onSegmentClick ? "button" : "img"}
      aria-label={`Debt trend over ${count} days: ${trend}`}
      {...(onSegmentClick
        ? {
            tabIndex: 0,
            "data-testid": "viz-debt-trend-hit",
            onClick: () => onSegmentClick({ trendKey: "debt", label: "Debt trend", data }),
            onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
              if (e.key === "Enter" || e.key === " ") {
                if (e.key === " ") e.preventDefault();
                onSegmentClick({ trendKey: "debt", label: "Debt trend", data });
              }
            },
          }
        : {})}
    >
      <div className="viz-header">
        <span className="viz-title">Debt Trend</span>
        <span className={`viz-tone-badge viz-tone-badge--${toneClass}`}>
          {trend === "rising" ? "↑ Rising" : trend === "falling" ? "↓ Falling" : "→ Flat"}
        </span>
      </div>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="viz-svg">
        <polyline
          points={points}
          fill="none"
          stroke={tone}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={lastX} cy={lastY} r={2.5} fill={tone} />
      </svg>
      <div className="viz-debt-trend__range">
        <span className="viz-debt-trend__label">{count}d ago: {first}</span>
        <span className="viz-debt-trend__label">Today: {last}</span>
      </div>
    </div>
  );
}

/* ================================================================
   14. ComplexityTrendCalendar — 14-day grid of peak complexity levels
   ================================================================ */

interface ComplexityTrendProps {
  data: number[];
  onSegmentClick?: (payload: { trendKey: "complexity"; label: string; data: number[]; highlightIndex: number }) => void;
}

const COMPLEXITY_LEVEL_COLORS: Record<number, string> = {
  0: "var(--color-success)",
  1: "var(--color-warning)",
  2: "var(--color-pending, #e67e22)",
  3: "var(--color-danger)",
};

const COMPLEXITY_LEVEL_LABELS: Record<number, string> = {
  0: "Low",
  1: "Medium",
  2: "High",
  3: "Critical",
};

export function ComplexityTrendCalendar({ data, onSegmentClick }: ComplexityTrendProps) {
  const trimmed = useMemo(() => data.slice(-14), [data]);
  if (trimmed.length === 0) return null;

  return (
    <div className="viz-complexity-cal" role="img" aria-label="Peak complexity over 14 days">
      <div className="viz-header">
        <span className="viz-title">Complexity · 14 Days</span>
      </div>
      <div className="viz-complexity-cal__grid">
        {trimmed.map((level, i) => {
          const clamped = Math.min(Math.max(level, 0), 3);
          if (onSegmentClick) {
            return (
              <button
                key={i}
                type="button"
                tabIndex={0}
                className="viz-complexity-cal__cell viz-complexity-cal__cell--clickable"
                style={{ background: COMPLEXITY_LEVEL_COLORS[clamped] }}
                title={`Day ${i + 1}: ${COMPLEXITY_LEVEL_LABELS[clamped]}`}
                aria-label={`Day ${i + 1}: ${COMPLEXITY_LEVEL_LABELS[clamped]}`}
                data-testid="viz-complexity-cell"
                onClick={() =>
                  onSegmentClick({ trendKey: "complexity", label: "Peak complexity", data, highlightIndex: i })
                }
              />
            );
          }
          return (
            <div
              key={i}
              className="viz-complexity-cal__cell"
              style={{ background: COMPLEXITY_LEVEL_COLORS[clamped] }}
              title={`Day ${i + 1}: ${COMPLEXITY_LEVEL_LABELS[clamped]}`}
            />
          );
        })}
      </div>
      <div className="viz-complexity-cal__legend">
        {[0, 1, 2, 3].map((l) => (
          <span key={l} className="viz-complexity-cal__legend-item">
            <span className="viz-complexity-cal__swatch" style={{ background: COMPLEXITY_LEVEL_COLORS[l] }} />
            {COMPLEXITY_LEVEL_LABELS[l]}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   15. InterventionTimeline — dot timeline showing intervention dates
   ================================================================ */

interface IntTimelineProps {
  records: InterventionRecord[];
}

export function InterventionTimeline({ records }: IntTimelineProps) {
  const sorted = useMemo(() => {
    return [...records]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(-20)
      .map((r) => ({ ...r, _ts: new Date(r.created_at).getTime() }));
  }, [records]);

  if (sorted.length === 0) return null;

  const minDate = sorted[0]._ts;
  const maxDate = sorted[sorted.length - 1]._ts;
  const range = Math.max(maxDate - minDate, 86400000); // at least 1 day
  const w = 260;
  const h = 40;
  const pad = 12;

  return (
    <div className="viz-int-timeline" role="img" aria-label={`${sorted.length} interventions over time`}>
      <div className="viz-header">
        <span className="viz-title">Intervention Timeline</span>
        <span className="viz-subtitle">{sorted.length} records</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="viz-svg viz-int-timeline__svg">
        {/* baseline */}
        <line x1={pad} y1={h / 2} x2={w - pad} y2={h / 2}
          stroke="var(--color-border)" strokeWidth={1} />
        {sorted.map((record) => {
          const x = pad + ((record._ts - minDate) / range) * (w - pad * 2);
          const fill = record.follow_up_needed
            ? "var(--color-warning)"
            : "var(--color-success)";
          return (
            <circle
              key={record.record_id}
              cx={x}
              cy={h / 2}
              r={4}
              fill={fill}
              opacity={0.85}
            >
              <title>
                {new Date(record._ts).toLocaleDateString()} — {record.follow_up_needed ? "Needs follow-up" : "Resolved"}
              </title>
            </circle>
          );
        })}
      </svg>
      <div className="viz-int-timeline__legend">
        <span className="viz-int-timeline__legend-item">
          <span className="viz-int-timeline__dot viz-int-timeline__dot--resolved" /> Resolved
        </span>
        <span className="viz-int-timeline__legend-item">
          <span className="viz-int-timeline__dot viz-int-timeline__dot--followup" /> Needs follow-up
        </span>
      </div>
    </div>
  );
}

/* ================================================================
   16. FollowUpSuccessRate — mini donut showing resolution rate
   ================================================================ */

interface FollowUpRateProps {
  records: InterventionRecord[];
}

export function FollowUpSuccessRate({ records }: FollowUpRateProps) {
  const { resolved, total, pct } = useMemo(() => {
    const t = records.length;
    const r = records.filter((rec) => !rec.follow_up_needed).length;
    return { resolved: r, total: t, pct: t > 0 ? Math.round((r / t) * 100) : 0 };
  }, [records]);

  if (total === 0) return null;

  const size = 56;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);
  const tone = pct >= 70 ? "success" : pct >= 40 ? "warning" : "danger";

  return (
    <div className="viz-followup-rate" role="img" aria-label={`${pct}% resolution rate`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--color-border)" strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={`var(--color-${tone})`}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x={size / 2} y={size / 2}
          textAnchor="middle" dominantBaseline="central"
          fontSize="12" fontWeight="600"
          fill={`var(--color-${tone})`}
        >
          {pct}%
        </text>
      </svg>
      <div className="viz-followup-rate__detail">
        <span className="viz-followup-rate__label">Resolved</span>
        <span className="viz-followup-rate__count">{resolved} / {total}</span>
      </div>
    </div>
  );
}

/* ================================================================
   17. SCHEDULE LOAD STRIP
   ================================================================
   Horizontal time-block strip: each slot is a coloured pill
   proportional to student_count. Answers: "Where is the EA busiest?"
   ================================================================ */

interface ScheduleLoadBlock {
  time_slot: string;
  student_count: number;
  label: string;
}

interface ScheduleLoadStripProps {
  blocks: ScheduleLoadBlock[];
}

export function ScheduleLoadStrip({ blocks }: ScheduleLoadStripProps) {
  if (blocks.length === 0) return null;

  const max = Math.max(...blocks.map((b) => b.student_count), 1);

  function tone(count: number): string {
    const ratio = count / max;
    if (ratio >= 0.75) return "var(--color-alert, #e74c3c)";
    if (ratio >= 0.5) return "var(--color-sun, #f0ad4e)";
    return "var(--color-sage, #5cb85c)";
  }

  return (
    <div className="viz-schedule-strip" role="img" aria-label="Schedule load by time slot">
      {blocks.map((block, i) => (
        <div key={i} className="viz-schedule-strip__slot" title={`${block.time_slot}: ${block.label} (${block.student_count} students)`}>
          <div
            className="viz-schedule-strip__bar"
            style={{
              height: `${Math.max(20, (block.student_count / max) * 100)}%`,
              backgroundColor: tone(block.student_count),
            }}
          />
          <span className="viz-schedule-strip__label">{block.time_slot}</span>
        </div>
      ))}
    </div>
  );
}

/* ================================================================
   18. VARIANT SUMMARY STRIP
   ================================================================
   Small horizontal summary showing variant type distribution
   and time comparison bars. Answers: "What did differentiation produce?"
   ================================================================ */

interface VariantSummaryItem {
  variant_type: string;
  estimated_minutes: number;
  title: string;
}

interface VariantSummaryStripProps {
  variants: VariantSummaryItem[];
  onSegmentClick?: (payload: { variantType: string; label: string; variants: VariantSummaryItem[] }) => void;
}

const VARIANT_TONE: Record<string, string> = {
  core: "var(--color-slate, #6c757d)",
  eal_supported: "var(--color-accent, #0d6efd)",
  chunked: "var(--color-sage, #5cb85c)",
  ea_small_group: "var(--color-sun, #f0ad4e)",
  extension: "var(--color-analysis, #8b5cf6)",
};

function prettyVariantType(vt: string): string {
  return vt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function VariantSummaryStrip({ variants, onSegmentClick }: VariantSummaryStripProps) {
  if (variants.length === 0) return null;

  const maxMin = Math.max(...variants.map((v) => v.estimated_minutes), 1);

  return (
    <div className="viz-variant-strip" role="img" aria-label="Variant summary">
      {variants.map((v, i) => {
        const inner = (
          <>
            <div className="viz-variant-strip__bar-wrap">
              <div
                className="viz-variant-strip__bar"
                style={{
                  width: `${Math.max(10, (v.estimated_minutes / maxMin) * 100)}%`,
                  backgroundColor: VARIANT_TONE[v.variant_type] ?? "var(--color-slate, #6c757d)",
                }}
              />
            </div>
            <span className="viz-variant-strip__type">{prettyVariantType(v.variant_type)}</span>
            <span className="viz-variant-strip__min">{v.estimated_minutes}m</span>
          </>
        );
        if (onSegmentClick) {
          return (
            <button
              key={i}
              type="button"
              className="viz-variant-strip__item viz-variant-strip__item--clickable"
              onClick={() => onSegmentClick({ variantType: v.variant_type, label: prettyVariantType(v.variant_type), variants })}
            >
              {inner}
            </button>
          );
        }
        return (
          <div key={i} className="viz-variant-strip__item">
            {inner}
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================
   19. STUDENT–THEME HEATMAP
   ================================================================
   Grid of student × recurring-theme cells. Colour intensity =
   how many themes a student appears in.
   Answers: "Which students cluster on which needs?"
   ================================================================ */

interface StudentThemeHeatmapProps {
  themes: RecurringTheme[];
}

export function StudentThemeHeatmap({ themes }: StudentThemeHeatmapProps) {
  const { students, cells, maxVal } = useMemo(() => {
    const studentSet = new Set<string>();
    for (const t of themes) t.student_refs.forEach((s) => studentSet.add(s));
    const stuArr = [...studentSet].sort();
    const grid: Record<string, Record<string, number>> = {};
    let mx = 1;
    for (const t of themes) {
      for (const s of t.student_refs) {
        grid[s] = grid[s] ?? {};
        grid[s][t.theme] = (grid[s][t.theme] ?? 0) + t.evidence_count;
        if (grid[s][t.theme] > mx) mx = grid[s][t.theme];
      }
    }
    return { students: stuArr, cells: grid, maxVal: mx };
  }, [themes]);

  if (themes.length === 0 || students.length === 0) return null;

  const cellH = 28;
  const cellW = 40;
  const labelW = 80;
  const headerH = 60;
  const svgW = labelW + themes.length * cellW;
  const svgH = headerH + students.length * cellH;

  function fill(val: number): string {
    const ratio = val / maxVal;
    if (ratio === 0) return "var(--color-surface-secondary, #f1f3f5)";
    const alpha = 0.2 + ratio * 0.8;
    return `rgba(var(--color-alert-rgb, 231, 76, 60), ${alpha.toFixed(2)})`;
  }

  return (
    <div className="viz-student-theme-heatmap" role="img" aria-label="Student theme heatmap">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" preserveAspectRatio="xMinYMin meet">
        {/* Column headers — theme names */}
        {themes.map((t, ci) => (
          <text
            key={`h-${ci}`}
            x={labelW + ci * cellW + cellW / 2}
            y={headerH - 6}
            textAnchor="end"
            fontSize="9"
            fill="var(--color-text-secondary, #6c757d)"
            transform={`rotate(-45, ${labelW + ci * cellW + cellW / 2}, ${headerH - 6})`}
          >
            {t.theme.length > 12 ? `${t.theme.slice(0, 12)}…` : t.theme}
          </text>
        ))}

        {/* Rows */}
        {students.map((stu, ri) => (
          <g key={stu}>
            <text
              x={labelW - 6}
              y={headerH + ri * cellH + cellH / 2 + 4}
              textAnchor="end"
              fontSize="10"
              fill="var(--color-text-primary, #212529)"
            >
              {stu.length > 10 ? `${stu.slice(0, 10)}…` : stu}
            </text>
            {themes.map((t, ci) => {
              const val = cells[stu]?.[t.theme] ?? 0;
              return (
                <rect
                  key={`c-${ri}-${ci}`}
                  x={labelW + ci * cellW + 2}
                  y={headerH + ri * cellH + 2}
                  width={cellW - 4}
                  height={cellH - 4}
                  rx={3}
                  fill={fill(val)}
                >
                  <title>{`${stu} × ${t.theme}: ${val} records`}</title>
                </rect>
              );
            })}
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ================================================================
   20. PLAN COVERAGE RADAR
   ================================================================
   Five-axis spider chart showing how "complete" a plan is across
   watchpoints / priorities / EA actions / prep items / family followups.
   Answers: "How comprehensive is this plan?"
   ================================================================ */

type PlanRadarSection = "watchpoints" | "priorities" | "eaActions" | "prepItems" | "familyFollowups";

interface PlanCoverageRadarProps {
  watchpoints: number;
  priorities: number;
  eaActions: number;
  prepItems: number;
  familyFollowups: number;
  onSegmentClick?: (payload: { section: PlanRadarSection; label: string; items: string[] }) => void;
  sectionItems?: Partial<Record<PlanRadarSection, string[]>>;
}

const PLAN_RADAR_AXES: { key: PlanRadarSection; label: string; max: number }[] = [
  { key: "watchpoints", label: "Watchpoints", max: 6 },
  { key: "priorities", label: "Priorities", max: 8 },
  { key: "eaActions", label: "EA Actions", max: 6 },
  { key: "prepItems", label: "Prep Items", max: 8 },
  { key: "familyFollowups", label: "Family", max: 5 },
];

export function PlanCoverageRadar(props: PlanCoverageRadarProps) {
  const { onSegmentClick, sectionItems, ...countProps } = props;
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 24;
  const n = PLAN_RADAR_AXES.length;
  const step = (Math.PI * 2) / n;

  function polarXY(index: number, ratio: number): [number, number] {
    const angle = -Math.PI / 2 + index * step;
    return [cx + Math.cos(angle) * maxR * ratio, cy + Math.sin(angle) * maxR * ratio];
  }

  // Background rings
  const rings = [0.33, 0.66, 1];

  // Shape points
  const shapePoints = PLAN_RADAR_AXES.map((axis, i) => {
    const val = Math.min(countProps[axis.key], axis.max);
    return polarXY(i, val / axis.max);
  });
  const shapePath = shapePoints.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ") + " Z";

  return (
    <div className="viz-plan-radar" role="img" aria-label="Plan coverage radar">
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" preserveAspectRatio="xMidYMid meet">
        {/* Background rings */}
        {rings.map((r) => (
          <polygon
            key={r}
            points={Array.from({ length: n }, (_, i) => polarXY(i, r).join(",")).join(" ")}
            fill="none"
            stroke="var(--color-border, #dee2e6)"
            strokeWidth="0.5"
            opacity="0.5"
          />
        ))}

        {/* Axis lines */}
        {PLAN_RADAR_AXES.map((_, i) => {
          const [x, y] = polarXY(i, 1);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--color-border, #dee2e6)" strokeWidth="0.5" opacity="0.4" />;
        })}

        {/* Data shape */}
        <path d={shapePath} fill="var(--color-accent, #0d6efd)" fillOpacity="0.18" stroke="var(--color-accent, #0d6efd)" strokeWidth="1.5" />

        {/* Axis labels */}
        {PLAN_RADAR_AXES.map((axis, i) => {
          const [x, y] = polarXY(i, 1.2);
          return (
            <text
              key={axis.key}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="8"
              fill="var(--color-text-secondary, #6c757d)"
              fontWeight="600"
            >
              {axis.label}
            </text>
          );
        })}

        {/* Value dots */}
        {shapePoints.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill="var(--color-accent, #0d6efd)" />
        ))}

        {/* Axis hit targets — only rendered when onSegmentClick is provided */}
        {onSegmentClick && PLAN_RADAR_AXES.map((axis, i) => {
          const [x, y] = polarXY(i, 1);
          const count = countProps[axis.key];
          const items = sectionItems?.[axis.key] ?? [];
          const ariaLabel = `${axis.label}: ${count}`;
          return (
            <circle
              key={`hit-${axis.key}`}
              cx={x}
              cy={y}
              r="8"
              fill="transparent"
              className="viz-plan-radar__axis-hit"
              role="button"
              tabIndex={0}
              aria-label={ariaLabel}
              data-testid={`viz-plan-radar-axis-${axis.key}`}
              onClick={() => onSegmentClick({ section: axis.key, label: axis.label, items })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSegmentClick({ section: axis.key, label: axis.label, items });
                }
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}

/* ================================================================
   21. WORKFLOW FLOW STRIP
   ================================================================
   Horizontal lane diagram showing the top common workflow sequences.
   Each flow is a row of connected pills.
   Answers: "What workflow patterns does this teacher use?"
   ================================================================ */

interface WorkflowFlow {
  sequence: string[];
  count: number;
}

interface WorkflowFlowStripProps {
  flows: WorkflowFlow[];
}

function flowColor(index: number): string {
  const palette = [
    "var(--color-accent, #0d6efd)",
    "var(--color-sage, #5cb85c)",
    "var(--color-sun, #f0ad4e)",
    "var(--color-analysis, #8b5cf6)",
    "var(--color-alert, #e74c3c)",
  ];
  return palette[index % palette.length];
}

export function WorkflowFlowStrip({ flows }: WorkflowFlowStripProps) {
  if (flows.length === 0) return null;

  const top = flows.slice(0, 5);

  return (
    <div className="viz-workflow-strip" role="img" aria-label="Common workflow patterns">
      {top.map((flow, fi) => (
        <div key={fi} className="viz-workflow-strip__row">
          <span className="viz-workflow-strip__count">{flow.count}×</span>
          <div className="viz-workflow-strip__lane">
            {flow.sequence.map((step, si) => (
              <span key={si} className="viz-workflow-strip__step" style={{ borderColor: flowColor(fi) }}>
                {step.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                {si < flow.sequence.length - 1 && (
                  <span className="viz-workflow-strip__arrow" style={{ color: flowColor(fi) }}>→</span>
                )}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================================================================
   22. READABILITY COMPARISON GAUGE
   ================================================================
   Before/after comparison bars derived from source_text vs
   simplified_text. Shows word count, sentence count, avg word length.
   Answers: "Did the simplification actually make things simpler?"
   ================================================================ */

interface ReadabilityComparisonGaugeProps {
  sourceText: string;
  simplifiedText: string;
}

function textMetrics(text: string) {
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgWordLen = words.length > 0 ? words.reduce((s, w) => s + w.length, 0) / words.length : 0;
  return { wordCount: words.length, sentenceCount: sentences.length, avgWordLen };
}

export function ReadabilityComparisonGauge({ sourceText, simplifiedText }: ReadabilityComparisonGaugeProps) {
  const src = useMemo(() => textMetrics(sourceText), [sourceText]);
  const sim = useMemo(() => textMetrics(simplifiedText), [simplifiedText]);

  const metrics: { label: string; before: number; after: number; unit: string; lowerIsBetter: boolean }[] = [
    { label: "Words", before: src.wordCount, after: sim.wordCount, unit: "", lowerIsBetter: true },
    { label: "Sentences", before: src.sentenceCount, after: sim.sentenceCount, unit: "", lowerIsBetter: true },
    { label: "Avg word length", before: Math.round(src.avgWordLen * 10) / 10, after: Math.round(sim.avgWordLen * 10) / 10, unit: " chars", lowerIsBetter: true },
  ];

  return (
    <div className="viz-readability-gauge" role="img" aria-label="Readability comparison">
      {metrics.map((m) => {
        const max = Math.max(m.before, m.after, 1);
        const improved = m.lowerIsBetter ? m.after < m.before : m.after > m.before;
        return (
          <div key={m.label} className="viz-readability-gauge__row">
            <span className="viz-readability-gauge__label">{m.label}</span>
            <div className="viz-readability-gauge__bars">
              <div className="viz-readability-gauge__bar-pair">
                <div
                  className="viz-readability-gauge__bar viz-readability-gauge__bar--before"
                  style={{ width: `${(m.before / max) * 100}%` }}
                >
                  <span>{m.before}{m.unit}</span>
                </div>
                <div
                  className={`viz-readability-gauge__bar viz-readability-gauge__bar--after${improved ? " viz-readability-gauge__bar--improved" : ""}`}
                  style={{ width: `${(m.after / max) * 100}%` }}
                >
                  <span>{m.after}{m.unit}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div className="viz-readability-gauge__legend">
        <span className="viz-readability-gauge__legend-item viz-readability-gauge__legend-item--before">Original</span>
        <span className="viz-readability-gauge__legend-item viz-readability-gauge__legend-item--after">Simplified</span>
      </div>
    </div>
  );
}
