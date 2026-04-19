import { useEffect, useState, useCallback } from "react";
import { useApp } from "../AppContext";
import { useSession } from "../SessionContext";
import { useAsyncAction } from "../useAsyncAction";
import { draftFamilyMessage, approveFamilyMessage, fetchMessageHistory, fetchClassroomHealth } from "../api";
import MessageComposer from "../components/MessageComposer";
import MessageDraft from "../components/MessageDraft";
import MessageApprovalDialog from "../components/MessageApprovalDialog";
import MockModeBanner from "../components/MockModeBanner";
import SkeletonLoader from "../components/SkeletonLoader";
import ContextualHint from "../components/ContextualHint";
import HistoryDrawer from "../components/HistoryDrawer";
import PageIntro from "../components/PageIntro";
import WorkspaceLayout from "../components/WorkspaceLayout";
import EmptyStateCard from "../components/EmptyStateCard";
import ErrorBanner from "../components/ErrorBanner";
import ResultBanner from "../components/ResultBanner";
import RoleReadOnlyBanner from "../components/RoleReadOnlyBanner";
import { FeedbackCollector, OutputActionBar } from "../components/shared";
import type { OutputAction } from "../components/shared";
import { MessageApprovalFunnel } from "../components/DataVisualizations";
import { useFeedback } from "../hooks/useFeedback";
import { useHistory } from "../hooks/useHistory";
import { useRole } from "../hooks/useRole";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";
import { parseRecordTimestamp } from "../utils/parseRecordTimestamp";
import type { FamilyMessageResponse, FamilyMessageDraft, FamilyMessagePrefill, ClassroomHealth } from "../types";

interface Props {
  prefill: FamilyMessagePrefill | null;
}

export default function FamilyMessagePanel({ prefill }: Props) {
  const { classrooms, activeClassroom, students, showSuccess, showError } = useApp();
  const role = useRole();
  const { canApproveMessages } = role;
  const session = useSession();
  const { loading, error, result, execute, reset } = useAsyncAction<FamilyMessageResponse>();
  const healthAction = useAsyncAction<ClassroomHealth>();
  const history = useHistory(fetchMessageHistory, activeClassroom, 10);
  const [historicalResult, setHistoricalResult] = useState<FamilyMessageResponse | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [approvalOverrides, setApprovalOverrides] = useState<Record<string, { editedText?: string }>>({});
  const { copy, status: copyStatus } = useCopyToClipboard();
  const feedback = useFeedback(activeClassroom, session.sessionId);

  useEffect(() => {
    session.recordPanelVisit("family-message");
  }, [session]);

  useEffect(() => {
    if (!activeClassroom || !canApproveMessages) return;
    healthAction.execute((signal) => fetchClassroomHealth(activeClassroom, signal));
  }, [activeClassroom, canApproveMessages, healthAction.execute]);

  const handleFeedbackSubmit = useCallback(
    (rating: number, comment?: string) => {
      const draftId = (result ?? historicalResult)?.draft.draft_id;
      feedback.submit("family-message", rating, comment, draftId, "draft_family_message");
      session.recordFeedback();
    },
    [feedback.submit, result, historicalResult, session],
  );

  const rawDisplayResult = result ?? historicalResult;
  const approvalOverride = rawDisplayResult ? approvalOverrides[rawDisplayResult.draft.draft_id] : undefined;
  const displayResult = rawDisplayResult
    ? {
        ...rawDisplayResult,
        draft: {
          ...rawDisplayResult.draft,
          teacher_approved: rawDisplayResult.draft.teacher_approved || approvalOverride !== undefined,
          ...(approvalOverride?.editedText !== undefined ? { edited_text: approvalOverride.editedText } : {}),
        },
      }
    : null;

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

  async function persistApproval(draftId: string, editedText?: string) {
    if (!displayResult) return;
    await approveFamilyMessage(displayResult.draft.classroom_id, draftId, editedText);
    setApprovalOverrides((prev) => ({
      ...prev,
      [draftId]: editedText !== undefined ? { editedText } : {},
    }));
  }

  async function handleApprove(draftId: string, editedText?: string) {
    try {
      await persistApproval(draftId, editedText);
      showSuccess("Message approved");
    } catch (err) {
      console.warn("Approval persistence failed:", err);
      showError("Could not save approval. The audit trail was not updated — try again.");
    }
  }

  async function handleDialogConfirm(editedText: string) {
    if (!displayResult) return;
    // F12.5: when the teacher's edit diverges from the AI draft, persist the
    // edited text alongside the original on the server so the audit trail
    // matches the clipboard. When the teacher approved verbatim, omit
    // edited_text — that keeps "approved as drafted" rows clean of noise.
    const editedDiffersFromDraft = editedText !== displayResult.draft.plain_language_text;
    try {
      await persistApproval(
        displayResult.draft.draft_id,
        editedDiffersFromDraft ? editedText : undefined,
      );
    } catch (err) {
      console.warn("Approval persistence failed:", err);
      showError("Could not save approval. The audit trail was not updated — try again.");
      return;
    }
    await copy(editedText);
    showSuccess("Message approved and copied");
    setDialogOpen(false);
  }

  const actions: OutputAction[] = displayResult ? [
    {
      key: "review-approval",
      label: displayResult.draft.teacher_approved
        ? "Approved"
        : canApproveMessages
          ? "Review approval"
          : "Approval restricted",
      icon: "check",
      variant: "approve",
      disabled: !canApproveMessages || displayResult.draft.teacher_approved,
      disabledReason: !canApproveMessages
        ? "Only teachers may approve family messages"
        : undefined,
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
      label: displayResult.draft.teacher_approved ? "Copy" : "Approve to copy",
      icon: "pencil",
      variant: "ghost",
      disabled: !displayResult.draft.teacher_approved,
      disabledReason: "Approve the message before copying it into a family communication channel.",
      onClick: () => void copy(displayResult.draft.plain_language_text),
    },
  ] : [];

  return (
    <section className="workspace-page">
      <PageIntro
        eyebrow="Review Workspace"
        title="Draft Family Messages"
        sectionTone="forest"
        description="Build a plain-language family update, inspect the draft in the result canvas, and explicitly approve before copying it into your communication channel."
      />

      <RoleReadOnlyBanner
        role={role}
        required="canGenerate"
        whatIsBlocked="Drafting and approving family messages is reserved for the classroom's permanent teacher."
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
            {role.canGenerate ? (
              <MessageComposer
                students={students}
                selectedClassroom={activeClassroom}
                onSubmit={handleSubmit}
                loading={loading}
                prefill={prefill}
              />
            ) : null}
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
                variant="minimal"
                cue="Pick students to draft a message."
              />
            ) : null}
            {displayResult ? (
              <>
                <ResultBanner
                  label="Message drafted"
                  generatedAt={parseRecordTimestamp(displayResult.draft.draft_id)}
                  latencyMs={displayResult.latency_ms || undefined}
                />
                <MockModeBanner
                  modelId={displayResult.model_id}
                  panelHint="Translation does not vary by target language in mock mode — every language returns the same fixture text. Run with Ollama or hosted Gemini to see real translation."
                />
                <MessageDraft draft={displayResult.draft} meta={displayResult} onApprove={handleApprove} />
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
