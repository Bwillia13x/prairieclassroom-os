import { useEffect, useRef } from "react";
import { useApp } from "../AppContext";
import "./ToastQueue.css";

/**
 * ToastQueue — renders short-lived system status.
 * Supports: success, info, error, and undo status lines.
 * Auto-dismisses based on toast.duration. Undo items show a countdown bar.
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

  const statusLabel = toast.type === "success" ? "[OK]" :
                      toast.type === "error" ? "[ERR]" :
                      toast.type === "undo" ? "[UNDO]" : "[INFO]";

  return (
    <div
      className={`toast-item toast-item--${toast.type}`}
      role={toast.type === "error" ? "alert" : "status"}
    >
      <span className="toast-icon" aria-hidden="true">{statusLabel}</span>
      <span className="toast-message">{toast.message}</span>
      {toast.type === "undo" && toast.undoAction && (
        <button className="toast-undo-btn" onClick={handleUndo} type="button">
          [UNDO]
        </button>
      )}
      <button
        className="toast-dismiss-btn"
        onClick={() => onDismiss(toast.id)}
        type="button"
        aria-label="Dismiss"
      >
        [X]
      </button>
      {toast.duration > 0 && (
        <div className="toast-countdown-track">
          <div ref={barRef} className="toast-countdown-bar" style={{ width: "100%" }} />
        </div>
      )}
    </div>
  );
}
