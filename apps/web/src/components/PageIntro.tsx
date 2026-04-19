import type { ReactNode } from "react";
import type { SectionTone } from "../appReducer";
import type { SectionIconName } from "./SectionIcon";

/** Tone variants reused from the StatusChip surface (see primitives.css). */
export type ChipTone =
  | "accent"
  | "analysis"
  | "provenance"
  | "pending"
  | "success"
  | "warning"
  | "danger"
  | "muted"
  | "live"
  | "sun"
  | "sage"
  | "slate"
  | "forest";

/**
 * Reserved API for genuinely dynamic per-panel context (e.g.
 * `📍 Pinned to Alberta Curriculum Grade 4 ELA` only when alignment is
 * active). When undefined or empty, no chip row is rendered. Static
 * descriptors like "Artifact-led" or grade-band repeats belong in the
 * shell chrome (`.shell-classroom-pill`), not in the section header.
 */
export interface ChipSpec {
  label: string;
  tone?: ChipTone;
  icon?: string;
  onClick?: () => void;
}

/**
 * Legacy badge shape — accepted for backwards compatibility while
 * panels migrate to `dynamicContext`. PageIntro no longer renders
 * `badges`; per audit Workstream C the static chip row was removed
 * from the header.
 */
type LegacyBadge = ChipSpec;

interface Props {
  /** Section label, e.g. "Prep Workspace". Rendered as 12px mono caps. */
  eyebrow: string;
  /** Page title. Rendered with the display scale. */
  title: string;
  /** Sentence-case description below the title. */
  description: ReactNode;
  /**
   * Genuinely dynamic context chips (see {@link ChipSpec}). Renders nothing
   * when undefined or empty.
   */
  dynamicContext?: ChipSpec[];
  /**
   * @deprecated Static chip row was removed in audit Workstream C.
   * Pass dynamic chips through `dynamicContext` instead. Accepted but
   * ignored to preserve backwards compatibility while panels migrate.
   */
  badges?: LegacyBadge[];
  sectionTone?: SectionTone;
  /** @deprecated Section identity is now signaled by the section label only. */
  sectionIcon?: SectionIconName;
  /** @deprecated Breadcrumb was removed in audit Workstream C. */
  breadcrumb?: { group: string; tab: string };
}

export default function PageIntro({
  eyebrow,
  title,
  description,
  dynamicContext,
  sectionTone,
  badges,
  breadcrumb,
  sectionIcon,
}: Props) {
  if (import.meta.env.DEV) {
    const dropped: string[] = [];
    if (badges?.length) dropped.push("badges");
    if (breadcrumb) dropped.push("breadcrumb");
    if (sectionIcon) dropped.push("sectionIcon");
    if (dropped.length) {
      console.warn(
        `[PageIntro] Ignoring deprecated prop(s): ${dropped.join(", ")}. ` +
          `Static chip row, breadcrumb, and section icon were removed in audit ` +
          `Workstream C. Use \`dynamicContext\` for genuinely dynamic context. ` +
          `Caller: "${eyebrow} / ${title}"`,
      );
    }
  }
  const chips = dynamicContext ?? [];
  return (
    <header className={`page-intro${sectionTone ? ` page-intro--${sectionTone}` : ""}`}>
      <div className="page-intro__eyebrow">{eyebrow}</div>
      <h2 className="page-intro__title">{title}</h2>
      <div className="page-intro__description copy-measure">{description}</div>
      {chips.length > 0 && (
        <div className="status-chip-row">
          {chips.map((chip) => {
            const tone = chip.tone ?? "muted";
            const key = `${chip.label}-${tone}`;
            const className = `status-chip status-chip--${tone}`;
            const content = (
              <>
                {chip.icon ? <span aria-hidden="true">{chip.icon}</span> : null}
                <span>{chip.label}</span>
              </>
            );
            if (tone === "live") {
              return (
                <button
                  key={key}
                  type="button"
                  className={className}
                  onClick={chip.onClick}
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
