import { useEffect, useState } from "react";
import type { FamilyMessageDraft } from "../types";
import { useRole } from "../hooks/useRole";
import PrintButton from "./PrintButton";
import OutputMetaRow from "./OutputMetaRow";
import "./MessageDraft.css";

interface Props {
  draft: FamilyMessageDraft;
  onApprove: (draftId: string) => void;
}

export default function MessageDraft({ draft, onApprove }: Props) {
  const { canApproveMessages } = useRole();
  const [copied, setCopied] = useState(false);
  const [approved, setApproved] = useState(draft.teacher_approved);

  useEffect(() => {
    setCopied(false);
    setApproved(draft.teacher_approved);
  }, [draft.draft_id, draft.teacher_approved]);

  async function handleApproveAndCopy() {
    try {
      await navigator.clipboard.writeText(draft.plain_language_text);
      setCopied(true);
      setApproved(true);
      onApprove(draft.draft_id);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setApproved(true);
      onApprove(draft.draft_id);
    }
  }

  return (
    <div className="message-draft">
      <header className="draft-header">
        <h2>Draft Message</h2>
        <p className="draft-meta">
          {draft.student_refs.join(", ")} · {draft.message_type.replace(/_/g, " ")} · {draft.target_language}
        </p>
        <OutputMetaRow
          items={[
            { label: approved ? "Approved" : "Approval required", tone: approved ? "success" : "pending" },
            { label: "Plain-language draft", tone: "analysis" },
            { label: "Manual send only", tone: "provenance" },
          ]}
          compact
        />
      </header>

      <div className="draft-body">
        <p className="draft-text">{draft.plain_language_text}</p>
      </div>

      {draft.simplified_student_text && (
        <div className="draft-student-version">
          <h3>Student-Friendly Version</h3>
          <p>{draft.simplified_student_text}</p>
        </div>
      )}

      <div className="draft-approval">
        {approved ? (
          <div className="draft-approved-badge">
            Approved {copied ? "& Copied" : ""}
          </div>
        ) : (
          <button
            className="btn btn--approve"
            type="button"
            onClick={handleApproveAndCopy}
            disabled={!canApproveMessages}
            title={canApproveMessages ? undefined : "Only teachers may approve messages"}
          >
            {canApproveMessages ? "Approve & Copy to Clipboard" : "Approval restricted"}
          </button>
        )}
        <p className="draft-approval-note">
          This message will not be sent automatically. Copy and paste it into your
          preferred communication channel.
        </p>
      </div>

      <PrintButton label="Print Message" />
    </div>
  );
}
