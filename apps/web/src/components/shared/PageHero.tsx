import { useEffect, useRef, useState, type ReactNode } from "react";
import SectionIcon from "../SectionIcon";
import "./PageHero.css";

export type PageHeroPulseTone = "success" | "warning" | "danger" | "neutral";
export type PageHeroVariant =
  | "classroom"
  | "prep"
  | "ops"
  | "review"
  | "week"
  | "tomorrow";
export type PageHeroDensity = "command" | "utility";

export interface PageHeroPulse {
  tone: PageHeroPulseTone;
  state: string;
  meta: string;
  live?: boolean;
}

export interface PageHeroPivot {
  eyebrow: string;
  label: string;
  /* Phase B2 introduced the destination-tinted underline contract:
     sun → cognac (Today / live), clock → navy (Tomorrow / staged),
     grid → green (Week / forecast).
     Phase D2 (2026-04-27) adds `trend` as a clearer "forecast"
     glyph — kept paired to the same green Week-destination tint as
     `grid` so the navigation intent and the brand tone stay in sync.
     `grid` remains a valid value for non-Week pivots that may want
     the green tint without the trend metaphor. */
  icon: "sun" | "clock" | "grid" | "trend";
  onClick: () => void;
}

export interface PageHeroMetric {
  value: number | string;
  label: string;
  tone?: PageHeroPulseTone;
  meta?: string;
  /** Phase B1: when true, the metric renders at display-sm scale with
   * a 2px tonal underline. The first metric in each group / flat list
   * is auto-promoted to lead unless the consumer overrides explicitly. */
  lead?: boolean;
}

export interface PageHeroMetricGroup {
  label: string;
  metrics: PageHeroMetric[];
}

export interface PageHeroStatusRow {
  label: string;
  value: string;
  tone?: PageHeroPulseTone;
}

interface Props {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  pulse?: PageHeroPulse;
  metrics?: PageHeroMetric[];
  metricGroups?: PageHeroMetricGroup[];
  statusRows?: PageHeroStatusRow[];
  pivots?: PageHeroPivot[];
  actions?: ReactNode;
  instrument?: ReactNode;
  variant?: PageHeroVariant;
  density?: PageHeroDensity;
  id?: string;
  ariaLabel?: string;
}

const PIVOT_ICON: Record<PageHeroPivot["icon"], PageHeroPivot["icon"]> = {
  sun: "sun",
  clock: "clock",
  grid: "grid",
  trend: "trend",
};

function metricToneClass(tone?: PageHeroPulseTone): string {
  if (!tone || tone === "neutral") return "";
  return ` page-hero__metric--${tone}`;
}

/** Resolve the `lead` flag for a metric at index `idx` within its
 * group. The first metric is auto-promoted unless the consumer set
 * `lead` explicitly; non-first metrics default to false unless the
 * consumer set `lead: true`. Phase B1. */
function isLeadMetric(metric: PageHeroMetric, idx: number): boolean {
  if (typeof metric.lead === "boolean") return metric.lead;
  return idx === 0;
}

/** Pick the single critical group index for a hero — the group that
 * earns the larger lead-metric scale. A group is critical if any of
 * its metrics carries a `danger` or `warning` tone. Danger outranks
 * warning so a hero with mixed criticality lifts the danger group
 * (not the warning group). If no group qualifies, returns -1.
 *
 * Only one critical lead per hero by design — promoting every group
 * that happens to contain a non-neutral metric collapses the
 * priority signal. Phase β3 (2026-04-28). */
function findCriticalGroupIndex(groups: PageHeroMetricGroup[]): number {
  const dangerIdx = groups.findIndex((g) =>
    g.metrics.some((m) => m.tone === "danger"),
  );
  if (dangerIdx >= 0) return dangerIdx;
  return groups.findIndex((g) => g.metrics.some((m) => m.tone === "warning"));
}

