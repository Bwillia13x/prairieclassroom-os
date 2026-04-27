import { useMemo } from "react";

/**
 * Returns `true` when the user has expressed a preference for reduced motion
 * via the OS-level `prefers-reduced-motion: reduce` media query, `false`
 * otherwise. Defensive against missing `window` (SSR) and missing
 * `window.matchMedia` (jsdom test environment without explicit polyfill).
 *
 * Computed once on mount via `useMemo([])` — does NOT subscribe to the
 * `MediaQueryList.change` event. Trade-off: simpler API, lower risk (no
 * re-render storms when consumers don't expect them), matches the prior
 * inline call-site contracts exactly. Cost: a user who toggles their OS
 * preference mid-session sees the change only on the next mount or refresh.
 *
 * If a future consumer needs live-updating behavior, the right move is a
 * separate subscribed variant (e.g., `useReducedMotionLive`) rather than
 * promoting this hook to subscribe — flipping every existing consumer to
 * re-render on OS preference change is a behavior change, not a refactor.
 *
 * Phase 3 follow-up (2026-04-28): consolidates the three duplicated
 * inline checks that previously lived in NumberTicker.tsx,
 * CohortSparklineGrid.tsx (`prefersReducedMotionMatch()`), and
 * DataVisualizations.tsx's `DebtTrendSparkline`.
 */
export function useReducedMotion(): boolean {
  return useMemo(() => {
    if (typeof window === "undefined") return false;
    if (typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);
}
