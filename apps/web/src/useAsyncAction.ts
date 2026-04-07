import { useState, useRef, useEffect, useCallback } from "react";

export interface AsyncAction<T> {
  loading: boolean;
  error: string | null;
  result: T | null;
  execute: (fn: (signal: AbortSignal) => Promise<T>) => Promise<T | null>;
  reset: () => void;
}

export function useAsyncAction<T>(): AsyncAction<T> {
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
      if (mountedRef.current && !controller.signal.aborted) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      }
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  return { loading, error, result, execute, reset };
}
