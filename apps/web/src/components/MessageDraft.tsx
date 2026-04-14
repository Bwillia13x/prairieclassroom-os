import { useEffect, useState } from "react";
import type { FamilyMessageDraft } from "../types";
import OutputMetaRow from "./OutputMetaRow";
import "./MessageDraft.css";

interface Props {
  draft: FamilyMessageDraft;
  onApprove: (draftId: string) => void;
}

// onApprove is kept in Props for backward compatibility; approval is now triggered via MessageApprovalDialog
export default function MessageDraft({ draft }: Props) {
  const [approved, setApproved] = useState(draft.teacher_approved);

  useEffect(() => {
    setApproved(draft.teacher_approved);
  }, [draft.draft_id, draft.teacher_approved]);

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
        {approved && (
          <div className="draft-approved-badge">
            Approved
          </div>
        )}
        <p className="draft-approval-note">
          This message will not be sent automatically. Copy and paste it into your
          preferred communication channel.
        </p>
      </div>
    </div>
  );
}
