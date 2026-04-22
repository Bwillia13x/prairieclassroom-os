import type { ReactNode } from "react";
import type { SectionTone } from "../appReducer";
import type { SectionIconName } from "./SectionIcon";
import PageIntroInfoButton from "./PageIntroInfoButton";

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
  /**
   * Small uppercase label above the title. Optional — when omitted, the
   * eyebrow row is not rendered. OPS panels drop it (2026-04-19 OPS
   * audit Phase 1) because the section nav already names the workspace.
   * Keep it on panels whose context isn't redundant with the chrome.
   */
  eyebrow?: string;
  /** Page title. Rendered with the display scale. */
  title: string;
  /** Sentence-case description below the title. */
  description: ReactNode;
  /**
   * Genuinely dynamic context chips (see {@link ChipSpec}). Renders nothing
   * when undefined or empty.
   */
  dynamicContext?: ChipSpec[];
  sectionTone?: SectionTone;
  /**
   * Optional per-panel info popover. Rendered as a compact ⓘ affordance
   * next to the title. Used for panels that shed their ContextualHint in
   * the 2026-04-19 OPS GOT-IT consolidation while still wanting a
   * lightweight in-place hint.
   */
  infoContent?: { title: string; body: ReactNode };
  /**
   * Optional workflow thumbnail for high-level workspace introductions.
   * Keep this sparse: it is meant for the main Today/Prep/Ops/Review entry
   * surfaces, not every sub-panel.
   */
  visual?: { src: string; alt?: string };
  /**
   * @deprecated Static chip row was removed in audit Workstream C
   * (2026-04-19). Pass dynamic chips through `dynamicContext` instead.
   * Accepted but ignored to preserve backwards compatibility while
   * panels migrate.
   */
  badges?: LegacyBadge[];
  /** @deprecated Breadcrumb was removed in audit Workstream C. */
  breadcrumb?: { group: string; tab: string };
  /** @deprecated Section identity is now signaled by the section label only. */
  sectionIcon?: SectionIconName;
  /**
   * Opt-in brand emphasis. When `"brand"`, the eyebrow color shifts from
   * `--color-text-secondary` to the retained Prairie cognac
   * `--color-brand-highlight`. Use sparingly — only on landing surfaces
   * where brand recognition matters. Not a replacement for `sectionTone`,
   * which carries workspace identity. Introduced 2026-04-22 with the
   * Tier-B brand-affordance expansion (`docs/decision-log.md`).
   */
  emphasis?: "brand";
}

export default function PageIntro({
  eyebrow,
  title,
  description,
  dynamicContext,
  sectionTone,
  infoContent,
  visual,
  badges,
  breadcrumb,
  sectionIcon,
  emphasis,
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
          `Workstream C. Use \`dynamicContext\` for genuinely dynamic context, ` +
          `or \`infoContent\` for a per-panel ⓘ popover. ` +
          `Caller: "${eyebrow ?? "(no eyebrow)"} / ${title}"`,
      );
    }
  }
  const chips = dynamicContext ?? [];
  return (
    <header className={`page-intro${sectionTone ? ` page-intro--${sectionTone}` : ""}${visual ? " page-intro--with-visual" : ""}${emphasis === "brand" ? " page-intro--brand" : ""}`}>
      {visual ? (
        <img
          className="page-intro__visual"
          src={visual.src}
          alt={visual.alt ?? ""}
          width="320"
          height="320"
          aria-hidden={visual.alt ? undefined : true}
        />
      ) : null}
      {eyebrow ? (
        <div className="page-intro__eyebrow">{eyebrow}</div>
      ) : null}
      <h2 className="page-intro__title">
        <span className="page-intro__title-text">{title}</span>
        {infoContent ? (
          <PageIntroInfoButton title={infoContent.title} body={infoContent.body} />
        ) : null}
      </h2>
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
