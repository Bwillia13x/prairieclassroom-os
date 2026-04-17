/**
 * Institutional PrairieClassroom wordmark.
 *
 * Wordmark-forward, quieter than the prior filled-square app-icon treatment.
 * The monogram is a small "PC" ligature rendered as three overlapped prairie
 * horizon lines at token-driven accent color — readable at small sizes,
 * restrained at large sizes, token-driven in both themes.
 *
 * Token-driven so the mark adapts across light, dark, and prefers-contrast.
 */
export default function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      role="img"
      aria-label="PrairieClassroom"
      viewBox="0 0 280 40"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Subtle horizon monogram — three stacked strokes at the prairie
          accent, reading as horizon lines rather than a filled app icon */}
      <g strokeLinecap="round" fill="none">
        <path d="M4 14 Q14 10 26 14" stroke="var(--color-accent)" strokeWidth="2.2" opacity="0.95" />
        <path d="M4 22 Q14 18 26 22" stroke="var(--color-accent)" strokeWidth="2.2" opacity="0.6" />
        <path d="M4 30 Q14 26 26 30" stroke="var(--color-brand-highlight)" strokeWidth="2.2" opacity="0.85" />
      </g>

      {/* Wordmark — humanist sans. The semibold weight + tight tracking
          reads as institutional-confident rather than marketing-loud. */}
      <text
        x="38"
        y="26"
        fill="var(--color-text)"
        fontFamily="var(--font-sans)"
        fontSize="17"
        fontWeight="600"
        letterSpacing="-0.005em"
      >
        PrairieClassroom
      </text>
    </svg>
  );
}
