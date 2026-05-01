import { useEffect, useRef, useState } from "react";
import type { FamilyMessageDraft } from "../types";
import type { CopyStatus } from "../hooks/useCopyToClipboard";
import { formatLanguageLabel } from "./messageLanguage";
import "./MessageApprovalDialog.css";

interface Props {
  open: boolean;
  draft: FamilyMessageDraft;
  // onConfirm receives the *teacher-reviewed* text — the AI draft as edited
  // by the teacher in the textarea. The teacher's edits are what gets copied
  // to the clipboard for sending. CLAUDE.md is explicit: family messaging
  // is human-in-the-loop, which means the human gets the last word on text.
  onConfirm: (editedText: string) => Promise<void>;
  onCancel: () => void;
  copyStatus: CopyStatus;
}

export default function MessageApprovalDialog({ open, draft, onConfirm, onCancel, copyStatus }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  // Edits live in dialog-local state. Reset only when the underlying draft
  // identity or text changes — closing/reopening the same draft preserves
  // the teacher's in-progress edits, which is what they expect.
  const [editedText, setEditedText] = useState(draft.plain_language_text);

  useEffect(() => {
    setEditedText(draft.plain_language_text);
  }, [draft.draft_id, draft.plain_language_text]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) {
      try { d.showModal(); } catch { /* jsdom may throw — fall back to open attribute */ d.setAttribute("open", ""); }
      // Focus Cancel after open
      setTimeout(() => cancelBtnRef.current?.focus(), 0);
    } else if (!open && d.open) {
      if (typeof d.close === "function") {
        d.close();
      } else {
        d.removeAttribute("open");
      }
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
      await onConfirm(editedText);
    } catch (err) {
      console.warn("Approval failed:", err);
    }
  }

  const liveMessage =
    copyStatus === "copied" ? "Copied to clipboard" :
    copyStatus === "copying" ? "Copying..." :
    copyStatus === "error" ? "Copy failed" :
    "";

  const editedDiffersFromDraft = editedText !== draft.plain_language_text;

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
        <span>{formatLanguageLabel(draft.target_language)}</span>
        <span>·</span>
        <span>{draft.message_type}</span>
        {editedDiffersFromDraft && (
          <>
            <span>·</span>
            <span className="message-approval-dialog__edited-tag">Edited</span>
          </>
        )}
      </div>

      <div className="message-approval-dialog__preview">
        <label className="message-approval-dialog__edit-label" htmlFor="dialog-edit">
          Family message (editable)
        </label>
        <textarea
          id="dialog-edit"
          className="message-approval-dialog__edit"
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          rows={Math.max(4, Math.min(12, editedText.split("\n").length + 1))}
          aria-label="Family message text — edit before approving and copying"
        />
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
          disabled={copyStatus === "copying" || editedText.trim().length === 0}
        >
          {copyStatus === "copying" ? "Approving..." : "Approve & Copy"}
        </button>
      </footer>
    </dialog>
  );
}
