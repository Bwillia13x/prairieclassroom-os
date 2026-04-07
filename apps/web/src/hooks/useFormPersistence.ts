import { useEffect, useRef, useCallback } from "react";

const DEBOUNCE_MS = 500;

export function useFormPersistence<T extends Record<string, unknown>>(
  key: string,
  values: T,
  setValues: (saved: Partial<T>) => void,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  // Restore on mount (once)
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    try {
      const saved = sessionStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<T>;
        setValues(parsed);
      }
    } catch {
      // Ignore parse errors
    }
  }, [key, setValues]);

  // Debounce-save on value change
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        sessionStorage.setItem(key, JSON.stringify(values));
      } catch {
        // Storage full — ignore
      }
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [key, values]);

  const clear = useCallback(() => {
    sessionStorage.removeItem(key);
  }, [key]);

  return { clear };
}
