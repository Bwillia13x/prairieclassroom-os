import { useEffect, useState } from "react";
import "./TodayAnchorRail.css";

/**
 * Audit #31-#33: sticky left-rail nav for the Today panel.
 *
 * Each anchor corresponds to a section `id` in `TodayPanel.tsx`. The
 * rail uses an IntersectionObserver to highlight whichever section is
 * most visible, reinforcing the dashboard metaphor and giving teachers
 * both a table-of-contents and a return-to-top escape hatch at the
 * end of the 10-section scroll.
 */

export interface Anchor {
  id: string;
  number: string; // "01"…"10"
  label: string;
}

interface Props {
  anchors: Anchor[];
}

export default function TodayAnchorRail({ anchors }: Props) {
  const [activeId, setActiveId] = useState<string>(anchors[0]?.id ?? "");

  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      return;
    }
    const targets = anchors
      .map((a) => document.getElementById(a.id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    /* The scroll container is the tab panel wrapping this page, not
       the viewport.  Use it as the IntersectionObserver root so the
       active-section highlight stays accurate even when the panel
       doesn't exactly fill the screen. */
    const scrollRoot =
      targets[0].closest<HTMLElement>('[role="tabpanel"]') ?? null;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { root: scrollRoot, rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    for (const t of targets) observer.observe(t);
    return () => observer.disconnect();
  }, [anchors]);

  return (
    <nav className="today-anchor-rail" aria-label="Today sections">
      <ol className="today-anchor-rail__list">
        {anchors.map((a) => (
          <li key={a.id}>
            <a
              href={`#${a.id}`}
              className={`today-anchor-rail__link${activeId === a.id ? " today-anchor-rail__link--active" : ""}`}
              aria-current={activeId === a.id ? "location" : undefined}
            >
              <span className="today-anchor-rail__number">{a.number}</span>
              <span className="today-anchor-rail__label">{a.label}</span>
            </a>
          </li>
        ))}
        <li>
          <a href="#today-top" className="today-anchor-rail__back-to-top">
            ↑ Back to top
          </a>
        </li>
      </ol>
    </nav>
  );
}
