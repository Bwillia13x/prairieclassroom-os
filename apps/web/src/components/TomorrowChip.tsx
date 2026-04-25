/**
 * TomorrowChip — header chip showing how many actions are queued for the
 * Tomorrow Plan, with a popover listing each one.
 *
 * 2026-04-25 — migrated to the shared Popover primitive. The list now
 * portals into document.body and floats over the page layers regardless
 * of header clipping.
 */
import { useRef, useState } from "react";
import type { TomorrowNote } from "../types";
import { Popover } from "./popover";
import "./TomorrowChip.css";

interface Props {
  notes: TomorrowNote[];
  onRemove: (id: string) => void;
  onReviewAll: () => void;
}

export default function TomorrowChip({ notes, onRemove, onReviewAll }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  if (notes.length === 0) return null;

  function close() {
    setOpen(false);
  }

  function handleReviewAll() {
    close();
    onReviewAll();
  }

  return (
    <div className="tomorrow-chip">
      <button
        ref={triggerRef}
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
      <Popover
        open={open}
        onClose={close}
        anchorRef={triggerRef}
        placement="bottom-start"
        role="dialog"
        ariaLabel="Queued for Tomorrow Plan"
        surfaceClassName="tomorrow-chip-popover"
      >
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
      </Popover>
    </div>
  );
}
