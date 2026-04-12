import { useState, useCallback } from "react";
import { submitFeedbackApi, type SubmitFeedbackRequest } from "../api";

const FEEDBACK_QUEUE_KEY = "prairie:feedback-queue";

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
        // Network failure: queue to localStorage for later retry
        setError(err instanceof Error ? err.message : "Failed to submit feedback");
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
    const queue: SubmitFeedbackRequest[] = existing ? JSON.parse(existing) : [];
    queue.push(request);
    localStorage.setItem(FEEDBACK_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // localStorage may be unavailable; silently drop
  }
}

/**
 * Flush any queued feedback submissions. Called on app init or network recovery.
 * Returns the number of items successfully flushed.
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
    } catch {
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
