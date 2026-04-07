import { useEffect, useRef } from "react";
import { useApp } from "../AppContext";
import "./ToastQueue.css";

/**
 * ToastQueue — renders a stacked, animated toast queue.
 * Supports: success, info, error, and undo toasts.
 * Auto-dismisses based on toast.duration. Undo toasts show a countdown bar.
 */
export default function ToastQueue() {
  const { toasts, dismissToast } = useApp();

  return (
    <div className="toast-queue" aria-live="polite" aria-relevant="additions">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: { id: string; type: string; message: string; undoAction?: { rollback: () => Promise<void> }; duration: number };
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (toast.duration > 0) {
      // Start the countdown bar animation
      if (barRef.current) {
        barRef.current.style.transition = `width ${toast.duration}ms linear`;
        requestAnimationFrame(() => {
          if (barRef.current) barRef.current.style.width = "0%";
        });
      }
      timerRef.current = setTimeout(() => onDismiss(toast.id), toast.duration);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, toast.duration, onDismiss]);

  async function handleUndo() {
    if (toast.undoAction) {
      try {
        await toast.undoAction.rollback();
      } catch {
        /* rollback failed — toast still dismisses */
      }
    }
    onDismiss(toast.id);
  }

  const icon = toast.type === "success" ? "✓" :
               toast.type === "error" ? "✗" :
               toast.type === "undo" ? "↩" : "ℹ";

  return (
    <div
      className={`toast-item toast-item--${toast.type}`}
      role={toast.type === "error" ? "alert" : "status"}
    >
      <span className="toast-icon" aria-hidden="true">{icon}</span>
      <span className="toast-message">{toast.message}</span>
      {toast.type === "undo" && toast.undoAction && (
        <button className="toast-undo-btn" onClick={handleUndo} type="button">
          Undo
        </button>
      )}
      <button
        className="toast-dismiss-btn"
        onClick={() => onDismiss(toast.id)}
        type="button"
        aria-label="Dismiss"
      >
        ×
      </button>
      {toast.duration > 0 && (
        <div className="toast-countdown-track">
          <div ref={barRef} className="toast-countdown-bar" style={{ width: "100%" }} />
        </div>
      )}
    </div>
  );
}
