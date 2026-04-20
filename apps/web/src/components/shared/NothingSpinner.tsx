import "./NothingSpinner.css";

/**
 * N0thing-style spinners — mechanical, stepped, typographic loading
 * indicators. Use for deterministic or retrieval-backed loads, and
 * for the Gemma planning-tier "deep reasoning" moment.
 *
 * Every variant is color-token driven (light/dark clean) and honors
 * `prefers-reduced-motion`. The component always renders a single
 * root `<span role="status">` with a descriptive `aria-label`.
 */
export type NothingSpinnerVariant =
  | "seg-ring"
  | "dual-arc"
  | "fade-dots"
  | "eq-bars"
  | "arc-dash"
  | "pulse-ring"
  | "orbit"
  | "linear";

export type NothingSpinnerSize = "sm" | "md" | "lg";
export type NothingSpinnerTone =
  | "default"
  | "accent"
  | "success"
  | "warning"
  | "danger";

interface NothingSpinnerProps {
  /** The visual variant. Defaults to "seg-ring" — the canonical loading-instrument. */
  variant?: NothingSpinnerVariant;
  /** sm=22, md=32, lg=46 px — snaps to control scale. */
  size?: NothingSpinnerSize;
  /** Semantic tone — defaults to primary text color. */
  tone?: NothingSpinnerTone;
  /** Required: accessible label read by screen readers. */
  label: string;
  /**
   * When true, the spinner is rendered purely decoratively
   * (`aria-hidden="true"`, no role). Use this when the spinner
   * is nested inside a parent that already exposes `role="status"`
   * and a label (e.g. StreamingIndicator). Defaults to false.
   */
  decorative?: boolean;
  /** Extra class for layout positioning. */
  className?: string;
  /** Forward for testing / layout selectors. */
  "data-testid"?: string;
}

function joinClassNames(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export default function NothingSpinner({
  variant = "seg-ring",
  size = "md",
  tone = "default",
  label,
  decorative = false,
  className,
  "data-testid": dataTestId,
}: NothingSpinnerProps) {
  const classes = joinClassNames(
    "nothing-spinner",
    `nothing-spinner--${size}`,
    tone !== "default" && `nothing-spinner--${tone}`,
    variant === "linear" && size === "lg" && "nothing-spinner--linear-size-full",
    className,
  );

  const a11yProps = decorative
    ? ({ "aria-hidden": true } as const)
    : ({
        role: "status" as const,
        "aria-label": label,
        "aria-live": "polite" as const,
        "aria-busy": "true" as const,
      });

  return (
    <span
      {...a11yProps}
      className={classes}
      data-variant={variant}
      data-testid={dataTestId}
    >
      {variant === "seg-ring" && (
        <span className="nothing-spinner__segring" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, i) => (
            <i key={i} />
          ))}
        </span>
      )}

      {variant === "dual-arc" && (
        <span className="nothing-spinner__dual" aria-hidden="true" />
      )}

      {variant === "fade-dots" && (
        <span className="nothing-spinner__fadedots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      )}

      {variant === "eq-bars" && (
        <span className="nothing-spinner__eq" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
      )}

      {variant === "arc-dash" && (
        <svg
          className="nothing-spinner__arc"
          viewBox="0 0 50 50"
          aria-hidden="true"
        >
          <circle
            className="nothing-spinner__arc-track"
            cx="25"
            cy="25"
            r="20"
            fill="none"
            strokeWidth="2"
          />
          <circle
            className="nothing-spinner__arc-head"
            cx="25"
            cy="25"
            r="20"
            fill="none"
            strokeWidth="2"
            strokeLinecap="butt"
            strokeDasharray="60 100"
          />
        </svg>
      )}

      {variant === "pulse-ring" && (
        <span className="nothing-spinner__pulsering" aria-hidden="true">
          <i />
        </span>
      )}

      {variant === "orbit" && (
        <span className="nothing-spinner__orbit" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      )}

      {variant === "linear" && (
        <span className="nothing-spinner__linear" aria-hidden="true" />
      )}
    </span>
  );
}
