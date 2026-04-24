import type { ReactNode } from "react";

export type OperationalPreviewChipTone =
  | "neutral"
  | "watch"
  | "danger"
  | "success"
  | "accent";

export interface OperationalPreviewChip {
  label: string;
  tone?: OperationalPreviewChipTone;
  meta?: string;
  title?: string;
}

export interface OperationalPreviewEvidence {
  label: string;
  meta: string;
}

export interface OperationalPreviewGroup {
  /** Eyebrow label rendered above the group body. */
  eyebrow: string;
  /** Optional secondary line under the eyebrow (date, last sync, count). */
  meta?: string;
  /** Inline chip row — typical for student/EAL/coverage chips. */
  chips?: OperationalPreviewChip[];
  /** Two-column evidence rows — typical for risk tiles or trace rows. */
  evidence?: OperationalPreviewEvidence[];
  /** Free-form children for callers that need a custom group body. */
  children?: ReactNode;
}

interface Props {
  /** Aria label for the section landmark — required for accessibility. */
  ariaLabel: string;
  /** Optional id for anchor linking from PageAnchorRail. */
  id?: string;
  /** Section header rendered above the body. Pass null to omit. */
  header?: ReactNode;
  /** Body groups laid out in an auto-fit grid. */
  groups: OperationalPreviewGroup[];
  /** Optional footer content rendered below the groups (e.g. action button). */
  footer?: ReactNode;
  className?: string;
}

/**
 * OperationalPreview — dense below-hero strip primitive.
 *
 * Used for the operational-preview surface that follows the page hero on
 * Classroom / Today / Tomorrow / Week / Prep / Ops / Review. Groups student
 * chips, queue previews, mini-timelines, coverage rings, risk tiles, and
 * evidence rows inside a single framed container so the first screen carries
 * both command-block and dense-preview content without descending into
 * card-soup.
 */
export default function OperationalPreview({
  ariaLabel,
  id,
  header,
  groups,
  footer,
  className = "",
}: Props) {
  const classes = ["operational-preview", className].filter(Boolean).join(" ");

  return (
    <section className={classes} aria-label={ariaLabel} id={id}>
      {header ?? null}
      <div className="operational-preview__body">
        {groups.map((group, groupIdx) => (
          <div className="operational-preview__group" key={`${group.eyebrow}-${groupIdx}`}>
            <span className="operational-preview__eyebrow">{group.eyebrow}</span>
            {group.meta ? (
              <span className="operational-preview__group-meta">{group.meta}</span>
            ) : null}
            {group.chips && group.chips.length > 0 ? (
              <div className="operational-preview__chip-row" role="list">
                {group.chips.map((chip, idx) => (
                  <span
                    key={`${chip.label}-${idx}`}
                    className={`preview-chip${chip.tone ? ` preview-chip--${chip.tone}` : ""}`}
                    role="listitem"
                    title={chip.title}
                  >
                    <span className="preview-chip__dot" aria-hidden="true" />
                    {chip.label}
                    {chip.meta ? (
                      <span className="preview-chip__meta">· {chip.meta}</span>
                    ) : null}
                  </span>
                ))}
              </div>
            ) : null}
            {group.evidence && group.evidence.length > 0 ? (
              <div className="operational-preview__evidence">
                {group.evidence.map((row, idx) => (
                  <div className="preview-evidence-row" key={`${row.label}-${idx}`}>
                    <span className="preview-evidence-row__label">{row.label}</span>
                    <span className="preview-evidence-row__meta">{row.meta}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {group.children ?? null}
          </div>
        ))}
      </div>
      {footer ? <div className="operational-preview__footer">{footer}</div> : null}
    </section>
  );
}
