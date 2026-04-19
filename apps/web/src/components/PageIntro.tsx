import type { ReactNode } from "react";
import type { SectionTone } from "../appReducer";
import type { SectionIconName } from "./SectionIcon";
import SectionIcon from "./SectionIcon";

interface Badge {
  label: string;
  tone?: "accent" | "analysis" | "provenance" | "pending" | "success" | "warning" | "danger" | "muted" | "live" | "sun" | "sage" | "slate" | "forest";
  icon?: string;
  onClick?: () => void;
}

interface Breadcrumb {
  group: string;
  tab: string;
}

interface Props {
  /**
   * Small uppercase label above the title. Optional — when omitted, the
   * eyebrow row is not rendered. OPS panels drop it in favor of the
   * breadcrumb (2026-04-19 OPS audit). Keep it on panels whose breadcrumb
   * alone would not read as a complete orienting cue.
   */
  eyebrow?: string;
  title: string;
  description: ReactNode;
  badges?: Badge[];
  sectionTone?: SectionTone;
  sectionIcon?: SectionIconName;
  breadcrumb?: Breadcrumb;
}

export default function PageIntro({
  eyebrow,
  title,
  description,
  badges = [],
  sectionTone,
  sectionIcon,
  breadcrumb,
}: Props) {
  const showBreadcrumbTab =
    breadcrumb &&
    (!eyebrow || breadcrumb.tab.trim().toLowerCase() !== eyebrow.trim().toLowerCase());
  return (
    <header className={`page-intro${sectionTone ? ` page-intro--${sectionTone}` : ""}`}>
      {breadcrumb ? (
        <nav className="page-intro__breadcrumb" aria-label="You are here">
          <span className="page-intro__breadcrumb-group">{breadcrumb.group}</span>
          {showBreadcrumbTab ? (
            <>
              <span className="page-intro__breadcrumb-sep" aria-hidden="true">›</span>
              <span className="page-intro__breadcrumb-tab">{breadcrumb.tab}</span>
            </>
          ) : null}
        </nav>
      ) : null}
      {eyebrow ? (
        <div className="page-intro__eyebrow">
          {sectionIcon ? <SectionIcon name={sectionIcon} className="page-intro__eyebrow-icon" /> : null}
          <span>{eyebrow}</span>
        </div>
      ) : null}
      <h2 className="page-intro__title">{title}</h2>
      <div className="page-intro__description copy-measure">{description}</div>
      {badges.length > 0 && (
        <div className="status-chip-row">
          {badges.map((badge) => {
            const tone = badge.tone ?? "muted";
            const key = `${badge.label}-${tone}`;
            const className = `status-chip status-chip--${tone}`;
            const content = (
              <>
                {badge.icon ? <span aria-hidden="true">{badge.icon}</span> : null}
                <span>{badge.label}</span>
              </>
            );
            if (tone === "live") {
              return (
                <button
                  key={key}
                  type="button"
                  className={className}
                  onClick={badge.onClick}
                >
                  {content}
                </button>
              );
            }
            return (
              <span key={key} className={className}>
                {content}
              </span>
            );
          })}
        </div>
      )}
    </header>
  );
}
