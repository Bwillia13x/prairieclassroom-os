import { useEffect, useRef, useState, type ReactNode } from "react";
import SectionIcon from "../SectionIcon";
import "./PageHero.css";

export type PageHeroPulseTone = "success" | "warning" | "danger" | "neutral";
export type PageHeroVariant = "classroom" | "prep" | "ops" | "review" | "week";

export interface PageHeroPulse {
  tone: PageHeroPulseTone;
  state: string;
  meta: string;
  live?: boolean;
}

export interface PageHeroPivot {
  eyebrow: string;
  label: string;
  icon: "sun" | "clock" | "grid";
  onClick: () => void;
}

export interface PageHeroMetric {
  value: number | string;
  label: string;
  tone?: PageHeroPulseTone;
  meta?: string;
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
  title: string;
  description?: ReactNode;
  pulse?: PageHeroPulse;
  metrics?: PageHeroMetric[];
  metricGroups?: PageHeroMetricGroup[];
  statusRows?: PageHeroStatusRow[];
  pivots?: PageHeroPivot[];
  actions?: ReactNode;
  variant?: PageHeroVariant;
  id?: string;
  ariaLabel?: string;
}

const PIVOT_ICON: Record<PageHeroPivot["icon"], "sun" | "clock" | "grid"> = {
  sun: "sun",
  clock: "clock",
  grid: "grid",
};

function metricToneClass(tone?: PageHeroPulseTone): string {
  if (!tone || tone === "neutral") return "";
  return ` page-hero__metric--${tone}`;
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
  variant,
  id,
  ariaLabel,
}: Props) {
  const className = `page-hero${variant ? ` page-hero--${variant}` : ""}`;

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
  const showAside = !!pulse || hasFlatMetrics || hasGroupedMetrics || hasStatusRows;

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
          className={`page-hero__pulse${pulse ? ` page-hero__pulse--${pulse.tone}` : ""}`}
          aria-label="Page pulse"
        >
          {pulse ? (
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
          {hasStatusRows ? (
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
          {hasGroupedMetrics ? (
            <div className="page-hero__metric-groups">
              {metricGroups!.map((group, groupIdx) => (
                <div
                  key={`${group.label}-${groupIdx}`}
                  className="page-hero__metric-group"
                >
                  <span className="page-hero__metric-group-eyebrow">{group.label}</span>
                  <div className="page-hero__metric-group-tiles">
                    {group.metrics.map((metric, idx) => (
                      <div
                        key={`${metric.label}-${idx}`}
                        className={`page-hero__metric${metricToneClass(metric.tone)}`}
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
          {hasFlatMetrics ? (
            <div className="page-hero__pulse-metrics">
              {metrics!.map((metric, idx) => (
                <div
                  key={`${metric.label}-${idx}`}
                  className={`page-hero__pulse-metric${metricToneClass(metric.tone)}`}
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
