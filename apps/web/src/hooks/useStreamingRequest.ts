import { useCallback, useRef, useEffect, useMemo } from "react";
import { useApp } from "../AppContext";

/**
 * useStreamingRequest — wraps a planning-tier API call with progressive
 * streaming state dispatched through the app reducer.
 *
 * Since the backend currently returns a single JSON response (not SSE),
 * this hook simulates progressive disclosure by:
 * 1. Starting a "thinking" phase with estimated progress
 * 2. Transitioning to "structuring" when the response arrives
 * 3. Animating section labels as they're "revealed"
 *
 * When the backend adds real SSE streaming, this hook can be upgraded to
 * consume incremental chunks without changing any consumer code.
 */

const THINKING_MESSAGES = [
  "Reviewing classroom context…",
  "Analyzing recent observations…",
  "Considering student needs…",
  "Synthesizing patterns from memory…",
  "Building structured recommendations…",
];

interface UseStreamingRequestOptions {
  /** Section labels to show as "arriving" when response completes */
  sectionLabels?: string[];
}

export function useStreamingRequest<T>(opts?: UseStreamingRequestOptions) {
  const { dispatch } = useApp();
  const mountedRef = useRef(true);
  const progressRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const thinkingRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const tickRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Stabilize opts to avoid re-creating execute on every render
  const sectionLabelsKey = opts?.sectionLabels?.join(",") ?? "";
  const stableSectionLabels = useMemo(() => sectionLabelsKey ? sectionLabelsKey.split(",") : [], [sectionLabelsKey]);

  /** Clear all running intervals and pending reset timer */
  function clearAllTimers() {
    if (progressRef.current) { clearInterval(progressRef.current); progressRef.current = undefined; }
    if (thinkingRef.current) { clearInterval(thinkingRef.current); thinkingRef.current = undefined; }
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = undefined; }
    if (resetTimerRef.current) { clearTimeout(resetTimerRef.current); resetTimerRef.current = undefined; }
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearAllTimers();
    };
  }, []);

  const execute = useCallback(
    async (fn: () => Promise<T | null>): Promise<T | null> => {
      // Cancel any pending reset from a prior run
      clearAllTimers();

      // Start thinking phase
      dispatch({ type: "STREAM_START", phase: "thinking" });

      // Elapsed time ticker (1s interval)
      tickRef.current = setInterval(() => {
        if (mountedRef.current) dispatch({ type: "STREAM_TICK" });
      }, 1000);

      // Simulate progress increments while waiting
      let progress = 0;
      let thinkingIdx = 0;

      progressRef.current = setInterval(() => {
        if (!mountedRef.current) return;
        // Ease-out progress: fast at start, slows approaching 85%
        progress = Math.min(progress + (0.85 - progress) * 0.08, 0.85);
        dispatch({ type: "STREAM_PROGRESS", progress });
      }, 300);

      thinkingRef.current = setInterval(() => {
        if (!mountedRef.current) return;
        if (thinkingIdx < THINKING_MESSAGES.length) {
          dispatch({ type: "STREAM_THINKING_CHUNK", text: (thinkingIdx > 0 ? "\n" : "") + THINKING_MESSAGES[thinkingIdx] });
          thinkingIdx++;
        }
      }, 1500);

      try {
        const result = await fn();

        // Null return means the inner action was cancelled or aborted
        if (result === null || !mountedRef.current) {
          clearAllTimers();
          if (mountedRef.current) dispatch({ type: "STREAM_RESET" });
          return null;
        }

        // Stop progress/thinking timers (tick already served its purpose)
        clearAllTimers();

        // Transition to structuring phase — animate sections arriving
        dispatch({ type: "STREAM_PROGRESS", progress: 0.9 });

        const sections = stableSectionLabels;
        for (let i = 0; i < sections.length; i++) {
          await new Promise((r) => setTimeout(r, 150));
          if (!mountedRef.current) return null;
          dispatch({ type: "STREAM_SECTION", section: sections[i] });
        }

        // Complete
        dispatch({ type: "STREAM_PROGRESS", progress: 1 });
        await new Promise((r) => setTimeout(r, 200));
        dispatch({ type: "STREAM_COMPLETE" });

        // Brief pause before resetting so the user sees "complete"
        resetTimerRef.current = setTimeout(() => {
          if (mountedRef.current) dispatch({ type: "STREAM_RESET" });
        }, 600);

        return result;
      } catch (err) {
        clearAllTimers();
        if (mountedRef.current) dispatch({ type: "STREAM_RESET" });
        throw err;
      }
    },
    [dispatch, stableSectionLabels],
  );

  return { execute };
}
