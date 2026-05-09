/**
 * dataviz/plans.tsx — Plan-rhythm surfaces.
 *
 * PlanStreakCalendar: 4-week × 5-day grid of planned/missed days.
 *   Answers: "Am I building momentum?"
 *
 * PlanCoverageRadar ("Plan Compass"): five-axis radar showing how
 * "complete" a plan is across watchpoints / priorities / EA actions /
 * prep items / family followups. Answers: "How comprehensive is this
 * plan, and where is it thin?"
 */

import type { CSSProperties, KeyboardEvent } from "react";

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
        role={onSegmentClick ? "group" : "img"}
        aria-label={`Plan streak: ${planned} of ${plans14d.length} days planned`}>
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

interface PlanRadarAxis {
  key: PlanRadarSection;
  label: string;
  short: string;
  max: number;
  toneVar: string;
}

const PLAN_RADAR_AXES: PlanRadarAxis[] = [
  { key: "watchpoints", label: "Watchpoints", short: "Watch", max: 6, toneVar: "var(--color-section-watchpoint)" },
  { key: "priorities", label: "Priorities", short: "Priority", max: 8, toneVar: "var(--color-section-priority)" },
  { key: "eaActions", label: "EA Actions", short: "EA", max: 6, toneVar: "var(--color-section-ea)" },
  { key: "prepItems", label: "Prep Items", short: "Prep", max: 8, toneVar: "var(--color-text-tertiary)" },
  { key: "familyFollowups", label: "Family", short: "Family", max: 5, toneVar: "var(--color-section-family)" },
];

type PlanTier = "thin" | "balanced" | "ready";

interface PlanTierResult {
  tier: PlanTier;
  caption: string;
}

/**
 * computePlanTier — classify the overall plan strength.
 *
 * Lopsidedness wins. The plan is a five-axis instrument; if any one
 * dimension is essentially empty (< 20% of its max), the plan reads
 * "thin" no matter how full the others are. "Ready" requires both
 * height (mean ≥ 70%) and breadth (no axis below 40%). Everything
 * else is "balanced" with a caption naming the weakest axis so the
 * teacher knows where to spend the next minute of attention.
 */
function computePlanTier(ratios: Record<PlanRadarSection, number>): PlanTierResult {
  const entries = PLAN_RADAR_AXES.map((axis) => ({ axis, ratio: ratios[axis.key] }));
  const weakest = entries.reduce((acc, e) => (e.ratio < acc.ratio ? e : acc), entries[0]);
  const mean = entries.reduce((sum, e) => sum + e.ratio, 0) / entries.length;
  const weakName = weakest.axis.short.toLowerCase();
  if (weakest.ratio < 0.2) return { tier: "thin", caption: `Thin — add coverage to ${weakName}.` };
  if (mean >= 0.7 && weakest.ratio >= 0.4) return { tier: "ready", caption: "Plan reads ready — every dimension covered." };
  return { tier: "balanced", caption: `Forming — strengthen ${weakName} next.` };
}

