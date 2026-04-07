import { useEffect } from "react";
import { useApp } from "../AppContext";
import { useAsyncAction } from "../useAsyncAction";
import { draftFamilyMessage, approveFamilyMessage } from "../api";
import MessageComposer from "../components/MessageComposer";
import MessageDraft from "../components/MessageDraft";
import SkeletonLoader from "../components/SkeletonLoader";
import type { FamilyMessageResponse, FamilyMessagePrefill } from "../types";

interface Props {
  prefill: FamilyMessagePrefill | null;
}

export default function FamilyMessagePanel({ prefill }: Props) {
  const { classrooms, activeClassroom, setActiveClassroom, students, showSuccess } = useApp();
  const { loading, error, result, execute, reset } = useAsyncAction<FamilyMessageResponse>();

  useEffect(() => {
    if (prefill) reset();
  }, [prefill, reset]);

  if (classrooms.length === 0) return null;

  async function handleSubmit(
    classroomId: string,
    studentRefs: string[],
    messageType: "routine_update" | "missed_work" | "praise" | "low_stakes_concern",
    targetLanguage: string,
    context?: string,
  ) {
    const resp = await execute((signal) =>
      draftFamilyMessage({
        classroom_id: classroomId,
        student_refs: studentRefs,
        message_type: messageType,
        target_language: targetLanguage,
        context,
      }, signal)
    );
    if (resp) showSuccess("Message drafted");
  }

  async function handleApprove(draftId: string) {
    if (!result) return;
    try {
      await approveFamilyMessage(result.draft.classroom_id, draftId);
    } catch (err) {
      console.warn("Approval persistence failed:", err);
    }
  }

  return (
    <div className={result ? "split-pane" : ""}>
      <MessageComposer
        classrooms={classrooms}
        students={students}
        selectedClassroom={activeClassroom}
        onClassroomChange={setActiveClassroom}
        onSubmit={handleSubmit}
        loading={loading}
        prefill={prefill}
      />
      <div aria-live="polite">
        {error && result === null && <div className="error-banner">{error}</div>}
        {loading && result === null && (
          <SkeletonLoader variant="single" message="Drafting family message..." label="Drafting family message" />
        )}
        {!loading && result === null && !error && (
          <div className="empty-state">
            <svg className="empty-state-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect x="6" y="14" width="36" height="22" rx="3" stroke="var(--color-border)" strokeWidth="2"/><path d="M6 17l18 11 18-11" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <div className="empty-state-title">No draft yet</div>
            <p className="empty-state-description">
              Select a student and provide context to draft a plain-language family message. You'll review it before copying.
            </p>
          </div>
        )}
        {result && (
          <MessageDraft
            draft={result.draft}
            onApprove={handleApprove}
          />
        )}
      </div>
    </div>
  );
}
