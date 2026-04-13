import { useState, useCallback, useEffect, useRef } from "react";
import { submitSessionApi, type SubmitSessionRequest } from "../api";

const SESSION_QUEUE_KEY = "prairie:session-queue";

interface GenerationEvent {
  panel_id: string;
  prompt_class: string;
  timestamp: string;
}

interface UseSessionContextResult {
  sessionId: string;
  recordPanelVisit: (panelId: string) => void;
  recordGeneration: (panelId: string, promptClass: string) => void;
  recordFeedback: () => void;
}

function generateSessionId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `sess-${ts}-${rand}`;
}

/**
 * useSessionContext — tracks session-level usage within a classroom.
 *
 * Generates a unique session ID per classroom visit. Tracks panels visited,
 * generations triggered, and feedback count. Flushes the session record
 * to POST /api/sessions with fetch keepalive on visibilitychange (hidden)
 * or classroom switch.
 * Falls back to localStorage queue on network failure.
 */
export function useSessionContext(classroomId: string): UseSessionContextResult {
  const [sessionId, setSessionId] = useState(() => generateSessionId());
  const startedAtRef = useRef(new Date().toISOString());
  const panelsRef = useRef<string[]>([]);
  const generationsRef = useRef<GenerationEvent[]>([]);
  const feedbackCountRef = useRef(0);
  const prevClassroomRef = useRef(classroomId);

  // Flush session data to the server (or localStorage fallback)
  const flush = useCallback(() => {
    const targetClassroomId = prevClassroomRef.current;
    if (!targetClassroomId || panelsRef.current.length === 0) return;

    const request: SubmitSessionRequest = {
      classroom_id: targetClassroomId,
      session_id: sessionId,
      started_at: startedAtRef.current,
      ended_at: new Date().toISOString(),
      panels_visited: [...panelsRef.current],
      generations_triggered: [...generationsRef.current],
      feedback_count: feedbackCountRef.current,
    };

    // keepalive preserves classroom auth headers for protected classrooms.
    submitSessionApi(request, undefined, { keepalive: true }).catch(() => {
      queueSession(request);
    });
  }, [sessionId]);

  // Reset on classroom change
  useEffect(() => {
    if (classroomId !== prevClassroomRef.current) {
      // Flush previous session before resetting
      flush();

      // Reset for new classroom
      const newId = generateSessionId();
      setSessionId(newId);
      startedAtRef.current = new Date().toISOString();
      panelsRef.current = [];
      generationsRef.current = [];
      feedbackCountRef.current = 0;
      prevClassroomRef.current = classroomId;
    }
  }, [classroomId, flush]);

  // Flush on visibilitychange (tab hidden / page unload)
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        flush();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [flush]);

  const recordPanelVisit = useCallback((panelId: string) => {
    const panels = panelsRef.current;
    // Only add if different from the last visited panel (dedupe consecutive)
    if (panels[panels.length - 1] !== panelId) {
      panels.push(panelId);
    }
  }, []);

  const recordGeneration = useCallback((panelId: string, promptClass: string) => {
    generationsRef.current.push({
      panel_id: panelId,
      prompt_class: promptClass,
      timestamp: new Date().toISOString(),
    });
  }, []);

  const recordFeedback = useCallback(() => {
    feedbackCountRef.current++;
  }, []);

  return { sessionId, recordPanelVisit, recordGeneration, recordFeedback };
}

// ---------------------------------------------------------------------------
// localStorage fallback queue
// ---------------------------------------------------------------------------

function queueSession(request: SubmitSessionRequest): void {
  try {
    const existing = localStorage.getItem(SESSION_QUEUE_KEY);
    const queue: SubmitSessionRequest[] = existing ? JSON.parse(existing) : [];
    queue.push(request);
    localStorage.setItem(SESSION_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // localStorage may be unavailable; silently drop
  }
}

/**
 * Flush any queued session submissions. Called on app init or network recovery.
 * Returns the number of items successfully flushed.
 */
export async function flushSessionQueue(): Promise<number> {
  let queue: SubmitSessionRequest[];
  try {
    const raw = localStorage.getItem(SESSION_QUEUE_KEY);
    if (!raw) return 0;
    queue = JSON.parse(raw);
    if (!Array.isArray(queue) || queue.length === 0) return 0;
  } catch {
    return 0;
  }

  const remaining: SubmitSessionRequest[] = [];
  let flushed = 0;

  for (const item of queue) {
    try {
      await submitSessionApi(item);
      flushed++;
    } catch {
      remaining.push(item);
    }
  }

  try {
    if (remaining.length > 0) {
      localStorage.setItem(SESSION_QUEUE_KEY, JSON.stringify(remaining));
    } else {
      localStorage.removeItem(SESSION_QUEUE_KEY);
    }
  } catch {
    // ignore
  }

  return flushed;
}
