import { useState, useRef, useEffect, useCallback } from "react";

export interface AsyncAction<T> {
  loading: boolean;
  error: string | null;
  result: T | null;
  execute: (fn: (signal: AbortSignal) => Promise<T>) => Promise<T | null>;
  reset: () => void;
}

interface UseAsyncActionOptions {
  /** Number of retry attempts for transient errors (default: 0) */
  maxRetries?: number;
}

function isTransientError(err: unknown): boolean {
  if (err instanceof Response) return err.status >= 500 || err.status === 429;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return msg.includes("fetch") || msg.includes("network") || msg.includes("timeout") || msg.includes("503") || msg.includes("429");
  }
  return false;
}

export function useAsyncAction<T>(opts?: UseAsyncActionOptions): AsyncAction<T> {
  const maxRetries = opts?.maxRetries ?? 0;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<T | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
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
        lastErr = err;
        // Only retry on transient errors
        if (attempt < maxRetries && isTransientError(err)) continue;
        break;
      }
    }

    if (mountedRef.current && !controller.signal.aborted) {
      setError(lastErr instanceof Error ? lastErr.message : "Unknown error");
      setLoading(false);
    }
    return null;
  }, [maxRetries]);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  return { loading, error, result, execute, reset };
}
