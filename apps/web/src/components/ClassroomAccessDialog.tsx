import { useEffect, useRef, useState } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import "./ClassroomAccessDialog.css";

interface Props {
  open: boolean;
  classroomId: string;
  message: string;
  initialValue?: string;
  onClose: () => void;
  onSubmit: (code: string) => void;
  /**
   * Optional "escape hatch" shown when a teacher first lands on a protected
   * classroom they don't have a code for — lets them explore the seeded
   * demo classroom instead of bouncing.
   */
  onUseDemo?: () => void;
}

export default function ClassroomAccessDialog({
  open,
  classroomId,
  message,
  initialValue,
  onClose,
  onSubmit,
  onUseDemo,
}: Props) {
  const [value, setValue] = useState(initialValue ?? "");
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (open) {
      setValue(initialValue ?? "");
    }
  }, [open, initialValue]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(value.trim());
  }

  return (
    <div className="access-dialog__backdrop" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="access-dialog__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="classroom-access-title"
        aria-describedby="classroom-access-description"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="access-dialog__eyebrow">Protected Classroom</span>
        <h2 id="classroom-access-title" className="access-dialog__title">
          Unlock {classroomId}
        </h2>
        <p
          id="classroom-access-description"
          className="access-dialog__description"
          aria-live="polite"
        >
          {message}
        </p>

        <form className="access-dialog__form" onSubmit={handleSubmit}>
          <div className="field access-dialog__field">
            <label htmlFor="classroom-access-code">Classroom Access Code</label>
            <input
              id="classroom-access-code"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter the classroom code…"
              autoFocus
            />
          </div>

          <div className="access-dialog__actions">
            <button className="btn btn--tertiary" onClick={onClose} type="button">
              Not Now
            </button>
            <button
              className="btn btn--primary"
              type="submit"
              data-testid="classroom-access-save"
            >
              Save & Continue
            </button>
          </div>
        </form>

        {onUseDemo ? (
          <button
            type="button"
            className="access-dialog__demo-link"
            onClick={onUseDemo}
            data-testid="classroom-access-use-demo"
          >
            Don't have a code? Explore the demo classroom instead.
          </button>
        ) : null}
      </div>
    </div>
  );
}
