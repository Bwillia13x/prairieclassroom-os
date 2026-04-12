/**
 * EmptyStateIllustration — named SVG illustrations for empty-state cards.
 * Centralizes the hand-drawn prairie-style art that was previously inline in each panel.
 * All illustrations use CSS custom properties so they adapt to light/dark mode.
 */

export type IllustrationName =
  | "prairie"
  | "plan"
  | "forecast"
  | "message"
  | "intervention"
  | "differentiate"
  | "language"
  | "patterns"
  | "briefing"
  | "packet";

interface Props {
  name: IllustrationName;
  className?: string;
}

export default function EmptyStateIllustration({ name, className }: Props) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {illustrations[name]}
    </svg>
  );
}

const illustrations: Record<IllustrationName, React.ReactNode> = {
  prairie: (
    <>
      <path d="M8 36 Q16 20 24 28 Q32 16 40 24" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" fill="none" />
      <line x1="8" y1="38" x2="40" y2="38" stroke="var(--color-border)" strokeWidth="1.5" />
      <circle cx="24" cy="14" r="6" stroke="var(--color-accent)" strokeWidth="1.5" fill="var(--color-bg-accent)" />
    </>
  ),
  plan: (
    <>
      <path d="M8 36 Q16 20 24 28 Q32 16 40 24" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" fill="none" />
      <line x1="8" y1="38" x2="40" y2="38" stroke="var(--color-border)" strokeWidth="1.5" />
      <circle cx="36" cy="14" r="5" stroke="var(--color-accent)" strokeWidth="1.5" fill="var(--color-bg-accent)" />
      <path d="M36 12v4M36 12l2 2" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  forecast: (
    <>
      <path d="M4 36 Q12 22 20 30 Q28 18 36 26 Q40 22 44 28" stroke="var(--color-border)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="4" y1="38" x2="44" y2="38" stroke="var(--color-border)" strokeWidth="1.5" />
      <circle cx="14" cy="14" r="6" stroke="var(--color-accent)" strokeWidth="2" fill="none" />
      <path d="M14 11v6M11 14h6" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M28 10a6 6 0 01-1 12h-2" stroke="var(--color-text-secondary)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </>
  ),
  message: (
    <>
      <rect x="6" y="14" width="36" height="22" rx="3" stroke="var(--color-border)" strokeWidth="2" />
      <path d="M6 17l18 11 18-11" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  intervention: (
    <>
      <rect x="10" y="4" width="28" height="36" rx="2" stroke="var(--color-border)" strokeWidth="2" />
      <path d="M16 14h16M16 20h12M16 26h8" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="33" r="1.5" fill="var(--color-accent)" />
      <path d="M20 33h10" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  differentiate: (
    <>
      <rect x="4" y="8" width="16" height="20" rx="2" stroke="var(--color-border)" strokeWidth="1.5" />
      <rect x="28" y="8" width="16" height="20" rx="2" stroke="var(--color-accent)" strokeWidth="1.5" fill="var(--color-bg-accent)" />
      <path d="M8 14h8M8 18h6M8 22h4" stroke="var(--color-border-strong)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M32 14h8M32 18h6M32 22h4" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M22 18l4 0" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" />
      <path d="M23 16l3 2-3 2" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  language: (
    <>
      <path d="M10 10h12M16 10v16" stroke="var(--color-border)" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 18h8" stroke="var(--color-border)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M30 12l-4 16M38 12l4 16M28 22h10" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  patterns: (
    <>
      <circle cx="14" cy="16" r="5" stroke="var(--color-border)" strokeWidth="1.5" />
      <circle cx="34" cy="16" r="5" stroke="var(--color-border)" strokeWidth="1.5" />
      <circle cx="24" cy="32" r="5" stroke="var(--color-accent)" strokeWidth="1.5" fill="var(--color-bg-accent)" />
      <path d="M18 19l3 8M30 19l-3 8" stroke="var(--color-border-strong)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M19 14h10" stroke="var(--color-border)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 3" />
    </>
  ),
  briefing: (
    <>
      <rect x="8" y="6" width="32" height="36" rx="2" stroke="var(--color-border)" strokeWidth="1.5" />
      <path d="M14 14h20M14 20h16M14 26h12" stroke="var(--color-border-strong)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="36" cy="36" r="8" stroke="var(--color-accent)" strokeWidth="1.5" fill="var(--color-bg-accent)" />
      <path d="M34 36h4M36 34v4" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  packet: (
    <>
      <rect x="6" y="4" width="24" height="32" rx="2" stroke="var(--color-border)" strokeWidth="1.5" />
      <rect x="10" y="8" width="24" height="32" rx="2" stroke="var(--color-border-strong)" strokeWidth="1.5" fill="var(--color-surface)" />
      <path d="M16 16h12M16 22h10M16 28h8" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
};
