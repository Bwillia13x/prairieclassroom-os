/**
 * dataviz/patterns.tsx — Support pattern surfaces.
 *
 * SupportPatternRadar: spider chart over six support axes.
 *   Answers: "What's the shape of my classroom's needs?"
 *
 * FollowUpDecayIndicators: aging bars per follow-up gap.
 *   Answers: "How stale are my follow-ups?"
 *
 * StudentThemeHeatmap: grid of student × recurring-theme cells.
 *   Answers: "Which students cluster on which needs?"
 *
 * ScaffoldEffectivenessChart: horizontal-bar list of active scaffolds.
 *
 * InterventionRecencyTimeline: per-student strip showing days since last
 * intervention. Sorted by staleness. Answers: "Who's gone dark?"
 */

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { FollowUpGap, RecurringTheme, StudentSummary } from "../../types";
import SourceTag from "../SourceTag";

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

  return (
    <div className="viz-radar">
      <div className="viz-header">
        <h4 className="t-eyebrow viz-title">Support Pattern Shape</h4>
        <span className="t-eyebrow viz-subtitle">Theme distribution from records</span>
      </div>
      <svg width="200" height="200" viewBox="0 0 200 200" className="viz-svg"
        role={onSegmentClick ? "group" : "img"}
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
        <polygon points={dataPoints.map((p) => `${p.x},${p.y}`).join(" ")}
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
        <h4 className="t-eyebrow viz-title">Follow-Up Aging</h4>
        <span className="t-eyebrow viz-subtitle">{sorted.length} gap{sorted.length !== 1 ? "s" : ""} awaiting action</span>
      </div>
      <div className="viz-decay__list">
        {sorted.slice(0, 8).map((gap, i) => {
          const pct = Math.min(1, gap.days_since / maxDays);
          const tone = gap.days_since <= 3 ? "success" : gap.days_since <= 7 ? "warning" : "danger";
          const isClickable = !!(onStudentClick && gap.student_refs[0]);
          const Tag = isClickable ? "button" : "div";
          return (
            <Tag
              key={`${gap.original_record_id}-${i}`}
              className="viz-decay__row"
              {...(isClickable ? {
                type: "button" as const,
                onClick: () => onStudentClick!(gap.student_refs[0]),
              } : {})}
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
            </Tag>
          );
        })}
      </div>
    </div>
  );
}

interface ScaffoldBarProps {
  scaffolds: { name: string; count: number }[];
}

export function ScaffoldEffectivenessChart({ scaffolds }: ScaffoldBarProps) {
  if (scaffolds.length === 0) return null;

  const maxCount = Math.max(1, ...scaffolds.map((s) => s.count));

  return (
    <div className="viz-scaffold" role="img" aria-label="Active Scaffolds chart">
      <div className="viz-header">
        <h4 className="t-eyebrow viz-title">Active Scaffolds</h4>
        <span className="t-eyebrow viz-subtitle">Frequency across students</span>
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
    <div className={`viz-recency${mounted ? " viz-recency--mounted" : ""}`} role={onStudentClick ? "group" : "img"} aria-label={ariaLabel}>
      <div className="viz-header viz-recency__header">
        <div>
          <h4 className="t-eyebrow viz-title">Intervention Recency <SourceTag kind="record" /></h4>
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
