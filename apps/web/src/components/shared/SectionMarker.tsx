import type { ReactNode } from "react";
import "./SectionMarker.css";

/**
 * SectionMarker — numbered section divider primitive.
 *
 * Promoted in 2026-04-27 Phase A3 from the TodayPanel-local
 * `.today-pulse__header` pattern (TodayPanel.css:1075–1146) so
 * every top-level page can stage a deliberate "new context"
 * beat between its hero and its main content body.
 *
 * Composition:
 *   - 3rem gutter column carrying a large mono numeral (xl scale)
 *   - ALL-CAPS mono title in the body column
 *   - Optional mono subtitle below the title (60ch max)
 *   - Two hairlines bracket the empty band — the "confidence
 *     through emptiness" beat the Nothing-aesthetic skill calls
 *     out as the page's moment of surprise.
 *
 * Mobile collapse: the gutter numeral disappears below 760px so
 * narrow viewports keep a single readable column.
 */
interface Props {
  /** Two-digit string ("01", "02", …). The hero is implicitly
   * "01" on each page, so most consumers pass "02". */
  number: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** id used for the title h2 so a section landmark above can
   * point at it via aria-labelledby. */
  titleId?: string;
  className?: string;
}

export default function SectionMarker({
  number,
  title,
  subtitle,
  titleId,
  className,
}: Props) {
  const rootClass = `section-marker${className ? ` ${className}` : ""}`;
  return (
    <header className={rootClass} data-section-number={number}>
      <span className="section-marker__numeral" aria-hidden="true">
        {number}
      </span>
      <h2 id={titleId} className="section-marker__title">
        {title}
      </h2>
      {subtitle ? (
        <p className="section-marker__subtitle">{subtitle}</p>
      ) : null}
    </header>
  );
}
