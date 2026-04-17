import { useEffect, useRef, useCallback, useState } from "react";

const DEBOUNCE_MS = 500;

export interface FormPersistenceOptions {
  /** If false, do not auto-apply the stored draft on mount. Default: true (backward compat). */
  autoRestore?: boolean;
  /** Minimum total character count across stored string fields to surface hasPendingDraft. Default: 0. */
  minChars?: number;
  /** Maximum age in ms of a stored draft before it's considered expired. Default: Infinity. */
  maxAgeMs?: number;
}

interface StoredShape {
  [key: string]: unknown;
  __ts?: number;
}

export function useFormPersistence<T extends Record<string, unknown>>(
  key: string,
  values: T,
  setValues: (saved: Partial<T>) => void,
  options: FormPersistenceOptions = {},
) {
  const { autoRestore = true, minChars = 0, maxAgeMs = Infinity } = options;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);
  const setValuesRef = useRef(setValues);
  const [hasPendingDraft, setHasPendingDraft] = useState(false);
  const savedRef = useRef<Partial<T> | null>(null);

  useEffect(() => { setValuesRef.current = setValues; }, [setValues]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredShape;
      const ts = typeof parsed.__ts === "number" ? parsed.__ts : 0;
      if (maxAgeMs !== Infinity && Date.now() - ts > maxAgeMs) {
        sessionStorage.removeItem(key);
        return;
      }
      const { __ts: _ts, ...rest } = parsed;
      void _ts;
      const restored = rest as Partial<T>;
      const totalChars = Object.values(restored).reduce<number>(
        (acc, v) => acc + (typeof v === "string" ? v.length : 0),
        0,
      );
      if (autoRestore) {
        setValuesRef.current(restored);
      } else if (totalChars >= minChars) {
        savedRef.current = restored;
        setHasPendingDraft(true);
      }
    } catch {
      // Ignore parse errors
    }
  }, [key, autoRestore, minChars, maxAgeMs]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        const totalChars = Object.values(values).reduce<number>(
          (acc, v) => acc + (typeof v === "string" ? v.length : 0),
          0,
        );
        if (totalChars === 0) {
          sessionStorage.removeItem(key);
          return;
        }
        const toStore: StoredShape = { ...values, __ts: Date.now() };
        sessionStorage.setItem(key, JSON.stringify(toStore));
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
    setHasPendingDraft(false);
    savedRef.current = null;
  }, [key]);

  const restore = useCallback(() => {
    if (!savedRef.current) return;
    setValuesRef.current(savedRef.current);
    setHasPendingDraft(false);
  }, []);

  const dismiss = useCallback(() => {
    sessionStorage.removeItem(key);
    setHasPendingDraft(false);
    savedRef.current = null;
  }, [key]);

  return { clear, restore, dismiss, hasPendingDraft };
}
