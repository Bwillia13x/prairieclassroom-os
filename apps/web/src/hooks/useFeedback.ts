import { useState, useCallback } from "react";
import { ApiError, submitFeedbackApi, type SubmitFeedbackRequest } from "../api";

const FEEDBACK_QUEUE_KEY = "prairie:feedback-queue";
const FEEDBACK_QUEUE_MAX = 50;

function isAuthFailure(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 401 || err.status === 403);
}

interface UseFeedbackResult {
  submit: (panelId: string, rating: number, comment?: string, generationId?: string, promptClass?: string) => void;
  submitted: boolean;
  error: string | null;
}

/**
 * useFeedback — submit teacher feedback on generated panel content.
 *
 * Optimistic UI: sets submitted=true immediately. Falls back to localStorage
 * queue on network failure for later retry.
 */
export function useFeedback(classroomId: string, sessionId: string): UseFeedbackResult {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    (panelId: string, rating: number, comment?: string, generationId?: string, promptClass?: string) => {
      // Optimistic: show success immediately
      setSubmitted(true);
      setError(null);

      const request: SubmitFeedbackRequest = {
        classroom_id: classroomId,
        panel_id: panelId,
        rating,
        comment: comment || undefined,
        generation_id: generationId || undefined,
        prompt_class: promptClass || undefined,
        session_id: sessionId,
      };

      submitFeedbackApi(request).catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to submit feedback");
        // 401/403 will never succeed without auth — drop, don't queue.
        if (isAuthFailure(err)) return;
        queueFeedback(request);
      });
    },
    [classroomId, sessionId],
  );

  return { submit, submitted, error };
}

// ---------------------------------------------------------------------------
// localStorage fallback queue
// ---------------------------------------------------------------------------

function queueFeedback(request: SubmitFeedbackRequest): void {
  try {
    const existing = localStorage.getItem(FEEDBACK_QUEUE_KEY);
    const raw: SubmitFeedbackRequest[] = existing ? JSON.parse(existing) : [];
    const queue = Array.isArray(raw) ? raw : [];
    queue.push(request);
    const trimmed = queue.length > FEEDBACK_QUEUE_MAX
      ? queue.slice(queue.length - FEEDBACK_QUEUE_MAX)
      : queue;
    localStorage.setItem(FEEDBACK_QUEUE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage may be unavailable; silently drop
  }
}

/**
 * Flush any queued feedback submissions. Called on app init or network recovery.
 * Returns the number of items successfully flushed.
 *
 * Auth failures (401/403) drop the item — we never retry auth-blocked telemetry.
 */
export async function flushFeedbackQueue(): Promise<number> {
  let queue: SubmitFeedbackRequest[];
  try {
    const raw = localStorage.getItem(FEEDBACK_QUEUE_KEY);
    if (!raw) return 0;
    queue = JSON.parse(raw);
    if (!Array.isArray(queue) || queue.length === 0) return 0;
  } catch {
    return 0;
  }

  const remaining: SubmitFeedbackRequest[] = [];
  let flushed = 0;

  for (const item of queue) {
    try {
      await submitFeedbackApi(item);
      flushed++;
    } catch (err) {
      if (isAuthFailure(err)) continue; // drop — won't retry
      remaining.push(item);
    }
  }

  try {
    if (remaining.length > 0) {
      localStorage.setItem(FEEDBACK_QUEUE_KEY, JSON.stringify(remaining));
    } else {
      localStorage.removeItem(FEEDBACK_QUEUE_KEY);
    }
  } catch {
    // ignore
  }

  return flushed;
}