export function PlanCoverageRadar(props: PlanCoverageRadarProps) {
  const { onSegmentClick, sectionItems, ...countProps } = props;

  // Geometry — sized for the Plan Compass card. The SVG owns the
  // measurement field; HTML labels sit on a lighter halo around it.
  const size = 360;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 26; // leaves room for value dots + scale marks
  const n = PLAN_RADAR_AXES.length;
  const step = (Math.PI * 2) / n;

  function polarXY(index: number, ratio: number): [number, number] {
    const angle = -Math.PI / 2 + index * step;
    return [cx + Math.cos(angle) * maxR * ratio, cy + Math.sin(angle) * maxR * ratio];
  }

  // Per-axis values, ratios, and shape points.
  const axisData = PLAN_RADAR_AXES.map((axis, i) => {
    const raw = countProps[axis.key];
    const clamped = Math.min(raw, axis.max);
    const ratio = clamped / axis.max;
    const [px, py] = polarXY(i, ratio);
    return { axis, raw, clamped, ratio, px, py };
  });

  const shapePath = axisData.map(({ px, py }, i) => `${i === 0 ? "M" : "L"}${px},${py}`).join(" ") + " Z";

  // Aggregates for the center readout.
  const totalFilled = axisData.reduce((sum, d) => sum + d.clamped, 0);
  const totalMax = PLAN_RADAR_AXES.reduce((sum, a) => sum + a.max, 0);
  const ratiosByKey = axisData.reduce((acc, d) => {
    acc[d.axis.key] = d.ratio;
    return acc;
  }, {} as Record<PlanRadarSection, number>);
  const { tier, caption } = computePlanTier(ratiosByKey);

  // Phase C3 (2026-04-27) — featured axis hierarchy.
  // The dominant axis (highest ratio, then highest raw) is the
  // dimension that *defines* this plan's shape. Promoting its label
  // to display-tier typography makes the compass self-narrating: the
  // teacher reads what the plan is *about* before reading the verdict
  // caption that names what's *missing*. Stable on ties — falls back
  // to PLAN_RADAR_AXES order so the same plan always elects the same
  // axis frame to frame.
  const featuredAxisData = axisData.reduce((acc, d) => {
    if (d.ratio > acc.ratio) return d;
    if (d.ratio === acc.ratio && d.raw > acc.raw) return d;
    return acc;
  }, axisData[0]);
  const featuredAxisKey = featuredAxisData.axis.key;
  // Surface the featured axis to assistive tech only when the plan
  // has any coverage at all — an all-empty plan has no meaningful
  // dominant dimension, so falling back to the plain radar label
  // matches the visual rule (no chip is rendered as featured).
  const radarAriaLabel =
    featuredAxisData.raw > 0
      ? `Plan coverage radar; dominant dimension: ${featuredAxisData.axis.label}`
      : "Plan coverage radar";

  // Four tier rings at 25% / 50% / 75% / 100% — drawn as dotted
  // hairlines so the chart background reads as a measured field, not
  // a heavy grid. Scale labels sit just right of the north spoke so
  // they avoid both the Watch dot and the perimeter chips.
  const tiers: { ratio: number; mark: string }[] = [
    { ratio: 0.25, mark: "25" },
    { ratio: 0.5, mark: "50" },
    { ratio: 0.75, mark: "75" },
    { ratio: 1, mark: "" },
  ];

  return (
    <div className="viz-plan-radar viz-plan-radar--compass" role={onSegmentClick ? "group" : "img"} aria-label={radarAriaLabel}>
      <header className="viz-plan-radar__head">
        <div className="viz-plan-radar__head-copy">
          <span className="viz-plan-radar__eyebrow t-eyebrow">Plan compass</span>
          <span className="viz-plan-radar__caption">Coverage across the five plan dimensions.</span>
        </div>
        <div className="viz-plan-radar__readout" aria-label={`Total plan coverage ${totalFilled} of ${totalMax}, ${tier}`}>
          <span className="viz-plan-radar__total">
            <span className="viz-plan-radar__total-num">{totalFilled}</span>
            <span className="viz-plan-radar__total-sep">/</span>
            <span className="viz-plan-radar__total-max">{totalMax}</span>
          </span>
          <span className={`viz-plan-radar__tier viz-plan-radar__tier--${tier}`}>{tier}</span>
        </div>
      </header>

      <div className="viz-plan-radar__stage">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          className="viz-plan-radar__svg"
          aria-hidden="true"
          focusable="false">
          {/* Tier rings — concentric circles in dotted hairline */}
          {tiers.map(({ ratio }) => (
            <circle
              key={`ring-${ratio}`}
              cx={cx}
              cy={cy}
              r={maxR * ratio}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="0.8"
              strokeDasharray="1.5 3"
              opacity="0.82"
            />
          ))}

          {/* Tier marks — right-edge scale labels, kept clear of the polygon */}
          {tiers.filter(({ mark }) => mark).map(({ ratio, mark }) => {
            return (
              <text
                key={`tier-${ratio}`}
                x={cx + 26}
                y={cy - maxR * ratio + 1}
                className="viz-plan-radar__ring-label"
                fontSize="9"
                fill="var(--color-text-tertiary)"
                fontFamily="var(--font-mono)"
                opacity="0.62"
                dominantBaseline="middle">
                {mark}
              </text>
            );
          })}

          {/* Spoke guides — full-length axis lines, very faint */}
          {PLAN_RADAR_AXES.map((_, i) => {
            const [x, y] = polarXY(i, 1);
            return (
              <line
                key={`spoke-${i}`}
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke="var(--color-border)"
                strokeWidth="0.65"
                opacity="0.45"
              />
            );
          })}

          {/* Per-axis ribbons — thin colored segment from origin to data
              point in each axis's tone. This is what gives each spoke
              identity even before the polygon resolves. Phase δ3
              (2026-04-28) plumbs `--axis-tone` onto the ribbon element
              itself (it was already on the label) so any future CSS
              rule keyed on `--axis-tone` can resolve here. */}
          {axisData.map(({ axis, px, py }, i) => (
            <line
              key={`ribbon-${axis.key}`}
              x1={cx}
              y1={cy}
              x2={px}
              y2={py}
              stroke={axis.toneVar}
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.85"
              className="viz-plan-radar__ribbon"
              style={
                {
                  "--ribbon-delay": `${i * 60}ms`,
                  "--axis-tone": axis.toneVar,
                } as CSSProperties
              }
            />
          ))}

          {/* Polygon — hairline stroke with tonal accent fill (Phase C3).
              The shape draws on mount via stroke-dashoffset (CSS). The
              fill picks up `--color-accent` at 12% opacity so the
              instrument reads as a navy reading on the prairie compass
              rather than a generic gray triangle. The stroke stays at
              `--color-text` to keep the shape's outer boundary anchored
              to the canonical text color across modes. */}
          <path
            d={shapePath}
            className="viz-plan-radar__shape"
            fill="var(--color-section-ea)"
            fillOpacity="0.17"
            stroke="var(--color-text)"
            strokeWidth="2"
            strokeLinejoin="round"
            opacity="0.9"
          />

          <circle cx={cx} cy={cy} r="2.5" fill="var(--color-text)" opacity="0.36" />

          {/* Value dots — outer hairline ring + inner tone fill so each
              point reads as a calibrated marker, not a generic dot. */}
          {axisData.map(({ axis, px, py, ratio }, i) => (
            <g
              key={`dot-${axis.key}`}
              className="viz-plan-radar__dot"
              style={{ "--dot-delay": `${300 + i * 70}ms` } as CSSProperties}>
              <circle cx={px} cy={py} r="8.25" fill="var(--color-bg)" stroke={axis.toneVar} strokeWidth="2.1" />
              <circle cx={px} cy={py} r="3.6" fill={axis.toneVar} opacity={ratio === 0 ? 0.25 : 1} />
            </g>
          ))}

          {/* Axis hit targets — preserved from the original API.
              Enlarged from r=8 → r=12 for easier targeting; visual
              affordance now lives in the surrounding label chip. */}
          {onSegmentClick &&
            axisData.map(({ axis, px, py, raw }) => {
              const items = sectionItems?.[axis.key] ?? [];
              const ariaLabel = `${axis.label}: ${raw}`;
              return (
                <circle
                  key={`hit-${axis.key}`}
                  cx={px}
                  cy={py}
                  r="20"
                  fill="transparent"
                  className="viz-plan-radar__axis-hit"
                  role="button"
                  tabIndex={0}
                  aria-label={ariaLabel}
                  data-testid={`viz-plan-radar-axis-${axis.key}`}
                  onClick={() => onSegmentClick({ section: axis.key, label: axis.label, items })}
                  onKeyDown={(e: KeyboardEvent<SVGCircleElement>) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSegmentClick({ section: axis.key, label: axis.label, items });
                    }
                  }}
                />
              );
            })}
        </svg>

        {/* Axis label chips — tone-rule chips arranged radially around
            the SVG. Each chip mirrors viz-tone-badge: 2px left rule in
            the section's tone, mono numerals for the count fraction.
            Phase C3 (2026-04-27): the dominant axis (`featuredAxisKey`)
            renders with the `--featured` modifier — its label-name
            promotes to display-tier typography, signaling "this is
            what this plan is about." All other axis labels stay at
            their original 11px mono weight. */}
        <ul className="viz-plan-radar__labels" aria-hidden="true">
          {axisData.map(({ axis, raw, ratio }, i) => {
            const angle = -Math.PI / 2 + i * step;
            // 44% radial offset places chips in the band between the
            // SVG (which fills the inner 72% of the stage) and the
            // card edge — close enough to feel attached to the spoke,
            // far enough to never overlap the polygon points.
            const lx = 50 + Math.cos(angle) * 44;
            const ly = 50 + Math.sin(angle) * 44;
            const empty = raw === 0;
            const featured = axis.key === featuredAxisKey && !empty;
            return (
              <li
                key={axis.key}
                className={`viz-plan-radar__label${empty ? " viz-plan-radar__label--empty" : ""}${featured ? " viz-plan-radar__label--featured" : ""}`}
                style={{
                  left: `${lx}%`,
                  top: `${ly}%`,
                  "--axis-tone": axis.toneVar,
                  "--label-delay": `${500 + i * 60}ms`,
                } as CSSProperties}>
                <span className="viz-plan-radar__label-name">{axis.short}</span>
                <span className="viz-plan-radar__label-count">
                  {raw}/{axis.max}
                </span>
                <span className="viz-plan-radar__label-bar" aria-hidden="true">
                  <span
                    className="viz-plan-radar__label-bar-fill"
                    style={{ width: `${Math.round(ratio * 100)}%` }}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="viz-plan-radar__verdict">
        <span className="viz-plan-radar__verdict-label t-eyebrow">Read</span>
        <span className="viz-plan-radar__verdict-text">{caption}</span>
      </p>
    </div>
  );
}
