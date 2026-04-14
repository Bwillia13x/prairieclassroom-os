import "./SectionSkeleton.css";

interface Props {
  /** aria-label for screen readers. Defaults to "Loading section". */
  label?: string;
  /** Number of shimmer lines. Defaults to 2. */
  lines?: number;
  /** Contextual variant for styling hints (e.g., "health", "visualization"). */
  variant?: string;
}

/**
 * SectionSkeleton — minimal inline fallback for a single dashboard section.
 * Smaller and more contextual than `SkeletonLoader` — used when only part of
 * a panel is pending while other sections have already rendered real data.
 */
export default function SectionSkeleton({
  label = "Loading section",
  lines = 2,
  variant,
}: Props) {
  return (
    <div
      className="section-skeleton"
      role="status"
      aria-busy="true"
      aria-label={label}
      data-variant={variant}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`section-skeleton__line section-skeleton__line--${i % 3}`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
