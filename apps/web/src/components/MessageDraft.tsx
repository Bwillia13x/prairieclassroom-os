import { useEffect, useState } from "react";
import type { FamilyMessageDraft } from "../types";
import OutputMetaRow from "./OutputMetaRow";
import { buildModelMetaItems, type ModelMetaInput } from "./buildModelMetaItems";
import { formatLanguageLabel } from "./messageLanguage";
import "./MessageDraft.css";

// Languages PrairieClassroom generates family messages in that read
// right-to-left. When the draft is in one of these, annotate the rendered
// paragraph with dir="rtl" so Arabic/Urdu/Hebrew text renders correctly
// instead of as left-to-right chunks. Bilingual eval coverage includes
// Arabic (ar) under `msg-lang-*`.
const RTL_LANGUAGES: ReadonlySet<string> = new Set(["ar", "he", "ur", "fa", "ps"]);
function isRtlLanguage(code: string | undefined): boolean {
  if (!code) return false;
  return RTL_LANGUAGES.has(code.toLowerCase().slice(0, 2));
}

interface Props {
  draft: FamilyMessageDraft;
  meta?: ModelMetaInput;
  // onApprove is kept in Props for backward compatibility; approval is now
  // triggered via MessageApprovalDialog in FamilyMessagePanel. Role gating
  // applies at the panel level via useRole()'s canApproveMessages.
  onApprove: (draftId: string) => void;
}

export default function MessageDraft({ draft, meta }: Props) {
  const [approved, setApproved] = useState(draft.teacher_approved);

  useEffect(() => {
    setApproved(draft.teacher_approved);
  }, [draft.draft_id, draft.teacher_approved]);

  return (
    <div className="message-draft">
      <header className="draft-header">
        <h2>Draft Message</h2>
        <p className="draft-meta">
          {draft.student_refs.join(", ")} · {draft.message_type.replace(/_/g, " ")} · {formatLanguageLabel(draft.target_language)}
        </p>
        <OutputMetaRow
          items={[
            { label: approved ? "Approved" : "Approval required", tone: approved ? "success" : "pending" },
            { label: "Plain-language draft", tone: "analysis" },
            { label: "Manual send only", tone: "provenance" },
            ...buildModelMetaItems(meta ?? {}),
          ]}
          compact
        />
      </header>

      <div className="draft-body">
        {/* F12.5: when the teacher edited the AI draft at approval time,
            the persisted edited_text is the source of truth for what was
            sent to the family. Show that here (with a small "edited" tag),
            falling back to the AI draft when no edits exist. */}
        <p
          className="draft-text editorial"
          dir={isRtlLanguage(draft.target_language) ? "rtl" : undefined}
          lang={draft.target_language || undefined}
        >
          {draft.edited_text ?? draft.plain_language_text}
        </p>
        {draft.edited_text && draft.edited_text !== draft.plain_language_text && (
          <p className="draft-edited-tag" aria-label="This message was edited by the teacher before sending">
            Edited by teacher
          </p>
        )}
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
