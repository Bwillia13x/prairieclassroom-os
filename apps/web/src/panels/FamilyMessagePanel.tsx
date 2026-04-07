import { useEffect, useState } from "react";
import { useApp } from "../AppContext";
import { useAsyncAction } from "../useAsyncAction";
import { draftFamilyMessage, approveFamilyMessage, fetchMessageHistory } from "../api";
import MessageComposer from "../components/MessageComposer";
import MessageDraft from "../components/MessageDraft";
import SkeletonLoader from "../components/SkeletonLoader";
import HistoryDrawer from "../components/HistoryDrawer";
import { useHistory } from "../hooks/useHistory";
import type { FamilyMessageResponse, FamilyMessageDraft, FamilyMessagePrefill } from "../types";

interface Props {
  prefill: FamilyMessagePrefill | null;
}

export default function FamilyMessagePanel({ prefill }: Props) {
  const { classrooms, activeClassroom, setActiveClassroom, students, showSuccess } = useApp();
  const { loading, error, result, execute, reset } = useAsyncAction<FamilyMessageResponse>();
  const history = useHistory(fetchMessageHistory, activeClassroom, 10);
  const [historicalResult, setHistoricalResult] = useState<FamilyMessageResponse | null>(null);

  const displayResult = result ?? historicalResult;

  useEffect(() => {
    if (prefill) {
      reset();
      setHistoricalResult(null);
    }
  }, [prefill, reset]);

  if (classrooms.length === 0) return null;

  async function handleSubmit(
    classroomId: string,
    studentRefs: string[],
    messageType: "routine_update" | "missed_work" | "praise" | "low_stakes_concern",
    targetLanguage: string,
    context?: string,
  ) {
    setHistoricalResult(null);
    const resp = await execute((signal) =>
      draftFamilyMessage({
        classroom_id: classroomId,
        student_refs: studentRefs,
        message_type: messageType,
        target_language: targetLanguage,
        context,
      }, signal)
    );
    if (resp) {
      showSuccess("Message drafted");
      history.refresh();
    }
  }

  function handleHistorySelect(draft: FamilyMessageDraft) {
    setHistoricalResult({ draft, model_id: "", latency_ms: 0 });
  }

  async function handleApprove(draftId: string) {
    if (!displayResult) return;
    try {
      await approveFamilyMessage(displayResult.draft.classroom_id, draftId);
    } catch (err) {
      console.warn("Approval persistence failed:", err);
    }
  }

  return (
    <div className={displayResult ? "split-pane" : ""}>
      <div>
        <HistoryDrawer<FamilyMessageDraft>
          items={history.items}
          loading={history.loading}
          error={history.error}
          renderItem={(msg) => `${msg.student_refs.join(", ")} — ${msg.message_type.replace(/_/g, " ")}`}
          getKey={(msg) => msg.draft_id}
          getTimestamp={(msg) => {
            const ms = msg.draft_id.split("-").pop();
            return ms && /^\d+$/.test(ms) ? new Date(Number(ms)).toISOString() : new Date().toISOString();
          }}
          onSelect={handleHistorySelect}
          label="Message History"
        />
        <MessageComposer
          classrooms={classrooms}
          students={students}
          selectedClassroom={activeClassroom}
          onClassroomChange={setActiveClassroom}
          onSubmit={handleSubmit}
          loading={loading}
          prefill={prefill}
        />
      </div>
      <div aria-live="polite">
        {error && displayResult === null && <div className="error-banner">{error}</div>}
        {loading && displayResult === null && (
          <SkeletonLoader variant="single" message="Drafting family message..." label="Drafting family message" />
        )}
        {!loading && displayResult === null && !error && (
          <div className="empty-state">
            <svg className="empty-state-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect x="6" y="14" width="36" height="22" rx="3" stroke="var(--color-border)" strokeWidth="2"/><path d="M6 17l18 11 18-11" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <div className="empty-state-title">No draft yet</div>
            <p className="empty-state-description">
              Select a student and provide context to draft a plain-language family message. You'll review it before copying.
            </p>
          </div>
        )}
        {displayResult && (
          <MessageDraft
            draft={displayResult.draft}
            onApprove={handleApprove}
          />
        )}
      </div>
    </div>
  );
}
