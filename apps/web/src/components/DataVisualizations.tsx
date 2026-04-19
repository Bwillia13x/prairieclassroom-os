/**
 * DataVisualizations.tsx — Rich SVG-based visualization components
 * for teacher navigation and classroom insight.
 *
 * All visualizations are lightweight (React + inline SVG), no external
 * charting library required. Uses the existing design token system.
 */

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactElement } from "react";
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
const MATRIX_H = 230;
const MATRIX_PAD = { top: 22, right: 18, bottom: 34, left: 38 };

export function StudentPriorityMatrix({ students, onStudentClick }: PriorityMatrixProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Audit #14: plot ALL students — not just those with pending actions
  // or an intervention record. Quiet students render as low-opacity
  // background dots so the claim "26 plotted" is visually honest.
  const { data, quietData } = useMemo(() => {
    const active: Array<{
      alias: string;
      x: number;
      y: number;
      pending: number;
      patterns: number;
      messages: number;
      r: number;
      hasAttention: boolean;
      reason: string | null;
    }> = [];
    const quiet: Array<{ alias: string; x: number; y: number; r: number }> = [];
    for (const s of students) {
      const days = s.last_intervention_days ?? 0;
      const urgency =
        s.pending_action_count * 4 +
        s.active_pattern_count * 1.8 +
        s.pending_message_count * 1.4 +
        Math.min(days / 45, 4);
      const isActive =
        s.pending_action_count > 0 || s.last_intervention_days !== null;
      if (isActive) {
        active.push({
          alias: s.alias,
          x: days,
          y: urgency,
          pending: s.pending_action_count,
          patterns: s.active_pattern_count,
          messages: s.pending_message_count,
          r: Math.max(
            4,
            Math.min(
              13,
              4.5 +
                (s.active_pattern_count ?? 0) * 2.4 +
                Math.min(s.pending_action_count, 3),
            ),
          ),
          hasAttention: s.pending_action_count > 0,
          reason: s.latest_priority_reason,
        });
      } else {
        quiet.push({ alias: s.alias, x: days, y: urgency, r: 3 });
      }
    }
    active.sort((a, b) => b.y - a.y || b.x - a.x);
    return { data: active, quietData: quiet };
  }, [students]);

  if (data.length === 0 && quietData.length === 0) return null;

  const allXs = [...data.map((d) => d.x), ...quietData.map((d) => d.x)];
  const allYs = [...data.map((d) => d.y), ...quietData.map((d) => d.y)];
  const maxX = Math.max(7, ...allXs);
  const maxY = Math.max(6, ...allYs);
  const innerW = MATRIX_W - MATRIX_PAD.left - MATRIX_PAD.right;
  const innerH = MATRIX_H - MATRIX_PAD.top - MATRIX_PAD.bottom;

  function scaleX(v: number) { return MATRIX_PAD.left + (v / maxX) * innerW; }
  function scaleY(v: number) { return MATRIX_PAD.top + innerH - (v / maxY) * innerH; }

  const attentionCount = data.filter((d) => d.hasAttention).length;
  const topPriority = data[0] ?? null;
  const mostStale =
    data.length > 0
      ? data.reduce((worst, d) => (d.x > worst.x ? d : worst), data[0])
      : null;
  const topStudents = data.slice(0, 5);
  const totalPlotted = data.length + quietData.length;
  const offsetPatterns: Array<[number, number]> = [
    [0, 0],
    [6, -5],
    [-6, 5],
    [8, 4],
    [-8, -4],
    [0, 8],
  ];
  const plottedData = data.map((d, i) => {
    const sameBefore = data.slice(0, i).filter((p) => p.x === d.x && Math.abs(p.y - d.y) < 0.2).length;
    const offsetPattern = offsetPatterns[sameBefore % offsetPatterns.length];
    const [offsetX, offsetY] = offsetPattern;
    return {
      ...d,
      rank: i + 1,
      plotX: Math.max(MATRIX_PAD.left + 8, Math.min(MATRIX_PAD.left + innerW - 8, scaleX(d.x) + offsetX)),
      plotY: Math.max(MATRIX_PAD.top + 8, Math.min(MATRIX_PAD.top + innerH - 8, scaleY(d.y) + offsetY)),
    };
  });
  const ariaLabel =
    `Priority matrix: ${totalPlotted} ${totalPlotted === 1 ? "student" : "students"} plotted, ` +
    `${attentionCount} priority ${attentionCount === 1 ? "student" : "students"}.` +
    (topPriority ? ` Check first: ${topPriority.alias}.` : "") +
    (mostStale ? ` Most stale: ${mostStale.alias} at ${mostStale.x} days.` : "");

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
      <div className="viz-header viz-priority-matrix__header">
        <div>
          <h4 className="viz-title">Student Priority View</h4>
          <span className="viz-priority-matrix__summary">
            {totalPlotted} plotted · {attentionCount} priority {attentionCount === 1 ? "student" : "students"} · dot size follows pattern count
          </span>
        </div>
        {topPriority && mostStale ? (
          <div className="viz-priority-matrix__stats" aria-hidden="true">
            <span>{topPriority.alias} first</span>
            <span>{mostStale.x}d longest gap</span>
          </div>
        ) : null}
      </div>
      <div className="viz-priority-matrix__body">
        <div className="viz-priority-matrix__map">
          <svg
            width="100%"
            viewBox={`0 0 ${MATRIX_W} ${MATRIX_H}`}
            className="viz-svg"
            role="img"
            aria-label={ariaLabel}
          >
            <rect
              x={MATRIX_PAD.left}
              y={MATRIX_PAD.top}
              width={innerW}
              height={innerH}
              className="viz-priority-matrix__plot-bg"
              rx={6}
            />
            {/* Audit #15: quadrant tints replace the dashed "CHECK FIRST"
                box so the high-urgency + high-recency corner reads as
                an occupied zone, not an empty state. */}
            <g className="viz-priority-matrix__quadrants" aria-hidden="true">
              <rect
                className="viz-priority-matrix__quadrant viz-priority-matrix__quadrant--check-first"
                x={MATRIX_PAD.left}
                y={MATRIX_PAD.top}
                width={innerW / 2}
                height={innerH / 2}
              />
              <rect
                className="viz-priority-matrix__quadrant viz-priority-matrix__quadrant--watch"
                x={MATRIX_PAD.left + innerW / 2}
                y={MATRIX_PAD.top}
                width={innerW / 2}
                height={innerH / 2}
              />
              <rect
                className="viz-priority-matrix__quadrant viz-priority-matrix__quadrant--stable"
                x={MATRIX_PAD.left}
                y={MATRIX_PAD.top + innerH / 2}
                width={innerW / 2}
                height={innerH / 2}
              />
              <rect
                className="viz-priority-matrix__quadrant viz-priority-matrix__quadrant--stale-ok"
                x={MATRIX_PAD.left + innerW / 2}
                y={MATRIX_PAD.top + innerH / 2}
                width={innerW / 2}
                height={innerH / 2}
              />
              <text
                x={MATRIX_PAD.left + 6}
                y={MATRIX_PAD.top + 12}
                className="viz-priority-matrix__quadrant-label"
              >
                Check first
              </text>
              <text
                x={MATRIX_PAD.left + innerW - 6}
                y={MATRIX_PAD.top + 12}
                textAnchor="end"
                className="viz-priority-matrix__quadrant-label"
              >
                Watch
              </text>
              <text
                x={MATRIX_PAD.left + 6}
                y={MATRIX_PAD.top + innerH - 6}
                className="viz-priority-matrix__quadrant-label viz-priority-matrix__quadrant-label--muted"
              >
                Stable
              </text>
              <text
                x={MATRIX_PAD.left + innerW - 6}
                y={MATRIX_PAD.top + innerH - 6}
                textAnchor="end"
                className="viz-priority-matrix__quadrant-label viz-priority-matrix__quadrant-label--muted"
              >
                Stale · calm
              </text>
            </g>
            {[0.25, 0.5, 0.75].map((pct) => (
              <line key={`gx-${pct}`}
                x1={scaleX(maxX * pct)} y1={MATRIX_PAD.top}
                x2={scaleX(maxX * pct)} y2={MATRIX_PAD.top + innerH}
                className="viz-priority-matrix__grid-line"
              />
            ))}
            {[0.25, 0.5, 0.75].map((pct) => (
              <line key={`gy-${pct}`}
                x1={MATRIX_PAD.left} y1={scaleY(maxY * pct)}
                x2={MATRIX_PAD.left + innerW} y2={scaleY(maxY * pct)}
                className="viz-priority-matrix__grid-line"
              />
            ))}
            <line
              x1={MATRIX_PAD.left} y1={MATRIX_PAD.top + innerH}
              x2={MATRIX_PAD.left + innerW} y2={MATRIX_PAD.top + innerH}
              className="viz-priority-matrix__axis"
            />
            <line
              x1={MATRIX_PAD.left} y1={MATRIX_PAD.top}
              x2={MATRIX_PAD.left} y2={MATRIX_PAD.top + innerH}
              className="viz-priority-matrix__axis"
            />
            <text
              x={MATRIX_PAD.left + innerW / 2} y={MATRIX_H - 6}
              textAnchor="middle" className="viz-axis-label"
            >
              Days since intervention
            </text>
            <text
              x={11} y={MATRIX_PAD.top + innerH / 2}
              textAnchor="middle" className="viz-axis-label"
              transform={`rotate(-90, 11, ${MATRIX_PAD.top + innerH / 2})`}
            >
              Priority pressure
            </text>
            {/* Audit #14: low-opacity quiet-student dots so the headline
                count ("26 plotted") is visually honest without the
                background dots competing with the active priorities. */}
            <g className="viz-priority-matrix__quiet-layer" aria-hidden="true">
              {quietData.map((q) => (
                <circle
                  key={`quiet-${q.alias}`}
                  className="viz-priority-matrix__dot viz-priority-matrix__dot--quiet"
                  cx={scaleX(q.x)}
                  cy={scaleY(q.y)}
                  r={q.r}
                  data-testid={`viz-priority-quiet-${q.alias}`}
                />
              ))}
            </g>
            {plottedData.map((d, i) => {
              const clickable = Boolean(onStudentClick);
              const isTop = d.rank <= 3;
              return (
                <g
                  key={d.alias}
                  className={`viz-bubble-group${isTop ? " viz-bubble-group--top" : ""}`}
                  role={clickable ? "button" : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  aria-label={clickable ? `${d.alias}: ${d.pending} pending ${d.pending === 1 ? "action" : "actions"}, ${d.patterns} active ${d.patterns === 1 ? "pattern" : "patterns"}, ${d.x} days since intervention. Open detail.` : undefined}
                  data-testid={`viz-priority-student-${d.alias}`}
                  onClick={clickable ? () => onStudentClick!(d.alias) : undefined}
                  onKeyDown={clickable ? (e) => handleBubbleKey(e, d.alias) : undefined}
                  style={{
                    cursor: clickable ? "pointer" : "default",
                    animationDelay: `${i * 34}ms`,
                  }}
                >
                  <circle
                    cx={d.plotX} cy={d.plotY} r={d.r + 5}
                    className="viz-bubble-halo"
                  />
                  <circle
                    cx={d.plotX} cy={d.plotY} r={d.r}
                    className={`viz-bubble ${d.hasAttention ? "viz-bubble--attention" : "viz-bubble--calm"}`}
                  />
                  {isTop && (
                    <text
                      x={Math.max(54, Math.min(MATRIX_W - 54, d.plotX))}
                      y={Math.max(MATRIX_PAD.top + 11, d.plotY - d.r - 7)}
                      textAnchor="middle"
                      className="viz-bubble-label"
                    >
                      {d.alias}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
        <div className="viz-priority-matrix__watchlist" aria-label="Students to check first">
          <span className="viz-priority-matrix__watchlist-label">Check first</span>
          {/* Audit #16: explicit score column header so the right-hand
              number (108/10/6 in the audit sample) is legible as a
              priority score, not a mystery tally. */}
          {topStudents.length > 0 ? (
            <div
              className="viz-priority-matrix__rank-header"
              aria-hidden="true"
            >
              <span>Student</span>
              <span data-testid="priority-matrix-score-header">Priority score</span>
            </div>
          ) : null}
          {topStudents.map((student, index) => (
            <PriorityWatchRow
              key={student.alias}
              rank={index}
              student={student}
              onStudentClick={onStudentClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * PriorityWatchRow — a single row in the "Check first" watchlist.
 * Audit #17: when the teacher taps a row, the full priority reason
 * expands inline instead of the text truncating mid-sentence. If an
 * onStudentClick handler is supplied, the button also drives the
 * drill-down drawer in TodayPanel.
 */
interface PriorityWatchRowProps {
  rank: number;
  student: {
    alias: string;
    x: number;
    y: number;
    pending: number;
    reason: string | null;
  };
  onStudentClick?: (alias: string) => void;
}

function PriorityWatchRow({ rank, student, onStudentClick }: PriorityWatchRowProps) {
  const [expanded, setExpanded] = useState(false);
  const reasonText = student.reason || `${student.pending} pending · ${student.x}d gap`;
  const content = (
    <>
      <span className="viz-priority-matrix__rank">{rank + 1}</span>
      <span className="viz-priority-matrix__student">
        <strong>{student.alias}</strong>
        <em
          className={`viz-priority-matrix__student-reason${
            expanded ? " viz-priority-matrix__student-reason--expanded" : ""
          }`}
        >
          {reasonText}
        </em>
      </span>
      <span
        className="viz-priority-matrix__student-score"
        title="Composite priority score: pending actions, active patterns, message debt, and days since last intervention."
      >
        {Math.round(student.y)}
      </span>
    </>
  );
  if (onStudentClick) {
    return (
      <button
        type="button"
        className="viz-priority-matrix__watch-row"
        data-testid={`viz-priority-row-${student.alias}`}
        data-rank={rank}
        onClick={() => {
          setExpanded((v) => !v);
          onStudentClick(student.alias);
        }}
      >
        {content}
      </button>
    );
  }
  return (
    <div
      className="viz-priority-matrix__watch-row"
      data-testid={`viz-priority-row-${student.alias}`}
      data-rank={rank}
      role="button"
      tabIndex={0}
      onClick={() => setExpanded((v) => !v)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setExpanded((v) => !v);
        }
      }}
    >
      {content}
    </div>
  );
}


/* ================================================================
   2. COMPLEXITY DEBT GAUGE
   ================================================================
   Operational debt triage card showing total load, severity, delta,
   and category mix. Answers: "Am I falling behind?"
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
  const tone = total <= 3 ? "success" : total <= 7 ? "warning" : "danger";

  const categories = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of debtItems) {
      map[item.category] = (map[item.category] ?? 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [debtItems]);

  const maxCategoryCount = Math.max(1, ...categories.map(([, count]) => count));
  const toneLabel = tone === "success" ? "Manageable" : tone === "warning" ? "Accumulating" : "Critical";
  const topCategory = categories[0] ? formatDebtCategory(categories[0][0]) : null;
  const topCategoryCount = categories[0]?.[1] ?? 0;

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
          {/* Audit #12: attach a definition tooltip to the tone badge so
              CRITICAL / Accumulating / Manageable each carry their
              threshold rule on hover. */}
          <span
            className={`viz-tone-badge viz-tone-badge--${tone}`}
            title={
              tone === "danger"
                ? "Critical: 8 or more open items. Healthy range is 0–3; 4–7 is accumulating."
                : tone === "warning"
                  ? "Accumulating: 4–7 open items. Healthy range is 0–3."
                  : "Manageable: 3 or fewer open items."
            }
          >
            {toneLabel}
          </span>
        </div>
      </div>
      <div className="viz-debt-gauge__body">
        <div className={`viz-debt-gauge__summary viz-debt-gauge__summary--${tone}`}>
          <div className="viz-debt-gauge__total">
            <span className="viz-debt-gauge__total-number">{total}</span>
            <span className="viz-debt-gauge__total-label">{total === 1 ? "open item" : "open items"}</span>
          </div>
          <div className="viz-debt-gauge__signal">
            <span>Largest source</span>
            <strong>{topCategory ?? "No open source"}</strong>
            {topCategory ? <em>{topCategoryCount} {topCategoryCount === 1 ? "item" : "items"}</em> : null}
          </div>
          <div className="viz-debt-gauge__threshold-wrapper">
            {/* Audit #11: explicit legend above the threshold row — it
                was previously unlabelled, leaving 0-3 / 4-7 / 8+ to
                read as opaque tier codes. */}
            <p
              className="viz-debt-gauge__threshold-legend"
              data-testid="debt-scale-legend"
            >
              Debt severity tier
            </p>
            <div className="viz-debt-gauge__threshold" aria-hidden="true">
              <span className={`viz-debt-gauge__threshold-zone${tone === "success" ? " viz-debt-gauge__threshold-zone--active" : ""}`}>0-3</span>
              <span className={`viz-debt-gauge__threshold-zone${tone === "warning" ? " viz-debt-gauge__threshold-zone--active" : ""}`}>4-7</span>
              <span className={`viz-debt-gauge__threshold-zone${tone === "danger" ? " viz-debt-gauge__threshold-zone--active" : ""}`}>8+</span>
            </div>
          </div>
        </div>
        {categories.length > 0 && (
          <div className="viz-debt-gauge__breakdown">
            {categories.map(([cat, count], index) => (
              <div
                key={cat}
                className={`viz-debt-gauge__cat viz-debt-gauge__cat--${debtCategoryTone(cat)}`}
                style={{ animationDelay: `${120 + index * 55}ms` }}
              >
                <div className="viz-debt-gauge__cat-main">
                  <span className="viz-debt-gauge__cat-label">{formatDebtCategory(cat)}</span>
                  <span className="viz-debt-gauge__cat-count">{count}</span>
                </div>
                <div className="viz-debt-gauge__bar" aria-hidden="true">
                  <span
                    className="viz-debt-gauge__bar-fill"
                    style={{
                      "--debt-bar-width": `${Math.max(8, (count / maxCategoryCount) * 100)}%`,
                    } as CSSProperties}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDebtCategory(category: string): string {
  const labels: Record<string, string> = {
    approaching_review: "Approaching review",
    stale_followup: "Stale follow-up",
    recurring_plan_item: "Recurring plan item",
    unaddressed_pattern: "Unaddressed pattern",
    unapproved_message: "Unapproved message",
  };
  return labels[category] ?? category.replace(/_/g, " ");
}

/**
 * Unify Complexity Debt breakdown colors with the Day Arc LOW / MEDIUM /
 * HIGH vocabulary (audit #13). Every category lands on one of three
 * severity buckets so the dashboard reads with one semantic palette.
 */
function debtCategoryTone(category: string): "high" | "medium" | "low" {
  if (category === "approaching_review" || category === "stale_followup") return "high";
  if (category === "recurring_plan_item" || category === "unapproved_message") return "medium";
  return "low";
}


/* ================================================================
   3. CLASSROOM COMPOSITION RINGS
   ================================================================
   Concentric donut rings showing EAL levels, support tag clusters,
   and family language diversity.
   Answers: "Who is in my room?"
   ================================================================ */

interface CompositionRingsStudent {
  alias: string;
  eal_flag?: boolean;
  support_tags?: string[];
  family_language?: string;
}

interface CompositionRingsProps {
  students: CompositionRingsStudent[];
  onSegmentClick?: (payload: {
    groupKind: "eal" | "support_cluster" | "family_language";
    tag: string;
    label: string;
    students: CompositionRingsStudent[];
  }) => void;
}

type CompositionGroupKind = "eal" | "support_cluster" | "family_language";

interface CompositionGroupItem {
  groupKind: CompositionGroupKind;
  tag: string;
  label: string;
  value: number;
  color: string;
  students: CompositionRingsStudent[];
}

interface DonutSegment {
  label: string;
  value: number;
  color: string;
  /**
   * Audit #20: `pairKey` links a donut segment to its paired bar row
   * so hovering either tints both. Set independently of `clickable`
   * because non-interactive segments (e.g. "No EAL tag") still need to
   * exit any active hover state cleanly.
   */
  pairKey?: string;
  onHover?: (hovered: boolean) => void;
  active?: boolean;
  clickable?: {
    testid: string;
    ariaLabel: string;
    onClick: () => void;
    onKeyDown: (e: KeyboardEvent<SVGCircleElement>) => void;
  };
}

function drawDonutRing(
  cx: number, cy: number, radius: number, strokeWidth: number,
  segments: DonutSegment[],
): ReactElement[] {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return [];

  const elements: ReactElement[] = [];
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  for (const seg of segments) {
    const pct = seg.value / total;
    const dashLength = pct * circumference;
    const baseClass = "viz-composition__segment";
    const modifiers = [
      seg.clickable ? "viz-composition__segment--clickable" : "",
      seg.active ? "viz-composition__segment--active" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const className = [baseClass, modifiers].filter(Boolean).join(" ");
    const clickProps = seg.clickable
      ? {
          role: "button" as const,
          tabIndex: 0,
          "data-testid": seg.clickable.testid,
          "aria-label": seg.clickable.ariaLabel,
          onClick: seg.clickable.onClick,
          onKeyDown: seg.clickable.onKeyDown,
        }
      : {};
    const hoverProps = seg.onHover
      ? {
          onMouseEnter: () => seg.onHover!(true),
          onMouseLeave: () => seg.onHover!(false),
          onFocus: () => seg.onHover!(true),
          onBlur: () => seg.onHover!(false),
        }
      : {};
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
        className={className}
        data-pair-key={seg.pairKey}
        {...clickProps}
        {...hoverProps}
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

export function ClassroomCompositionRings({ students, onSegmentClick }: CompositionRingsProps) {
  const [mounted, setMounted] = useState(false);
  /**
   * Audit #20: cross-highlight state shared between donut segments and
   * right-side bar rows. `${groupKind}:${tag}` is the pair key. A null
   * value means no hover is active.
   */
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

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

  function familyLanguageLabel(student: CompositionRingsStudent): string {
    const rawLanguage = student.family_language ?? "en";
    return LANG_LABELS[rawLanguage] ?? rawLanguage;
  }

  function makeClickable(
    groupKind: "eal" | "support_cluster" | "family_language",
    tag: string,
    label: string,
    count: number,
    filterFn: (s: CompositionRingsStudent) => boolean,
  ): DonutSegment["clickable"] | undefined {
    if (!onSegmentClick) return undefined;
    const filtered = students.filter(filterFn);
    return {
      testid: `viz-composition-segment-${groupKind}-${tag}`,
      ariaLabel: `${label}: ${count} students`,
      onClick: () => onSegmentClick({ groupKind, tag, label, students: filtered }),
      onKeyDown: (e: KeyboardEvent<SVGCircleElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSegmentClick({ groupKind, tag, label, students: filtered });
        }
      },
    };
  }

  const EAL_TAGS: { tag: string; label: string; color: string }[] = [
    { tag: "eal_level_1", label: "EAL Level 1", color: "var(--color-danger)" },
    { tag: "eal_level_2", label: "EAL Level 2", color: "var(--color-warning)" },
    { tag: "eal_level_3", label: "EAL Level 3", color: "var(--color-success)" },
  ];

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

  const ealGroups: CompositionGroupItem[] = EAL_TAGS
    .map(({ tag, label, color }) => ({
      groupKind: "eal" as const,
      tag,
      label,
      value: stats.ealLevels[tag] ?? 0,
      color,
      students: students.filter((s) => (s.support_tags ?? []).includes(tag)),
    }))
    .filter((s) => s.value > 0);

  const ealTotal = ealGroups.reduce((sum, group) => sum + group.value, 0);
  const nonEalCount = Math.max(0, students.length - ealTotal);

  const ealSegments: DonutSegment[] = [
    ...ealGroups.map((group) => {
      const pairKey = `${group.groupKind}:${group.tag}`;
      return {
        label: group.label,
        value: group.value,
        color: group.color,
        pairKey,
        onHover: (h: boolean) => setHoveredKey(h ? pairKey : null),
        active: hoveredKey === pairKey,
        clickable: makeClickable(group.groupKind, group.tag, group.label, group.value, (s) => (s.support_tags ?? []).includes(group.tag)),
      };
    }),
    { label: "No EAL tag", value: nonEalCount, color: "var(--color-border)" },
  ].filter((s) => s.value > 0);

  function formatClusterLabel(cluster: string): string {
    const labels: Record<string, string> = {
      transition: "Transition",
      sensory: "Sensory",
      academic: "Academic",
      extension: "Extension",
      social: "Social",
      executive: "Executive function",
      other: "Other",
    };
    return labels[cluster] ?? cluster;
  }

  const supportGroups: CompositionGroupItem[] = clusterOrder
    .filter((c) => (stats.tagClusters[c] ?? 0) > 0)
    .map((c) => ({
      groupKind: "support_cluster" as const,
      tag: c,
      label: formatClusterLabel(c),
      value: stats.tagClusters[c],
      color: clusterColors[c] ?? "var(--color-border)",
      students: students.filter((s) => (s.support_tags ?? []).some((t) => tagToCluster(t) === c)),
    }));

  const tagSegments: DonutSegment[] = clusterOrder
    .filter((c) => (stats.tagClusters[c] ?? 0) > 0)
    .map((c) => {
      const pairKey = `support_cluster:${c}`;
      return {
        label: formatClusterLabel(c),
        value: stats.tagClusters[c],
        color: clusterColors[c] ?? "var(--color-border)",
        pairKey,
        onHover: (h: boolean) => setHoveredKey(h ? pairKey : null),
        active: hoveredKey === pairKey,
        clickable: makeClickable("support_cluster", c, formatClusterLabel(c), stats.tagClusters[c], (s) => (s.support_tags ?? []).some((t) => tagToCluster(t) === c)),
      };
    });

  const languageGroups: CompositionGroupItem[] = Object.entries(stats.languages)
    .sort((a, b) => b[1] - a[1])
    .map(([code, count]) => {
      const langLabel = LANG_LABELS[code] ?? code;
      const langName = LANG_LABELS[code] ?? code;
      return {
        groupKind: "family_language" as const,
        tag: langName,
        label: langLabel,
        value: count,
        color: LANG_COLORS[code] ?? "var(--color-section-slate)",
        students: students.filter((s) => familyLanguageLabel(s) === langName),
      };
    });

  const langSegments: DonutSegment[] = languageGroups.map((group) => {
    const pairKey = `${group.groupKind}:${group.tag}`;
    return {
      label: group.label,
      value: group.value,
      color: group.color,
      pairKey,
      onHover: (h: boolean) => setHoveredKey(h ? pairKey : null),
      active: hoveredKey === pairKey,
      clickable: makeClickable(group.groupKind, group.tag, group.label, group.value, (s) => familyLanguageLabel(s) === group.tag),
    };
  });

  const langCount = Object.keys(stats.languages).length;
  const namedSupportGroups = supportGroups
    .filter((group) => group.tag !== "other")
    .sort((a, b) => b.value - a.value);
  const supportDisplayGroups = [
    ...namedSupportGroups,
    ...supportGroups.filter((group) => group.tag === "other"),
  ];
  const topNeed = supportDisplayGroups[0];
  const homeLanguageGroups = languageGroups.filter((group) => group.label !== "English");
  const languageDisplayGroups = homeLanguageGroups.length > 0 ? homeLanguageGroups.slice(0, 6) : languageGroups.slice(0, 1);

  const topLang = langSegments[0];
  const ariaLabel =
    `Classroom composition: ${students.length} students, ${ealTotal} English language learners across ${Object.keys(stats.ealLevels).length} levels, ` +
    `${langCount} home ${langCount === 1 ? "language" : "languages"}` +
    (topLang && topLang.label !== "English" ? ` (${topLang.label} most common)` : "") +
    `, ${tagSegments.length} support clusters.`;

  function handleGroupKeyDown(e: KeyboardEvent<HTMLElement>, group: CompositionGroupItem) {
    if (!onSegmentClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSegmentClick({
        groupKind: group.groupKind,
        tag: group.tag,
        label: group.label,
        students: group.students,
      });
    }
  }

  function renderProfileGroup(title: string, groups: CompositionGroupItem[]) {
    if (groups.length === 0) return null;
    const maxValue = Math.max(1, ...groups.map((group) => group.value));
    return (
      <div className="viz-composition__group">
        <span className="viz-composition__group-title">{title}</span>
        <div className="viz-composition__group-list">
          {groups.map((group, index) => {
            // Audit #20: rows pair with donut segments by `${groupKind}:${tag}`.
            // Either surface can drive the shared `hoveredKey` state.
            const pairKey = `${group.groupKind}:${group.tag}`;
            const isActive = hoveredKey === pairKey;
            const rowClass = `viz-composition__row${
              isActive ? " viz-composition__row--active" : ""
            }`;
            const hoverHandlers = {
              onMouseEnter: () => setHoveredKey(pairKey),
              onMouseLeave: () => setHoveredKey(null),
              onFocus: () => setHoveredKey(pairKey),
              onBlur: () => setHoveredKey(null),
            };
            const rowContent = (
              <>
                <span className="viz-composition__dot" style={{ background: group.color }} />
                <span className="viz-composition__row-label">{group.label}</span>
                <span className="viz-composition__row-bar" aria-hidden="true">
                  <span
                    style={{
                      "--composition-row-pct": `${Math.max(0.08, group.value / maxValue)}`,
                      "--composition-row-delay": `${index * 55}ms`,
                      background: group.color,
                    } as CSSProperties}
                  />
                </span>
                <strong>{group.value}</strong>
              </>
            );
            return onSegmentClick ? (
              <button
                key={`${group.groupKind}-${group.tag}`}
                type="button"
                className={rowClass}
                data-testid={`viz-composition-row-${group.groupKind}-${group.tag}`}
                data-pair-key={pairKey}
                aria-label={`${group.label}: ${group.value} ${group.value === 1 ? "student" : "students"}. Open group.`}
                onClick={() => onSegmentClick({
                  groupKind: group.groupKind,
                  tag: group.tag,
                  label: group.label,
                  students: group.students,
                })}
                onKeyDown={(e) => handleGroupKeyDown(e, group)}
                {...hoverHandlers}
                style={{ "--composition-row-delay": `${index * 55}ms` } as CSSProperties}
              >
                {rowContent}
              </button>
            ) : (
              <div
                key={`${group.groupKind}-${group.tag}`}
                className={rowClass}
                data-testid={`viz-composition-row-${group.groupKind}-${group.tag}`}
                data-pair-key={pairKey}
                aria-label={`${group.label}: ${group.value} ${group.value === 1 ? "student" : "students"}.`}
                {...hoverHandlers}
                style={{ "--composition-row-delay": `${index * 55}ms` } as CSSProperties}
              >
                {rowContent}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`viz-composition${mounted ? " viz-composition--mounted" : ""}`}>
      <div className="viz-header viz-composition__header">
        <div>
          <h4 className="viz-title">Classroom Profile</h4>
          <span className="viz-composition__summary">
            {students.length} students · {ealTotal} EAL · {langCount} languages
          </span>
        </div>
        {/* Audit #21: the old `N NEED GROUPS` / `LEADS` chips read as
            ambient metadata but were actually inviting a click. Promote
            them to labeled action buttons with verb+noun phrasing. */}
        <div className="viz-composition__stats">
          {supportGroups.length > 0 && onSegmentClick ? (
            <button
              type="button"
              className="viz-composition__header-action"
              aria-label={`View ${supportGroups.length} need ${supportGroups.length === 1 ? "group" : "groups"}`}
              data-testid="viz-composition-view-needs"
              onClick={() =>
                onSegmentClick({
                  groupKind: "support_cluster",
                  tag: "all",
                  label: "All need groups",
                  students: students.filter(
                    (s) => (s.support_tags ?? []).length > 0,
                  ),
                })
              }
            >
              View {supportGroups.length} need {supportGroups.length === 1 ? "group" : "groups"}
            </button>
          ) : supportGroups.length > 0 ? (
            <span className="viz-composition__header-caption">
              {supportGroups.length} need {supportGroups.length === 1 ? "group" : "groups"}
            </span>
          ) : null}
          {topNeed && onSegmentClick ? (
            <button
              type="button"
              className="viz-composition__header-action"
              aria-label={`View ${topNeed.label.toLowerCase()} leads`}
              data-testid="viz-composition-view-top-need"
              onClick={() =>
                onSegmentClick({
                  groupKind: topNeed.groupKind,
                  tag: topNeed.tag,
                  label: `${topNeed.label} leads`,
                  students: topNeed.students,
                })
              }
            >
              View {topNeed.label.toLowerCase()} leads
            </button>
          ) : topNeed ? (
            <span className="viz-composition__header-caption">{topNeed.label} leads</span>
          ) : null}
        </div>
      </div>
      <div className="viz-composition__body">
        <div className="viz-composition__visual">
          <svg width="190" height="190" viewBox="0 0 180 180" className="viz-svg" role="img"
            aria-label={ariaLabel}>
            <circle className="viz-composition__track" cx={cx} cy={cy} r={78} />
            <circle className="viz-composition__track" cx={cx} cy={cy} r={58} />
            <circle className="viz-composition__track" cx={cx} cy={cy} r={40} />
            <g className="viz-composition__ring viz-composition__ring--outer">
              {drawDonutRing(cx, cy, 78, 14, ealSegments)}
            </g>
            <g className="viz-composition__ring viz-composition__ring--middle">
              {drawDonutRing(cx, cy, 58, 12, tagSegments)}
            </g>
            <g className="viz-composition__ring viz-composition__ring--inner">
              {drawDonutRing(cx, cy, 40, 10, langSegments)}
            </g>
            <text x={cx} y={cy - 4} textAnchor="middle" className="viz-composition__center-number">{students.length}</text>
            <text x={cx} y={cy + 11} textAnchor="middle" className="viz-composition__center-label">students</text>
          </svg>
          <div className="viz-composition__metrics" aria-hidden="true">
            <span><strong>{ealTotal}</strong><em>EAL</em></span>
            <span><strong>{supportGroups.length}</strong><em>needs</em></span>
            <span><strong>{langCount}</strong><em>languages</em></span>
          </div>
        </div>
        <div className="viz-composition__profile">
          {renderProfileGroup("EAL", ealGroups)}
          {renderProfileGroup("Needs", supportDisplayGroups.slice(0, 4))}
          {renderProfileGroup("Languages", languageDisplayGroups)}
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

  const rows = sorted.map((student, index) => {
    const days = student.last_intervention_days ?? 0;
    const tone = days > maxDays ? "danger" : days > 7 ? "warning" : "success";
    const status = days > maxDays ? "Beyond target" : days > 7 ? "Watch" : "Recent";
    return { ...student, days, index, tone, status };
  });
  const longestGap = rows[0];
  const scaleMax = Math.max(maxDays, longestGap.days);
  const beyondTargetCount = rows.filter((s) => s.days > maxDays).length;
  const watchCount = rows.filter((s) => s.days > 7 && s.days <= maxDays).length;
  const leadOverage = Math.max(0, longestGap.days - maxDays);
  const ariaLabel =
    `Intervention recency: top ${rows.length} ${rows.length === 1 ? "student" : "students"} by longest gap since last intervention. ` +
    `${beyondTargetCount} beyond the ${maxDays} day target, ${watchCount} in watch range. Longest gap: ${longestGap.alias} at ${longestGap.days} days.`;

  return (
    <div className={`viz-recency${mounted ? " viz-recency--mounted" : ""}`} role="group" aria-label={ariaLabel}>
      <div className="viz-header viz-recency__header">
        <div>
          <h4 className="viz-title">Intervention Recency</h4>
          <span className="viz-recency__summary">
            {rows.length} longest gaps · {beyondTargetCount} beyond {maxDays}d target
          </span>
        </div>
        <div className="viz-recency__legend" aria-hidden="true">
          <span className="viz-recency__legend-dot viz-recency__legend-dot--danger" /> Beyond target
          <span className="viz-recency__legend-dot viz-recency__legend-dot--warning" /> Watch
        </div>
      </div>
      <div className="viz-recency__body">
        <div className={`viz-recency__lead viz-recency__lead--${longestGap.tone}`}>
          <span className="viz-recency__lead-label">Longest gap</span>
          <strong>{longestGap.days}d</strong>
          <span className="viz-recency__lead-student">{longestGap.alias}</span>
          {/* Audit #19: anchor the hero callout to the target baseline
              so "376D BEYOND TARGET" isn't just an orphan figure. */}
          <p
            className="viz-recency__hero-baseline"
            data-testid="recency-hero-baseline"
          >
            {leadOverage > 0
              ? `${leadOverage}d past the ${maxDays}-day target`
              : `Inside the ${maxDays}-day target`}
          </p>
        </div>
        <div className="viz-recency__list">
          {rows.map((s) => {
            // Audit #18: split render per magnitude tier. When a gap is
            // beyond the 14-day target, a proportional bar collapses to
            // a dot-and-number so 11d and 387d don't share a stretched
            // axis. Watch-tier rows keep the bar for in-range comparison.
            const beyond = s.days > maxDays;
            const rawPct = scaleMax > 0 && !beyond ? s.days / maxDays : 0;
            const visualPct = beyond
              ? 0
              : s.days === 0
                ? 0
                : Math.max(0.08, Math.min(1, Math.sqrt(rawPct)));
            const content = (
              <>
                <span className="viz-recency__rank">{s.index + 1}</span>
                <span className="viz-recency__name">{s.alias}</span>
                {beyond ? (
                  <span
                    className="viz-recency__stale-number"
                    aria-label={`${s.days} days since last intervention, beyond target`}
                  >
                    <span className="viz-recency__stale-dot" aria-hidden="true" />
                    <span className="viz-recency__stale-days">{s.days}d</span>
                  </span>
                ) : (
                  <span className="viz-recency__bar-track" aria-hidden="true">
                    <span
                      className={`viz-recency__bar viz-recency__bar--${s.tone}`}
                      style={{
                        "--recency-pct": visualPct,
                        "--recency-row-delay": `${s.index * 45}ms`,
                      } as CSSProperties}
                    />
                  </span>
                )}
                {beyond ? null : (
                  <span className={`viz-recency__days viz-recency__days--${s.tone}`}>{s.days}d</span>
                )}
                <span className={`viz-recency__status viz-recency__status--${s.tone}`}>{s.status}</span>
              </>
            );
            const rowClass = `viz-recency__row viz-recency__row--${s.tone} viz-recency__row--${beyond ? "beyond" : "watch"}`;
            return onStudentClick ? (
              <button
                key={s.alias}
                className={rowClass}
                type="button"
                onClick={() => onStudentClick(s.alias)}
                aria-label={`${s.alias}: ${s.days} days since intervention. ${s.status}. Open detail.`}
                data-testid={`viz-recency-row-${s.alias}`}
                style={{ "--recency-row-delay": `${s.index * 45}ms` } as CSSProperties}
              >
                {content}
              </button>
            ) : (
              <div
                key={s.alias}
                className={rowClass}
                aria-label={`${s.alias}: ${s.days} days since intervention. ${s.status}.`}
                data-testid={`viz-recency-row-${s.alias}`}
                style={{ "--recency-row-delay": `${s.index * 45}ms` } as CSSProperties}
              >
                {content}
              </div>
            );
          })}
        </div>
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
  onSegmentClick?: (payload: { axis: string; label: string; themes: RecurringTheme[] }) => void;
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

export function SupportPatternRadar({ themes, onSegmentClick }: PatternRadarProps) {
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
        {/* Axis hit targets — only rendered when onSegmentClick is provided */}
        {onSegmentClick && axisData.map((a, i) => {
          const end = toPoint(i, maxR + 6);
          const axisThemes = themes.filter((t) => themeToAxis(t.theme) === a.key);
          return (
            <circle
              key={`hit-${a.key}`}
              cx={end.x}
              cy={end.y}
              r={8}
              fill="transparent"
              className="viz-pattern-radar__axis-hit"
              role="button"
              tabIndex={0}
              aria-label={`${a.label}: ${a.raw} records`}
              data-testid={`viz-pattern-radar-axis-${a.key}`}
              onClick={() => onSegmentClick({ axis: a.key, label: a.label, themes: axisThemes })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSegmentClick({ axis: a.key, label: a.label, themes: axisThemes });
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

  const { points, lastX, lastY, first, last, trend, tone, bandY, bandHeight } = useMemo(() => {
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
    // Audit #22: paint a healthy band (debt <= 15) behind the line so
    // the Y axis has scale context without overloading the sparkline.
    // When max <= 15, the entire plot is healthy — the band fills it.
    const HEALTHY_THRESHOLD = 15;
    const bandTop = max > HEALTHY_THRESHOLD
      ? pad + (1 - HEALTHY_THRESHOLD / max) * (h - pad * 2)
      : pad;
    const bandBottom = pad + (h - pad * 2);
    return {
      points: pts,
      lastX: endPt.x,
      lastY: endPt.y,
      first: f,
      last: l,
      trend: tr,
      tone: tn,
      count: trimmed.length,
      bandY: bandTop,
      bandHeight: Math.max(0, bandBottom - bandTop),
    };
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
        {/* Audit #22: healthy band (0–15) gives the Y axis an anchor
            without requiring tick labels on a sparkline. */}
        {bandHeight > 0 && (
          <rect
            className="viz-debt-trend__healthy-band"
            x={0}
            y={bandY}
            width={w}
            height={bandHeight}
          >
            <title>Healthy range: 0–15 open items</title>
          </rect>
        )}
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
  2: "var(--color-pending)",
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
  onDotClick?: (record: InterventionRecord) => void;
}

export function InterventionTimeline({ records, onDotClick }: IntTimelineProps) {
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
          const dateStr = new Date(record._ts).toLocaleDateString();
          const studentsStr = record.student_refs.join(", ");
          const dotAriaLabel = `Intervention on ${dateStr}: ${studentsStr}`;
          const clickProps = onDotClick
            ? {
                role: "button" as const,
                tabIndex: 0,
                className: "viz-int-timeline__dot--clickable",
                "data-testid": `viz-int-timeline-dot-${record.record_id}`,
                "aria-label": dotAriaLabel,
                onClick: () => onDotClick(record),
                onKeyDown: (e: KeyboardEvent<SVGCircleElement>) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onDotClick(record);
                  }
                },
              }
            : {};
          return (
            <circle
              key={record.record_id}
              cx={x}
              cy={h / 2}
              r={4}
              fill={fill}
              opacity={0.85}
              {...clickProps}
            >
              <title>
                {dateStr} — {record.follow_up_needed ? "Needs follow-up" : "Resolved"}
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
  onSegmentClick?: (payload: { category: "stale_followup"; items: InterventionRecord[] }) => void;
}

export function FollowUpSuccessRate({ records, onSegmentClick }: FollowUpRateProps) {
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

  const staleItems = records.filter((r) => r.follow_up_needed);
  const handleFollowUpClick = onSegmentClick
    ? () => onSegmentClick({ category: "stale_followup", items: staleItems })
    : undefined;
  const handleFollowUpKeyDown = onSegmentClick
    ? (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSegmentClick({ category: "stale_followup", items: staleItems });
        }
      }
    : undefined;

  return (
    <div
      className={`viz-followup-rate${onSegmentClick ? " viz-followup-rate--clickable" : ""}`}
      role={onSegmentClick ? "button" : "img"}
      aria-label={onSegmentClick ? `${pct}% resolved — click to review ${staleItems.length} pending follow-ups` : `${pct}% resolution rate`}
      tabIndex={onSegmentClick ? 0 : undefined}
      data-testid={onSegmentClick ? "viz-followup-rate-hit" : undefined}
      onClick={handleFollowUpClick}
      onKeyDown={handleFollowUpKeyDown}
    >
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
    if (ratio >= 0.75) return "var(--color-danger)";
    if (ratio >= 0.5) return "var(--color-section-watchpoint)";
    return "var(--color-section-family)";
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
  core: "var(--color-slate)",
  eal_supported: "var(--color-accent)",
  chunked: "var(--color-sage)",
  ea_small_group: "var(--color-sun)",
  extension: "var(--color-analysis)",
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
                  backgroundColor: VARIANT_TONE[v.variant_type] ?? "var(--color-slate)",
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
              aria-label={`Show ${prettyVariantType(v.variant_type)} variants`}
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
    if (ratio === 0) return "var(--color-surface-secondary)";
    const dangerMix = Math.round(18 + ratio * 42);
    return `color-mix(in srgb, var(--color-danger) ${dangerMix}%, var(--color-surface-secondary))`;
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
            fill="var(--color-text-secondary)"
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
              fill="var(--color-text)"
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
            stroke="var(--color-border)"
            strokeWidth="0.5"
            opacity="0.5"
          />
        ))}

        {/* Axis lines */}
        {PLAN_RADAR_AXES.map((_, i) => {
          const [x, y] = polarXY(i, 1);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--color-border)" strokeWidth="0.5" opacity="0.4" />;
        })}

        {/* Data shape */}
        <path d={shapePath} fill="var(--color-accent)" fillOpacity="0.18" stroke="var(--color-accent)" strokeWidth="1.5" />

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
              fill="var(--color-text-secondary)"
              fontWeight="600"
            >
              {axis.label}
            </text>
          );
        })}

        {/* Value dots */}
        {shapePoints.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill="var(--color-accent)" />
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
    "var(--color-accent)",
    "var(--color-sage)",
    "var(--color-sun)",
    "var(--color-analysis)",
    "var(--color-alert)",
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
