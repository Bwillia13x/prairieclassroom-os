import { useEffect, useState, useCallback } from "react";
import { useApp } from "../AppContext";
import { useSession } from "../SessionContext";
import { useAsyncAction } from "../useAsyncAction";
import { draftFamilyMessage, approveFamilyMessage, fetchMessageHistory, fetchClassroomHealth } from "../api";
import MessageComposer from "../components/MessageComposer";
import MessageDraft from "../components/MessageDraft";
import MessageApprovalDialog from "../components/MessageApprovalDialog";
import SkeletonLoader from "../components/SkeletonLoader";
import ContextualHint from "../components/ContextualHint";
import OutputFeedback from "../components/OutputFeedback";
import HistoryDrawer from "../components/HistoryDrawer";
import PageIntro from "../components/PageIntro";
import WorkspaceLayout from "../components/WorkspaceLayout";
import EmptyStateCard from "../components/EmptyStateCard";
import EmptyStateIllustration from "../components/EmptyStateIllustration";
import ErrorBanner from "../components/ErrorBanner";
import ResultBanner from "../components/ResultBanner";
import { FeedbackCollector, OutputActionBar } from "../components/shared";
import type { OutputAction } from "../components/shared";
import { MessageApprovalFunnel } from "../components/DataVisualizations";
import { useFeedback } from "../hooks/useFeedback";
import { useHistory } from "../hooks/useHistory";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";
import { parseRecordTimestamp } from "../utils/parseRecordTimestamp";
import type { FamilyMessageResponse, FamilyMessageDraft, FamilyMessagePrefill, ClassroomHealth } from "../types";

interface Props {
  prefill: FamilyMessagePrefill | null;
}

export default function FamilyMessagePanel({ prefill }: Props) {
  const { classrooms, activeClassroom, setActiveClassroom, profile, students, showSuccess, showUndo } = useApp();
  const session = useSession();
  const { loading, error, result, execute, reset } = useAsyncAction<FamilyMessageResponse>();
  const healthAction = useAsyncAction<ClassroomHealth>();
  const history = useHistory(fetchMessageHistory, activeClassroom, 10);
  const [historicalResult, setHistoricalResult] = useState<FamilyMessageResponse | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { copy, status: copyStatus } = useCopyToClipboard();
  const feedback = useFeedback(activeClassroom, session.sessionId);

  useEffect(() => {
    session.recordPanelVisit("family-message");
  }, [session]);

  useEffect(() => {
    if (!activeClassroom) return;
    healthAction.execute((signal) => fetchClassroomHealth(activeClassroom, signal));
  }, [activeClassroom, healthAction.execute]);

  const handleFeedbackSubmit = useCallback(
    (rating: number, comment?: string) => {
      const draftId = (result ?? historicalResult)?.draft.draft_id;
      feedback.submit("family-message", rating, comment, draftId, "draft_family_message");
      session.recordFeedback();
    },
    [feedback.submit, result, historicalResult, session],
  );

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
      session.recordGeneration("family-message", "draft_family_message");
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
      showSuccess("Message approved");
      showUndo("Message approved — undo?", async () => {
        // Undo: re-draft or mark unapproved (best-effort)
        console.log("Undo approve for", draftId);
      });
    } catch (err) {
      console.warn("Approval persistence failed:", err);
    }
  }

  async function handleDialogConfirm() {
    if (!displayResult) return;
    await copy(displayResult.draft.plain_language_text);
    await handleApprove(displayResult.draft.draft_id);
    showSuccess("Message approved and copied");
    setDialogOpen(false);
  }

  const actions: OutputAction[] = displayResult ? [
    {
      key: "review-approval",
      label: displayResult.draft.teacher_approved ? "Approved" : "Review approval",
      icon: "check",
      variant: "approve",
      onClick: () => setDialogOpen(true),
    },
    {
      key: "print",
      label: "Print",
      icon: "grid",
      variant: "ghost",
      onClick: () => window.print(),
    },
    {
      key: "copy",
      label: "Copy",
      icon: "pencil",
      variant: "ghost",
      onClick: () => void copy(displayResult.draft.plain_language_text),
    },
  ] : [];

  return (
    <section className="workspace-page">
      <PageIntro
        eyebrow="Review Workspace"
        title="Draft Family Messages"
        sectionTone="forest"
        sectionIcon="check"
        breadcrumb={{ group: "Review", tab: "Family Message" }}
        description="Build a plain-language family update, inspect the draft in the result canvas, and explicitly approve before copying it into your communication channel."
        badges={[
          { label: profile ? `Grade ${profile.grade_band}` : "Family comms", tone: "sun" },
          { label: "Approval required", tone: "pending" },
          { label: "Plain-language draft", tone: "forest" },
        ]}
      />

      <WorkspaceLayout
        rail={(
          <>
            <ContextualHint
              featureKey="family-message"
              title="Family Messages"
              description="Draft plain-language messages for families. You review every message before it can be shared — nothing sends automatically."
              tone="forest"
            />
            {healthAction.result && healthAction.result.messages_total > 0 && (
              <MessageApprovalFunnel
                messagesTotal={healthAction.result.messages_total}
                messagesApproved={healthAction.result.messages_approved}
              />
            )}
            <HistoryDrawer<FamilyMessageDraft>
              items={history.items}
              loading={history.loading}
              error={history.error}
              renderItem={(msg) => `${msg.student_refs.join(", ")} — ${msg.message_type.replace(/_/g, " ")}`}
              getKey={(msg) => msg.draft_id}
              getTimestamp={(msg) => parseRecordTimestamp(msg.draft_id) ?? new Date().toISOString()}
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
          </>
        )}
        canvas={(
          <div className="workspace-result" aria-live="polite" aria-busy={loading && displayResult === null}>
            {error && displayResult === null ? <ErrorBanner message={error} onDismiss={reset} /> : null}
            {loading && displayResult === null ? (
              <SkeletonLoader variant="single" message="Drafting family message..." label="Drafting family message" />
            ) : null}
            {!loading && displayResult === null && !error ? (
              <EmptyStateCard
                icon={<EmptyStateIllustration name="message" />}
                title="No draft yet"
                description="Select one or more students, choose the message type, and add any important context before drafting."
              />
            ) : null}
            {displayResult ? (
              <>
                <ResultBanner
                  label="Message drafted"
                  generatedAt={parseRecordTimestamp(displayResult.draft.draft_id)}
                  latencyMs={displayResult.latency_ms || undefined}
                />
                <MessageDraft draft={displayResult.draft} onApprove={handleApprove} />
                <OutputFeedback outputId={displayResult.draft.draft_id} outputType="family-message" />
                <FeedbackCollector
                  onSubmit={handleFeedbackSubmit}
                  submitted={feedback.submitted}
                  panelLabel="family message"
                />
                <OutputActionBar actions={actions} contextLabel="Family message output" />
                <MessageApprovalDialog
                  open={dialogOpen}
                  draft={displayResult.draft}
                  onConfirm={handleDialogConfirm}
                  onCancel={() => setDialogOpen(false)}
                  copyStatus={copyStatus}
                />
              </>
            ) : null}
          </div>
        )}
      />
    </section>
  );
}
