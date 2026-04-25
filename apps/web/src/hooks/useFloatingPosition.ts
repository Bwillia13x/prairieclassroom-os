import { useLayoutEffect, useState, type RefObject } from "react";

export type Placement =
  | "bottom-start"
  | "bottom"
  | "bottom-end"
  | "top-start"
  | "top"
  | "top-end";

export interface UseFloatingPositionOptions {
  anchorRef: RefObject<HTMLElement | null>;
  popoverRef: RefObject<HTMLElement | null>;
  open: boolean;
  placement?: Placement;
  /** Distance between anchor edge and popover edge, in px. */
  gap?: number;
  /** Viewport edge padding for the shift fallback, in px. */
  viewportPadding?: number;
}

export interface FloatingPosition {
  top: number;
  left: number;
  /** CSS transform-origin matching the resolved placement, so the
   *  enter animation appears to grow out of the trigger corner. */
  transformOrigin: string;
  /** Resolved placement after flip — useful for callers that want
   *  to render a directional caret or shadow. */
  resolvedPlacement: Placement;
  /** False until first measurement happens. Use to gate opacity so
   *  the popover never paints at (0,0) before being positioned. */
  ready: boolean;
}

const DEFAULT: FloatingPosition = {
  top: 0,
  left: 0,
  transformOrigin: "top left",
  resolvedPlacement: "bottom-start",
  ready: false,
};

function transformOriginFor(placement: Placement): string {
  switch (placement) {
    case "bottom-start": return "top left";
    case "bottom":       return "top center";
    case "bottom-end":   return "top right";
    case "top-start":    return "bottom left";
    case "top":          return "bottom center";
    case "top-end":      return "bottom right";
  }
}

function flip(placement: Placement): Placement {
  if (placement.startsWith("bottom")) {
    return placement.replace("bottom", "top") as Placement;
  }
  return placement.replace("top", "bottom") as Placement;
}

/**
 * Compute the viewport-fixed top/left for a popover anchored to a trigger.
 *
 * Strategy: try the requested placement first. If the popover would overflow
 * the viewport on the primary axis (vertical), flip to the opposite side.
 * Then clamp on the cross axis (horizontal) so the popover stays within the
 * viewport with a consistent edge padding.
 *
 * Re-runs on window scroll (capture phase, so ancestor scrolls are caught)
 * and resize. rAF-throttled so a fast scroll only triggers one layout per
 * frame. The hook is intentionally minimal — anything more sophisticated
 * should be a separate primitive.
 */
export function useFloatingPosition({
  anchorRef,
  popoverRef,
  open,
  placement = "bottom-start",
  gap = 6,
  viewportPadding = 8,
}: UseFloatingPositionOptions): FloatingPosition {
  const [pos, setPos] = useState<FloatingPosition>(DEFAULT);

  useLayoutEffect(() => {
    if (!open) {
      setPos((prev) => (prev.ready ? DEFAULT : prev));
      return;
    }

    let raf = 0;
    function reposition() {
      const anchor = anchorRef.current;
      const popover = popoverRef.current;
      if (!anchor || !popover) return;

      const a = anchor.getBoundingClientRect();
      const p = popover.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const fitsBelow = a.bottom + gap + p.height + viewportPadding <= vh;
      const fitsAbove = a.top - gap - p.height - viewportPadding >= 0;

      let resolved: Placement = placement;
      if (placement.startsWith("bottom") && !fitsBelow && fitsAbove) {
        resolved = flip(placement);
      } else if (placement.startsWith("top") && !fitsAbove && fitsBelow) {
        resolved = flip(placement);
      }

      let top: number;
      if (resolved.startsWith("bottom")) {
        top = a.bottom + gap;
      } else {
        top = a.top - gap - p.height;
      }

      let left: number;
      if (resolved.endsWith("-start")) {
        left = a.left;
      } else if (resolved.endsWith("-end")) {
        left = a.right - p.width;
      } else {
        left = a.left + a.width / 2 - p.width / 2;
      }

      const minLeft = viewportPadding;
      const maxLeft = vw - p.width - viewportPadding;
      if (maxLeft >= minLeft) {
        left = Math.min(Math.max(left, minLeft), maxLeft);
      } else {
        left = minLeft;
      }

      setPos({
        top,
        left,
        transformOrigin: transformOriginFor(resolved),
        resolvedPlacement: resolved,
        ready: true,
      });
    }

    function schedule() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        reposition();
        raf = 0;
      });
    }

    reposition();
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [open, placement, gap, viewportPadding, anchorRef, popoverRef]);

  return pos;
}
