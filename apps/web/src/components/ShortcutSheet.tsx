import { useEffect, useRef } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import "./ShortcutSheet.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ShortcutRow {
  keys: string[];
  label: string;
}

const ROWS: ShortcutRow[] = [
  { keys: ["1", "–", "9", ",", "0"], label: "Jump to panel (1–9 primary, 0 for tenth)" },
  { keys: ["⌘", "K"], label: "Command palette" },
  { keys: ["?"], label: "Show this keyboard shortcut sheet" },
  { keys: ["Esc"], label: "Close any open dialog or overlay" },
];

export default function ShortcutSheet({ open, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  useFocusTrap(cardRef, open);

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

  return (
    <div
      className="shortcut-sheet__backdrop"
      data-testid="shortcut-sheet-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={cardRef}
        className="shortcut-sheet__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="shortcut-sheet-title" className="shortcut-sheet__title">Keyboard shortcuts</h2>
        <p className="shortcut-sheet__subtitle">Press <kbd>Esc</kbd> to close.</p>
        <dl className="shortcut-sheet__list">
          {ROWS.map((row, i) => (
            <div key={i} className="shortcut-sheet__row">
              <dt className="shortcut-sheet__keys">
                {row.keys.map((k, j) => (
                  k === "–" || k === "," ? (
                    <span key={j} className="shortcut-sheet__sep">{k === "–" ? "–" : ", "}</span>
                  ) : (
                    <kbd key={j}>{k}</kbd>
                  )
                ))}
              </dt>
              <dd className="shortcut-sheet__label">{row.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
