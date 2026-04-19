import { useCallback, useRef, useEffect, useMemo } from "react";
import { useApp } from "../AppContext";
import type { StreamingEventHandlers } from "../api";

/**
 * useStreamingRequest — wraps a planning-tier SSE API call with streaming
 * state dispatched through the app reducer.
 */

interface UseStreamingRequestOptions {
  /** Section labels to show as "arriving" when response completes */
  sectionLabels?: string[];
}

export function useStreamingRequest<T>(opts?: UseStreamingRequestOptions) {
  const { dispatch } = useApp();
  const mountedRef = useRef(true);
  const tickRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const progressRef = useRef(0);
  const hasThinkingRef = useRef(false);
  // Stabilize opts to avoid re-creating execute on every render
  const sectionLabelsKey = opts?.sectionLabels?.join(",") ?? "";
  const stableSectionLabels = useMemo(() => sectionLabelsKey ? sectionLabelsKey.split(",") : [], [sectionLabelsKey]);

  /** Clear all running intervals and pending reset timer */
  function clearAllTimers() {
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
    async (fn: (stream: StreamingEventHandlers) => Promise<T | null>): Promise<T | null> => {
      // Cancel any pending reset from a prior run
      clearAllTimers();

      // Start thinking phase
      dispatch({ type: "STREAM_START", phase: "thinking" });
      progressRef.current = 0.04;
      hasThinkingRef.current = false;
      dispatch({ type: "STREAM_PROGRESS", progress: progressRef.current });

      // Elapsed time ticker (1s interval)
      tickRef.current = setInterval(() => {
        if (mountedRef.current) dispatch({ type: "STREAM_TICK" });
      }, 1000);

      const streamHandlers: StreamingEventHandlers = {
        onChunk: () => {
          if (!mountedRef.current) return;
          progressRef.current = Math.min(progressRef.current + 0.035, 0.88);
          dispatch({ type: "STREAM_PROGRESS", progress: progressRef.current });
        },
        onThinking: (text: string) => {
          if (!mountedRef.current) return;
          const prefix = hasThinkingRef.current && !text.startsWith("\n") ? "\n" : "";
          dispatch({ type: "STREAM_THINKING_CHUNK", text: `${prefix}${text}` });
          if (text) hasThinkingRef.current = true;
          progressRef.current = Math.min(progressRef.current + 0.02, 0.88);
          dispatch({ type: "STREAM_PROGRESS", progress: progressRef.current });
        },
      };

      try {
        const result = await fn(streamHandlers);

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
