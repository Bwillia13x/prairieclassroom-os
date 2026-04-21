/**
 * tabScrollFade.test.ts — regression guard for the Ops tab-strip scroll fade
 * rule: the gradient fades (`data-scrolled-start` / `data-scrolled-end`) must
 * appear only when the strip is actually scrolled past that edge, and hide
 * completely when the strip can't scroll at all. Wired from App.tsx.
 */
import { describe, it, expect } from "vitest";
import { computeTabScrollFadeState } from "../tabScrollFade";

describe("computeTabScrollFadeState", () => {
  it("returns atStart=true and atEnd=true when content fits (not scrollable)", () => {
    // scrollWidth === clientWidth — no scroll possible, both fades suppressed.
    expect(computeTabScrollFadeState(0, 800, 800)).toEqual({
      atStart: true,
      atEnd: true,
    });
  });

  it("treats sub-pixel overflow (<=1px) as not scrollable", () => {
    // Browsers round scroll geometry; 1px is noise, not a real overflow.
    expect(computeTabScrollFadeState(0, 801, 800)).toEqual({
      atStart: true,
      atEnd: true,
    });
  });

  it("suppresses only the start fade when scrolled to the left edge of a scrollable strip", () => {
    // Scrollable content, parked at scrollLeft=0 → ::before hidden, ::after shows.
    expect(computeTabScrollFadeState(0, 1200, 800)).toEqual({
      atStart: true,
      atEnd: false,
    });
  });

  it("shows both fades in the middle of a scrollable strip", () => {
    expect(computeTabScrollFadeState(200, 1200, 800)).toEqual({
      atStart: false,
      atEnd: false,
    });
  });

  it("suppresses only the end fade when scrolled to the right edge", () => {
    // scrollLeft + clientWidth === scrollWidth → ::after hidden, ::before shows.
    expect(computeTabScrollFadeState(400, 1200, 800)).toEqual({
      atStart: false,
      atEnd: true,
    });
  });

  it("treats the last pixel as 'at end' to avoid flicker from browser rounding", () => {
    // scrollLeft + clientWidth = 1199 = scrollWidth - 1 → still counts as end.
    expect(computeTabScrollFadeState(399, 1200, 800)).toEqual({
      atStart: false,
      atEnd: true,
    });
  });

  it("handles negative scroll (overscroll bounce) by treating it as start", () => {
    // Some browsers produce transient negative scrollLeft during elastic
    // overscroll. Treat as at-start — the fade has no useful meaning there.
    expect(computeTabScrollFadeState(-10, 1200, 800)).toEqual({
      atStart: true,
      atEnd: false,
    });
  });
});
