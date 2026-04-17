import { useEffect, useRef, useState } from "react";
import type { TomorrowNote } from "../types";
import "./TomorrowChip.css";

interface Props {
  notes: TomorrowNote[];
  onRemove: (id: string) => void;
  onReviewAll: () => void;
}

export default function TomorrowChip({ notes, onRemove, onReviewAll }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  if (notes.length === 0) return null;

  function handleReviewAll() {
    setOpen(false);
    onReviewAll();
  }

  return (
    <div className="tomorrow-chip" ref={rootRef}>
      <button
        type="button"
        className="tomorrow-chip__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Tomorrow Plan has ${notes.length} queued ${notes.length === 1 ? "item" : "items"}`}
      >
        <span className="tomorrow-chip__label">Tomorrow</span>
        <span className="tomorrow-chip__count">{notes.length}</span>
      </button>
      {open && (
        <div className="tomorrow-chip__popover" role="dialog" aria-label="Queued for Tomorrow Plan">
          <h3 className="tomorrow-chip__title">Queued for Tomorrow</h3>
          <ul className="tomorrow-chip__list">
            {notes.map((n) => (
              <li key={n.id} className="tomorrow-chip__item">
                <div className="tomorrow-chip__item-body">
                  <span className="tomorrow-chip__item-source">{n.sourcePanel.replace(/-/g, " ")}</span>
                  <span className="tomorrow-chip__item-summary">{n.summary}</span>
                </div>
                <button
                  type="button"
                  className="tomorrow-chip__remove"
                  onClick={() => onRemove(n.id)}
                  aria-label={`Remove ${n.summary} from Tomorrow Plan`}
                  title="Remove"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="tomorrow-chip__review" onClick={handleReviewAll}>
            Review all →
          </button>
        </div>
      )}
    </div>
  );
}
