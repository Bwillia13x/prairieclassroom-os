import { useEffect, useRef } from "react";
import type { FamilyMessageDraft } from "../types";
import type { CopyStatus } from "../hooks/useCopyToClipboard";
import "./MessageApprovalDialog.css";

interface Props {
  open: boolean;
  draft: FamilyMessageDraft;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  copyStatus: CopyStatus;
}

export default function MessageApprovalDialog({ open, draft, onConfirm, onCancel, copyStatus }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) {
      try { d.showModal(); } catch { /* jsdom may throw — fall back to open attribute */ d.setAttribute("open", ""); }
      // Focus Cancel after open
      setTimeout(() => cancelBtnRef.current?.focus(), 0);
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    function handleClose() {
      if (open) onCancel();
    }
    d.addEventListener("close", handleClose);
    return () => d.removeEventListener("close", handleClose);
  }, [open, onCancel]);

  async function handleApproveClick() {
    try {
      await onConfirm();
    } catch (err) {
      console.warn("Approval failed:", err);
    }
  }

  const liveMessage =
    copyStatus === "copied" ? "Copied to clipboard" :
    copyStatus === "copying" ? "Copying..." :
    copyStatus === "error" ? "Copy failed" :
    "";

  return (
    <dialog
      ref={dialogRef}
      className="message-approval-dialog"
      aria-labelledby="dialog-title"
    >
      <h2 id="dialog-title" className="message-approval-dialog__title">Review approval</h2>

      <div className="message-approval-dialog__meta">
        <span>{draft.student_refs.length} {draft.student_refs.length === 1 ? "recipient" : "recipients"}</span>
        <span>·</span>
        <span>{draft.target_language}</span>
        <span>·</span>
        <span>{draft.message_type}</span>
      </div>

      <div className="message-approval-dialog__preview">
        <p>{draft.plain_language_text}</p>
        {draft.simplified_student_text && (
          <>
            <h3>Student version</h3>
            <p>{draft.simplified_student_text}</p>
          </>
        )}
      </div>

      <div className="message-approval-dialog__live" role="status" aria-live="polite">
        {liveMessage}
      </div>

      <footer className="message-approval-dialog__footer">
        <button
          ref={cancelBtnRef}
          type="button"
          className="btn btn--ghost"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleApproveClick}
          disabled={copyStatus === "copying"}
        >
          {copyStatus === "copying" ? "Approving..." : "Approve & Copy"}
        </button>
      </footer>
    </dialog>
  );
}
