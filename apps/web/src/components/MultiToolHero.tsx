import type { ReactNode } from "react";

export type MultiToolPulseTone = "success" | "warning" | "danger" | "neutral";

export interface MultiToolHeroMetric {
  value: ReactNode;
  label: string;
}

export interface MultiToolHeroPulse {
  tone: MultiToolPulseTone;
  state: string;
  meta: string;
}

interface Props {
  id: string;
  ariaLabel: string;
  eyebrow: string;
  title: string;
  description: ReactNode;
  metrics: MultiToolHeroMetric[];
  pulse: MultiToolHeroPulse;
  /**
   * Optional theming hook — sets a CSS custom property scope on the
   * hero so per-page accent colors (cognac, navy, sage) can shade the
   * left-rule and eyebrow without per-page CSS overrides.
   */
  variant?: "prep" | "ops" | "review";
}

/**
 * MultiToolHero — shared hero for the PREP, OPS, and REVIEW
 * multi-tool workspaces.
 *
 * Replaces the prior `PageCommandHub` usage on these three pages with
 * a richer hero that:
 *   - leads with display typography (eyebrow + display title + caption)
 *   - exposes a status pulse so the teacher sees the workspace state
 *     (Ready / Catching up / Needs attention) at a glance
 *   - shows a display-font metric strip with hairline dividers
 *   - drops the redundant pill-button action row, since the
 *     `page-tool-switcher--cards` row that follows IS the action
 *
 * Other pages (Today, Tomorrow, Week) continue to use PageCommandHub.
 */
export default function MultiToolHero({
  id,
  ariaLabel,
  eyebrow,
  title,
  description,
  metrics,
  pulse,
  variant,
}: Props) {
  const variantClass = variant ? ` multi-tool-hero--${variant}` : "";
  return (
    <header
      className={`multi-tool-hero${variantClass}`}
      id={id}
      aria-label={ariaLabel}
      data-pulse-tone={pulse.tone}
    >
      <div className="multi-tool-hero__lede">
        <span className="multi-tool-hero__eyebrow">{eyebrow}</span>
        <h2 className="multi-tool-hero__title">{title}</h2>
        <p className="multi-tool-hero__caption">{description}</p>
      </div>

      <aside className="multi-tool-hero__pulse" aria-label="Workspace status pulse">
        <div className={`multi-tool-hero__pulse-row multi-tool-hero__pulse--${pulse.tone}`}>
          <span
            className={`multi-tool-hero__pulse-dot${pulse.tone === "neutral" ? "" : " multi-tool-hero__pulse-dot--live"}`}
            aria-hidden="true"
          />
          <span className="multi-tool-hero__pulse-label">
            <span className="multi-tool-hero__pulse-state">{pulse.state}</span>
            <span className="multi-tool-hero__pulse-meta">{pulse.meta}</span>
          </span>
        </div>
        <div className="multi-tool-hero__pulse-metrics">
          {metrics.map((metric) => (
            <span className="multi-tool-hero__pulse-metric" key={metric.label}>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </span>
          ))}
        </div>
      </aside>
    </header>
  );
}
