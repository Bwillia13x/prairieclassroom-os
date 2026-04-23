import { useEffect } from "react";

/**
 * useAmbientCursorGlow — tracks the pointer across selected surfaces and
 * sets CSS variables so `ambient.css` can paint a mouse-following glow
 * via radial-gradient(... at var(--_ambient-mx) var(--_ambient-my)).
 *
 * This is a pure-presentation hook — it never mutates layout, never
 * allocates per-frame, and disables itself under reduced-motion.
 *
 * Implementation notes:
 *   - Delegates on document so we don't attach a listener per card.
 *   - Throttles writes to one per rAF; repeated writes in the same
 *     frame coalesce.
 *   - Writes are in percent-of-box so the gradient is stable across
 *     box sizes without JS-side math on each resize.
 */
const AMBIENT_GLOW_SELECTOR = [
  ".surface-panel",
  ".shell-bar__palette-btn",
  ".shell-classroom-panel",
].join(", ");

export function useAmbientCursorGlow() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches) return;

    let pendingFrame: number | null = null;
    let pendingTarget: HTMLElement | null = null;
    let pendingX = 50;
    let pendingY = 0;
    const activeTargets = new WeakSet<HTMLElement>();

    function flush() {
      pendingFrame = null;
      if (!pendingTarget) return;
      pendingTarget.style.setProperty("--_ambient-mx", `${pendingX}%`);
      pendingTarget.style.setProperty("--_ambient-my", `${pendingY}%`);
      activeTargets.add(pendingTarget);
    }

    function handlePointerMove(event: PointerEvent) {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>(AMBIENT_GLOW_SELECTOR) : null;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const mx = ((event.clientX - rect.left) / rect.width) * 100;
      const my = ((event.clientY - rect.top) / rect.height) * 100;
      pendingTarget = target;
      pendingX = Math.max(-10, Math.min(110, mx));
      pendingY = Math.max(-10, Math.min(110, my));
      if (pendingFrame === null) {
        pendingFrame = window.requestAnimationFrame(flush);
      }
    }

    function handlePointerLeave(event: PointerEvent) {
      // Only reset when the pointer leaves an actual tracked surface
      // (and not just moves between children of the same surface).
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>(AMBIENT_GLOW_SELECTOR) : null;
      if (!target || !activeTargets.has(target)) return;
      // Recenter near the top-middle so the hover exit eases back to
      // the default composition rather than snapping to a corner.
      target.style.setProperty("--_ambient-mx", "50%");
      target.style.setProperty("--_ambient-my", "0%");
    }

    document.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("pointerleave", handlePointerLeave, true);

    return () => {
      if (pendingFrame !== null) window.cancelAnimationFrame(pendingFrame);
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerleave", handlePointerLeave, true);
    };
  }, []);
}
