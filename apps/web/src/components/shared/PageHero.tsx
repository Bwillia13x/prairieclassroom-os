import type { ReactNode } from "react";
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
}

interface Props {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  pulse?: PageHeroPulse;
  metrics?: PageHeroMetric[];
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

export default function PageHero({
  eyebrow,
  title,
  description,
  pulse,
  metrics,
  pivots,
  actions,
  variant,
  id,
  ariaLabel,
}: Props) {
  const className = `page-hero${variant ? ` page-hero--${variant}` : ""}`;

  return (
    <section className={className} id={id} aria-label={ariaLabel}>
      <div className="page-hero__lede">
        <span className="page-hero__eyebrow">{eyebrow}</span>
        <h1 className="page-hero__title">{title}</h1>
        {description ? <p className="page-hero__caption">{description}</p> : null}
        {pivots && pivots.length > 0 ? (
          <div className="page-hero__pivots" role="group" aria-label="Temporal pivots">
            {pivots.map((pivot) => (
              <button
                key={pivot.label}
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

      {pulse || metrics ? (
        <aside
          className={`page-hero__pulse${pulse ? ` page-hero__pulse--${pulse.tone}` : ""}`}
          aria-label="Classroom pulse"
        >
          {pulse ? (
            <div className="page-hero__pulse-row">
              <span
                className={`page-hero__pulse-dot${pulse.live ? " page-hero__pulse-dot--live" : ""}`}
                aria-hidden="true"
              />
              <div className="page-hero__pulse-label">
                <strong className="page-hero__pulse-state">{pulse.state}</strong>
                <span className="page-hero__pulse-meta">{pulse.meta}</span>
              </div>
            </div>
          ) : null}
          {metrics && metrics.length > 0 ? (
            <div className="page-hero__pulse-metrics">
              {metrics.map((metric) => (
                <div key={metric.label} className="page-hero__pulse-metric">
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </div>
              ))}
            </div>
          ) : null}
        </aside>
      ) : null}
    </section>
  );
}
