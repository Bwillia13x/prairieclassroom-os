/**
 * PageIntroInfoButton — compact ⓘ button in the page header that opens a
 * popover carrying panel-specific how-to copy. Pairs with `OpsSectionHint`
 * for the 2026-04-19 OPS audit GOT-IT consolidation.
 *
 * 2026-04-25 — migrated to the shared Popover primitive. The popover is
 * now portaled into document.body and floats over the page layers
 * regardless of any clipping ancestor in the PageIntro tree.
 */
import { useId, useRef, useState, type ReactNode } from "react";
import { Popover } from "./popover";
import "./PageIntroInfoButton.css";

interface Props {
  title: string;
  body: ReactNode;
}

export default function PageIntroInfoButton({ title, body }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();

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
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        placement="bottom-start"
        role="dialog"
        ariaLabelledBy={headingId}
        surfaceClassName="page-intro-info-popover"
      >
        <h3 id={headingId} className="page-intro-info__title">{title}</h3>
        <div className="page-intro-info__body">{body}</div>
      </Popover>
    </span>
  );
}
