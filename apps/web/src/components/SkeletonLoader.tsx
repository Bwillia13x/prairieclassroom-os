import NothingSpinner, {
  type NothingSpinnerVariant,
} from "./shared/NothingSpinner";

interface Props {
  /** "grid" for variant cards, "stack" for plan/list sections, "single" for a single card */
  variant: "grid" | "stack" | "single";
  /** Loading message displayed above the skeleton */
  message: string;
  /** aria-label for the loading container */
  label: string;
}

/**
 * Per-variant N0thing instrument pairing:
 *
 * - `grid`   → `seg-ring` (stepped, mechanical — fits a differentiation
 *              grid where variants snap into place)
 * - `stack`  → `dual-arc` (the heavier, counter-rotating arc reads as
 *              "deep planning" for Tomorrow Plan / EA Briefing stacks)
 * - `single` → `orbit`    (single dashed guide — a focused single-card
 *              compose moment)
 */
const VARIANT_SPINNER: Record<Props["variant"], NothingSpinnerVariant> = {
  grid: "seg-ring",
  stack: "dual-arc",
  single: "orbit",
};

function LoadingLabel({
  message,
  planning,
  variant,
}: {
  message: string;
  planning?: boolean;
  variant: Props["variant"];
}) {
  const cls = planning
    ? "loading-indicator loading-indicator--nothing loading-indicator--planning"
    : "loading-indicator loading-indicator--nothing";
  return (
    <div className={cls}>
      <NothingSpinner
        decorative
        size="sm"
        variant={VARIANT_SPINNER[variant]}
        tone={planning ? "accent" : "default"}
        label={message}
      />
      <span className="loading-indicator__message">{message}</span>
    </div>
  );
}

export default function SkeletonLoader({ variant, message, label }: Props) {
  if (variant === "grid") {
    return (
      <div aria-busy="true" aria-label={label}>
        <LoadingLabel message={message} variant="grid" />
        <div className="skeleton-grid">
          {[1, 2, 3].map((n) => (
            <div key={n} className="skeleton-card">
              <div className="skeleton-line skeleton-line--short" />
              <div className="skeleton-line skeleton-line--long" />
              <div className="skeleton-line skeleton-line--medium" />
              <div className="skeleton-line skeleton-line--full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "stack") {
    return (
      <div aria-busy="true" aria-label={label}>
        <LoadingLabel message={message} variant="stack" planning />
        <div className="skeleton-stack">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="skeleton-card">
              <div className="skeleton-line skeleton-line--short" />
              <div className="skeleton-line skeleton-line--long" />
              <div className="skeleton-line skeleton-line--medium" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div aria-busy="true" aria-label={label}>
      <LoadingLabel message={message} variant="single" />
      <div className="skeleton-card skeleton-card--single">
        <div className="skeleton-line skeleton-line--full" />
        <div className="skeleton-line skeleton-line--long" />
        <div className="skeleton-line skeleton-line--medium" />
      </div>
    </div>
  );
}
