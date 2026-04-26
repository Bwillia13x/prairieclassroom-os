import { useState, useRef, useEffect, useCallback } from "react";
import { ApiError } from "./api";

export interface AsyncAction<T> {
  loading: boolean;
  error: string | null;
  result: T | null;
  execute: (fn: (signal: AbortSignal) => Promise<T>) => Promise<T | null>;
  reset: () => void;
  cancel: () => void;
}

interface UseAsyncActionOptions {
  /** Number of retry attempts for transient errors (default: 0) */
  maxRetries?: number;
  /** Called once with the friendly message when a request ultimately fails. */
  onError?: (message: string) => void;
}

function isTransientError(err: unknown): boolean {
  if (err instanceof Response) return err.status >= 500 || err.status === 429;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return msg.includes("fetch") || msg.includes("network") || msg.includes("timeout") || msg.includes("503") || msg.includes("429");
  }
  return false;
}

function friendlyErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Access denied — check your classroom code.";
    if (err.status === 429) {
      if (err.detailCode === "daily_budget_exceeded" || err.category === "cost_budget") {
        return "Daily AI spend limit reached. No more hosted Gemma calls until midnight UTC. Switch to mock or Ollama mode to keep working.";
      }
      return "Too many requests — wait a moment and try again.";
    }
    if (err.status === 413) return "The content you submitted is too large. Try a shorter input.";
    if (err.status === 404) return "That resource could not be found. It may have been removed.";
    if (err.status >= 500) return "The server encountered an error. Please try again in a few moments.";
    if (err.status >= 400) return "The request couldn't be processed. Check your input and try again.";
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("fetch") || msg.includes("network") || msg.includes("err_connection"))
      return "Can't reach the server — check your connection and try again.";
    if (msg.includes("timeout") || msg.includes("timed out"))
      return "The request took too long. Try again or simplify your input.";
  }
  return "Something unexpected happened. Please try again.";
}

export function useAsyncAction<T>(opts?: UseAsyncActionOptions): AsyncAction<T> {
  const maxRetries = opts?.maxRetries ?? 0;
  const onErrorRef = useRef<UseAsyncActionOptions["onError"]>(opts?.onError);
  onErrorRef.current = opts?.onError;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<T | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const execute = useCallback(async (fn: (signal: AbortSignal) => Promise<T>) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);
    setResult(null);

    let lastErr: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (controller.signal.aborted) return null;

      // Exponential backoff for retries
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        await new Promise((r) => setTimeout(r, delay));
        if (controller.signal.aborted) return null;
      }

      try {
        const resp = await fn(controller.signal);
        if (mountedRef.current && !controller.signal.aborted) {
          setResult(resp);
          setLoading(false);
          return resp;
        }
        return null;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return null;
        if (err instanceof ApiError && err.handled) {
          if (mountedRef.current && !controller.signal.aborted) {
            setLoading(false);
          }
          return null;
        }
        lastErr = err;
        // Only retry on transient errors
        if (attempt < maxRetries && isTransientError(err)) continue;
        break;
      }
    }

    if (mountedRef.current && !controller.signal.aborted) {
      const friendly = friendlyErrorMessage(lastErr);
      setError(friendly);
      setLoading(false);
      onErrorRef.current?.(friendly);
    }
    return null;
  }, [maxRetries]);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setLoading(false);
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  return { loading, error, result, execute, reset, cancel };
}
