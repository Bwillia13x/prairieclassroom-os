/**
 * dataviz/priority.tsx — Student priority matrix.
 *
 * Two-axis scatter: X = days since last intervention,
 * Y = pending action count. Bubble size = active_pattern_count.
 * Answers: "Who needs me most right now?"
 */

import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import type { StudentSummary } from "../../types";
import SourceTag from "../SourceTag";

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
          <h4 className="t-eyebrow viz-title">Student Priority View <SourceTag kind="record" /></h4>
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
            role={onStudentClick ? "group" : "img"}
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
