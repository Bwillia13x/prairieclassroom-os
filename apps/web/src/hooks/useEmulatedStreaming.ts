import { useCallback, useEffect, useMemo, useRef } from "react";
import { useApp } from "../AppContext";

interface UseEmulatedStreamingOptions {
  sectionLabels?: string[];
  structuringDelayMs?: number;
}

const DEFAULT_THINKING_MESSAGES = [
  "Reading the lesson artifact…",
  "Matching it to student readiness profiles…",
  "Drafting variant scaffolds…",
  "Balancing challenge and support…",
];

export function useEmulatedStreaming(opts?: UseEmulatedStreamingOptions) {
  const { dispatch } = useApp();
  const structuringDelayMs = opts?.structuringDelayMs ?? 2000;
  const sectionLabelsKey = opts?.sectionLabels?.join("|") ?? "";
  const sectionLabels = useMemo(
    () => (sectionLabelsKey ? sectionLabelsKey.split("|") : []),
    [sectionLabelsKey],
  );

  const mountedRef = useRef(true);
  const progressTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const thinkingTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const tickTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const structuringTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function clearAllTimers() {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = undefined;
    }
    if (thinkingTimerRef.current) {
      clearInterval(thinkingTimerRef.current);
      thinkingTimerRef.current = undefined;
    }
    if (tickTimerRef.current) {
      clearInterval(tickTimerRef.current);
      tickTimerRef.current = undefined;
    }
    if (structuringTimerRef.current) {
      clearTimeout(structuringTimerRef.current);
      structuringTimerRef.current = undefined;
    }
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = undefined;
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearAllTimers();
    };
  }, []);

  const execute = useCallback(
    async <T,>(fn: () => Promise<T | null>): Promise<T | null> => {
      clearAllTimers();

      dispatch({ type: "STREAM_START", phase: "thinking" });

      tickTimerRef.current = setInterval(() => {
        if (mountedRef.current) dispatch({ type: "STREAM_TICK" });
      }, 1000);

      let progress = 0;
      progressTimerRef.current = setInterval(() => {
        if (!mountedRef.current) return;
        progress = Math.min(progress + (0.85 - progress) * 0.08, 0.85);
        dispatch({ type: "STREAM_PROGRESS", progress });
      }, 300);

      let thinkingIdx = 0;
      thinkingTimerRef.current = setInterval(() => {
        if (!mountedRef.current) return;
        if (thinkingIdx < DEFAULT_THINKING_MESSAGES.length) {
          dispatch({
            type: "STREAM_THINKING_CHUNK",
            text:
              (thinkingIdx > 0 ? "\n" : "") +
              DEFAULT_THINKING_MESSAGES[thinkingIdx],
          });
          thinkingIdx++;
        }
      }, 1500);

      structuringTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        dispatch({ type: "STREAM_PROGRESS", progress: 0.6 });
      }, structuringDelayMs);

      try {
        const result = await fn();

        if (result === null || !mountedRef.current) {
          clearAllTimers();
          if (mountedRef.current) dispatch({ type: "STREAM_RESET" });
          return null;
        }

        clearAllTimers();
        dispatch({ type: "STREAM_PROGRESS", progress: 0.9 });

        for (let i = 0; i < sectionLabels.length; i++) {
          await new Promise((r) => setTimeout(r, 150));
          if (!mountedRef.current) return null;
          dispatch({ type: "STREAM_SECTION", section: sectionLabels[i] });
        }

        dispatch({ type: "STREAM_PROGRESS", progress: 1 });
        dispatch({ type: "STREAM_COMPLETE" });

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
    [dispatch, sectionLabels, structuringDelayMs],
  );

  return { execute };
}
