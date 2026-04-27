/**
 * dataviz/complexity.tsx — Complexity surfaces.
 *
 * ComplexityHeatmap: 5-row × N-column grid, color-coded risk level.
 * Answers: "When is it hard?"
 *
 * ComplexityTrendCalendar: 14-day grid of peak complexity levels.
 *
 * EALoadStackedBars: horizontal bar per time block showing students the
 * EA supports. Answers: "Where is the EA overloaded?"
 *
 * ScheduleLoadStrip: horizontal time-block strip (pill heights).
 * Answers: "Where is the EA busiest?"
 */

import { useMemo } from "react";
import type { ComplexityBlock, EALoadBlock, EALoadLevel } from "../../types";

interface ComplexityHeatmapProps {
  blocks: ComplexityBlock[];
}

const LEVEL_COLORS = {
  low: "var(--chart-tone-low-bg, var(--color-forecast-low-bg))",
  medium: "var(--chart-tone-medium-bg, var(--color-forecast-medium-bg))",
  high: "var(--chart-tone-high-bg, var(--color-forecast-high-bg))",
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
        <h4 className="t-eyebrow viz-title">Risk Heatmap</h4>
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
    <div className="viz-complexity-cal" role={onSegmentClick ? "group" : "img"} aria-label="Peak complexity over 14 days">
      <div className="viz-header">
        <span className="t-eyebrow viz-title">Complexity · 14 Days</span>
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

interface EALoadStackedBarsProps {
  blocks: EALoadBlock[];
}

const LOAD_FILL: Record<EALoadLevel, string> = {
  high: "var(--color-danger)",
  medium: "var(--color-warning)",
  low: "var(--color-success)",
  break: "var(--color-section-ea)",
};

export function EALoadStackedBars({ blocks }: EALoadStackedBarsProps) {
  if (blocks.length === 0) return null;

  const maxStudents = Math.max(1, ...blocks.map((b) => b.supported_students.length));
  const barMaxW = 200;

  return (
    <div className="viz-ea-bars" role="img" aria-label="EA Load Distribution chart">
      <div className="viz-header">
        <h4 className="t-eyebrow viz-title">EA Load Distribution</h4>
        <span className="t-eyebrow viz-subtitle">Students per block</span>
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
