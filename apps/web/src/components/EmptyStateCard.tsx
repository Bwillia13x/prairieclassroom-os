import type { ReactNode } from "react";

/**
 * EmptyStateCard — the shared empty-canvas primitive.
 *
 * The audit (Workstream G) flagged that every panel rendered the same
 * icon + "No X yet" + numbered-steps template, which after a few panels
 * read as a default rather than considered design. We now differentiate
 * by archetype:
 *
 *   - "minimal":  high-frequency tap flows (Log Intervention, Family
 *                 Message draft). One quiet line of secondary text and
 *                 an optional tertiary hint. No icon. No steps. No box.
 *
 *   - "preview":  generators where the shape of the output teaches the
 *                 user faster than prose can (Differentiate, Tomorrow
 *                 Plan, EA Briefing). A skeleton of empty outlined
 *                 cards at 40% opacity. No instructions.
 *
 *   - "sample":   analysis tools where a real-shaped result is more
 *                 honest than an explainer (Support Patterns, Forecast).
 *                 A real component instance at 60% opacity, tagged
 *                 [SAMPLE] in the corner. The real run replaces it
 *                 with no layout shift.
 *
 * The legacy props (icon / title / description / steps / actionLabel)
 * have been removed; callers that need a heading should use the
 * variant-appropriate API below.
 */

interface MinimalProps {
  variant?: "minimal";
  /** One quiet line of secondary text. e.g. "Select a student to begin." */
  cue: string;
  /** Optional second line, rendered in tertiary tone. */
  hint?: string;
}

interface PreviewProps {
  variant: "preview";
  /** Optional accessible label describing what the skeleton represents. */
  label?: string;
}

interface SampleProps {
  variant: "sample";
  /** A real-shaped component instance. Rendered at 60% opacity behind a [SAMPLE] tag. */
  sampleNode: ReactNode;
  /** Optional accessible label describing what the sample represents. */
  label?: string;
}

type Props = MinimalProps | PreviewProps | SampleProps;

export default function EmptyStateCard(props: Props) {
  if (props.variant === "preview") {
    return (
      <div
        className="empty-state empty-state--preview"
        role="status"
        aria-label={props.label ?? "Output preview"}
      >
        <div className="empty-state__skeleton-grid" aria-hidden="true">
          <div className="empty-state__skeleton-card" />
          <div className="empty-state__skeleton-card" />
          <div className="empty-state__skeleton-card" />
        </div>
      </div>
    );
  }

  if (props.variant === "sample") {
    return (
      <div
        className="empty-state empty-state--sample"
        role="status"
        aria-label={props.label ?? "Sample result"}
      >
        <span className="empty-state__sample-tag" aria-hidden="true">
          [SAMPLE]
        </span>
        <div className="empty-state__sample-body">{props.sampleNode}</div>
      </div>
    );
  }

  // minimal (default)
  return (
    <div className="empty-state empty-state--minimal" role="status">
      <p className="empty-state__cue">{props.cue}</p>
      {props.hint ? <p className="empty-state__hint">{props.hint}</p> : null}
    </div>
  );
}
