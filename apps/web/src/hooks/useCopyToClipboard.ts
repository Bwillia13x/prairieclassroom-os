import { useCallback, useEffect, useRef, useState } from "react";

export type CopyStatus = "idle" | "copying" | "copied" | "error";

export interface UseCopyToClipboardResult {
  copy: (text: string) => Promise<boolean>;
  status: CopyStatus;
  error: string | null;
  reset: () => void;
}

export interface UseCopyToClipboardOptions {
  resetMs?: number;
}

export function useCopyToClipboard(options?: UseCopyToClipboardOptions): UseCopyToClipboardResult {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const resetMs = options?.resetMs ?? 2000;

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const copy = useCallback(async (text: string): Promise<boolean> => {
    setStatus("copying");
    setError(null);

    let clipboardError: string | null = null;

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        setStatus("copied");
        resetTimerRef.current = setTimeout(() => {
          setStatus("idle");
          resetTimerRef.current = undefined;
        }, resetMs);
        return true;
      } catch (err) {
        clipboardError = err instanceof Error ? err.message : "Copy failed";
      }
    }

    // Fallback path
    if (typeof document !== "undefined") {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(textarea);

        if (ok) {
          setStatus("copied");
          resetTimerRef.current = setTimeout(() => {
            setStatus("idle");
            resetTimerRef.current = undefined;
          }, resetMs);
          return true;
        }
      } catch (err) {
        clipboardError = err instanceof Error ? err.message : (clipboardError ?? "Copy failed");
      }
    }

    setStatus("error");
    setError(clipboardError ?? "Copy failed");
    return false;
  }, [resetMs]);

  return { copy, status, error, reset };
}
