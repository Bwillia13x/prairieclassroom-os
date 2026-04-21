/**
 * Compute which edge fades ("scrolled-start" / "scrolled-end") the Ops tab
 * strip should show, given a scroll container's geometry. Extracted as a pure
 * function so the rule ("fade appears only when the strip is genuinely
 * scrolled past that edge") is regression-guarded without needing a real
 * browser.
 *
 * Tolerance of 1px on both edges: browsers round scroll positions
 * inconsistently, so treating the last pixel as "at the end" avoids flicker
 * between the fade on/off at rest.
 *
 * Wired from `useLayoutEffect` in App.tsx; see Round 2 UI polish notes.
 */
export interface TabScrollFadeState {
  /** True when scrollLeft is at (or before) the left edge. ::before fade hidden. */
  atStart: boolean;
  /** True when the right edge of the viewport is at (or past) content end. ::after fade hidden. */
  atEnd: boolean;
}

export function computeTabScrollFadeState(
  scrollLeft: number,
  scrollWidth: number,
  clientWidth: number,
): TabScrollFadeState {
  const scrollable = scrollWidth - clientWidth > 1;
  if (!scrollable) {
    return { atStart: true, atEnd: true };
  }
  return {
    atStart: scrollLeft <= 0,
    atEnd: scrollLeft + clientWidth >= scrollWidth - 1,
  };
}
