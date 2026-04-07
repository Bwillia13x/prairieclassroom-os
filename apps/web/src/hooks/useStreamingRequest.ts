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
  // Stabilize opts to avoid re-creating execute on every render
  const sectionLabelsKey = opts?.sectionLabels?.join(",") ?? "";
  const stableSectionLabels = useMemo(() => sectionLabelsKey ? sectionLabelsKey.split(",") : [], [sectionLabelsKey]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (progressRef.current) clearInterval(progressRef.current);
      if (thinkingRef.current) clearInterval(thinkingRef.current);
    };
  }, []);

  const execute = useCallback(
    async (fn: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal): Promise<T | null> => {
      // Start thinking phase
      dispatch({ type: "STREAM_START", phase: "thinking" });

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
        const result = await fn(signal ?? new AbortController().signal);

        if (!mountedRef.current) return null;

        // Stop progress timers
        if (progressRef.current) clearInterval(progressRef.current);
        if (thinkingRef.current) clearInterval(thinkingRef.current);

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
        setTimeout(() => {
          if (mountedRef.current) dispatch({ type: "STREAM_RESET" });
        }, 600);

        return result;
      } catch (err) {
        if (progressRef.current) clearInterval(progressRef.current);
        if (thinkingRef.current) clearInterval(thinkingRef.current);
        if (mountedRef.current) dispatch({ type: "STREAM_RESET" });
        throw err;
      }
    },
    [dispatch, stableSectionLabels],
  );

  return { execute };
}