export default function PageHero({
  eyebrow,
  title,
  description,
  pulse,
  metrics,
  metricGroups,
  statusRows,
  pivots,
  actions,
  instrument,
  variant,
  density = "command",
  id,
  ariaLabel,
}: Props) {
  const className = [
    "page-hero",
    `page-hero--density-${density}`,
    variant ? `page-hero--${variant}` : "",
  ].filter(Boolean).join(" ");

  // Re-key the pulse dot on state change so the 3-iteration ring restarts.
  // Without this, a state change (e.g. "Ready" → "Needs attention") would
  // not trigger a new ring animation — the dwell-then-settle intent only
  // fires on transitions the component observes.
  const pulseStateRef = useRef(pulse?.state);
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    if (pulse?.state && pulse.state !== pulseStateRef.current) {
      pulseStateRef.current = pulse.state;
      setPulseKey((k) => k + 1);
    }
  }, [pulse?.state]);

  const hasFlatMetrics = !!(metrics && metrics.length > 0);
  const hasGroupedMetrics = !!(metricGroups && metricGroups.length > 0);
  const hasStatusRows = !!(statusRows && statusRows.length > 0);
  const showAside = !!instrument || !!pulse || hasFlatMetrics || hasGroupedMetrics || hasStatusRows;
  const criticalGroupIdx = hasGroupedMetrics
    ? findCriticalGroupIndex(metricGroups!)
    : -1;

  return (
    <section className={className} id={id} aria-label={ariaLabel}>
      <div className="page-hero__lede">
        <span className="page-hero__eyebrow">{eyebrow}</span>
        <h1 className="page-hero__title">{title}</h1>
        {description ? <p className="page-hero__caption">{description}</p> : null}
        {pivots && pivots.length > 0 ? (
          <div className="page-hero__pivots" role="group" aria-label="Temporal pivots">
            {pivots.map((pivot, idx) => (
              <button
                key={`${pivot.eyebrow}-${pivot.label}-${idx}`}
                type="button"
                className="page-hero__pivot"
                data-pivot-icon={pivot.icon}
                onClick={pivot.onClick}
                aria-label={`${pivot.eyebrow}: ${pivot.label}`}
              >
                <span className="page-hero__pivot-icon" aria-hidden="true">
                  <SectionIcon name={PIVOT_ICON[pivot.icon]} />
                </span>
                <span className="page-hero__pivot-body">
                  <span className="page-hero__pivot-eyebrow">{pivot.eyebrow}</span>
                  <span className="page-hero__pivot-label">{pivot.label}</span>
                </span>
              </button>
            ))}
          </div>
        ) : null}
        {actions ? <div className="page-hero__actions">{actions}</div> : null}
      </div>

      {showAside ? (
        <aside
          className={
            instrument
              ? "page-hero__instrument"
              : `page-hero__pulse${pulse ? ` page-hero__pulse--${pulse.tone}` : ""}`
          }
          aria-label={instrument ? "Page instrument" : "Page pulse"}
        >
          {instrument ?? null}
          {!instrument && pulse ? (
            <div className="page-hero__pulse-row">
              <span
                key={pulseKey}
                className={`page-hero__pulse-dot${pulse.live ? " page-hero__pulse-dot--live" : ""}`}
                aria-hidden="true"
              />
              <div className="page-hero__pulse-label">
                <strong className="page-hero__pulse-state">{pulse.state}</strong>
                <span className="page-hero__pulse-meta">{pulse.meta}</span>
              </div>
            </div>
          ) : null}
          {!instrument && hasStatusRows ? (
            <div className="page-hero__status-rows">
              {statusRows!.map((row, idx) => (
                <div
                  key={`${row.label}-${idx}`}
                  className={`page-hero__status-row${row.tone ? ` page-hero__status-row--${row.tone}` : ""}`}
                >
                  <span className="page-hero__status-label">{row.label}</span>
                  <span className="page-hero__status-value">{row.value}</span>
                </div>
              ))}
            </div>
          ) : null}
          {!instrument && hasGroupedMetrics ? (
            <div className="page-hero__metric-groups">
              {metricGroups!.map((group, groupIdx) => (
                <div
                  key={`${group.label}-${groupIdx}`}
                  className={`page-hero__metric-group${
                    groupIdx === criticalGroupIdx
                      ? " page-hero__metric-group--critical"
                      : ""
                  }`}
                >
                  <span className="page-hero__metric-group-eyebrow">{group.label}</span>
                  <div className="page-hero__metric-group-tiles">
                    {group.metrics.map((metric, idx) => (
                      <div
                        key={`${metric.label}-${idx}`}
                        className={`page-hero__metric${metricToneClass(metric.tone)}${
                          isLeadMetric(metric, idx) ? " page-hero__metric--lead" : ""
                        }`}
                      >
                        <strong>{metric.value}</strong>
                        <span>{metric.label}</span>
                        {metric.meta ? (
                          <em className="page-hero__metric-meta">{metric.meta}</em>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {!instrument && hasFlatMetrics ? (
            <div className="page-hero__pulse-metrics">
              {metrics!.map((metric, idx) => (
                <div
                  key={`${metric.label}-${idx}`}
                  className={`page-hero__pulse-metric${metricToneClass(metric.tone)}${
                    isLeadMetric(metric, idx) ? " page-hero__metric--lead" : ""
                  }`}
                >
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                  {metric.meta ? (
                    <em className="page-hero__metric-meta">{metric.meta}</em>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </aside>
      ) : null}
    </section>
  );
}
