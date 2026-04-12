import type { ReactNode } from "react";
import type { SectionTone } from "../appReducer";
import type { SectionIconName } from "./SectionIcon";
import SectionIcon from "./SectionIcon";

interface Badge {
  label: string;
  tone?: "accent" | "analysis" | "provenance" | "pending" | "success" | "warning" | "danger" | "muted" | "sun" | "sage" | "slate" | "forest";
  icon?: string;
}

interface Breadcrumb {
  group: string;
  tab: string;
}

interface Props {
  eyebrow: string;
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
  return (
    <header className={`page-intro${sectionTone ? ` page-intro--${sectionTone}` : ""}`}>
      {breadcrumb ? (
        <nav className="page-intro__breadcrumb" aria-label="You are here">
          <span className="page-intro__breadcrumb-group">{breadcrumb.group}</span>
          <span className="page-intro__breadcrumb-sep" aria-hidden="true">›</span>
          <span className="page-intro__breadcrumb-tab">{breadcrumb.tab}</span>
        </nav>
      ) : null}
      <div className="page-intro__eyebrow">
        {sectionIcon ? <SectionIcon name={sectionIcon} className="page-intro__eyebrow-icon" /> : null}
        <span>{eyebrow}</span>
      </div>
      <h2 className="page-intro__title">{title}</h2>
      <div className="page-intro__description copy-measure">{description}</div>
      {badges.length > 0 && (
        <div className="status-chip-row">
          {badges.map((badge) => (
            <span key={`${badge.label}-${badge.tone ?? "muted"}`} className={`status-chip status-chip--${badge.tone ?? "muted"}`}>
              {badge.icon ? <span aria-hidden="true">{badge.icon}</span> : null}
              <span>{badge.label}</span>
            </span>
          ))}
        </div>
      )}
    </header>
  );
}
