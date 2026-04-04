interface Props {
  /** "grid" for variant cards, "stack" for plan/list sections, "single" for a single card */
  variant: "grid" | "stack" | "single";
  /** Loading message displayed above the skeleton */
  message: string;
  /** aria-label for the loading container */
  label: string;
}

export default function SkeletonLoader({ variant, message, label }: Props) {
  if (variant === "grid") {
    return (
      <div aria-busy="true" aria-label={label}>
        <div className="loading-indicator">{message}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem", marginTop: "0.75rem" }}>
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
        <div className="loading-indicator loading-indicator--planning">{message}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.75rem" }}>
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
      <div className="loading-indicator">{message}</div>
      <div className="skeleton-card" style={{ marginTop: "0.75rem" }}>
        <div className="skeleton-line skeleton-line--full" />
        <div className="skeleton-line skeleton-line--long" />
        <div className="skeleton-line skeleton-line--medium" />
      </div>
    </div>
  );
}
