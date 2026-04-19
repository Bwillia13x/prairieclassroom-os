/**
 * PageIntroInfoButton — compact ⓘ button in the page header that opens
 * a popover carrying panel-specific how-to copy. Pairs with
 * `OpsSectionHint` for the 2026-04-19 OPS audit GOT-IT consolidation:
 * one section-level hint + per-panel info popover replaces the six
 * per-panel ContextualHint cards.
 *
 * Rendered from `PageIntro` via the `infoContent` prop. Outside-click
 * and Escape close the popover; focus returns to the trigger on close.
 */
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import "./PageIntroInfoButton.css";

interface Props {
  title: string;
  body: ReactNode;
}

export default function PageIntroInfoButton({ title, body }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const headingId = useId();

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (!popRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, close]);

  return (
    <span className="page-intro-info">
      <button
        ref={triggerRef}
        type="button"
        className="page-intro-info__trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`About ${title}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">ⓘ</span>
      </button>
      {open ? (
        <div
          ref={popRef}
          role="dialog"
          aria-labelledby={headingId}
          className="page-intro-info__pop"
        >
          <h3 id={headingId} className="page-intro-info__title">{title}</h3>
          <div className="page-intro-info__body">{body}</div>
        </div>
      ) : null}
    </span>
  );
}
