import { useEffect, useState, useCallback, useRef } from "react";
import "./InterventionPanel.css";
import { useApp } from "../AppContext";
import { useSession } from "../SessionContext";
import { useAsyncAction } from "../useAsyncAction";
import { logIntervention, fetchInterventionHistory } from "../api";
import InterventionLogger from "../components/InterventionLogger";
import InterventionCard from "../components/InterventionCard";
import SkeletonLoader from "../components/SkeletonLoader";
import ContextualHint from "../components/ContextualHint";
import HistoryDrawer from "../components/HistoryDrawer";
import { InterventionTimeline, FollowUpSuccessRate } from "../components/DataVisualizations";
import PageIntro from "../components/PageIntro";
import WorkspaceLayout from "../components/WorkspaceLayout";
import EmptyStateCard from "../components/EmptyStateCard";
import EmptyStateIllustration from "../components/EmptyStateIllustration";
import ErrorBanner from "../components/ErrorBanner";
import ResultBanner from "../components/ResultBanner";
import MockModeBanner from "../components/MockModeBanner";
import RoleReadOnlyBanner from "../components/RoleReadOnlyBanner";
import { FeedbackCollector } from "../components/shared";
import { useFeedback } from "../hooks/useFeedback";
import { useHistory } from "../hooks/useHistory";
import { useRole } from "../hooks/useRole";
import QuickCaptureTray from "../components/quickCapture/QuickCaptureTray";
import type { InterventionResponse, InterventionRecord, InterventionPrefill, InterventionRequest } from "../types";

interface Props {
  prefill: InterventionPrefill | null;
}

/**
 * Intervention capture uses a dual-path design:
 * - `QuickCaptureTray` is the primary, chip-first flow — designed for 5-second hallway capture.
 * - The legacy `InterventionLogger` is preserved inside a `<details>` expansion for structured
 *   contexts (classroom switching, Tomorrow-Plan prefill, full-form logging). The details panel
 *   auto-opens when a prefill arrives so cross-panel navigation still lands on the structured form.
 */
export default function InterventionPanel({ prefill }: Props) {
  const { classrooms, activeClassroom, setActiveClassroom, profile, students, showSuccess } = useApp();
  const session = useSession();
  const { loading, error, result, execute, reset } = useAsyncAction<InterventionResponse>();
  const history = useHistory(fetchInterventionHistory, activeClassroom, 20);
  const [historicalResult, setHistoricalResult] = useState<InterventionResponse | null>(null);
  const feedback = useFeedback(activeClassroom, session.sessionId);
  const role = useRole();

  useEffect(() => {
    session.recordPanelVisit("log-intervention");
  }, [session]);

  const handleFeedbackSubmit = useCallback(
    (rating: number, comment?: string) => {
      const recordId = (result ?? historicalResult)?.record.record_id;
      feedback.submit("log-intervention", rating, comment, recordId, "log_intervention");
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

  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    if (prefill && detailsRef.current) {
      detailsRef.current.open = true;
    }
  }, [prefill]);

  if (classrooms.length === 0) return null;

  async function handleSubmit(
    classroomId: string,
    studentRefs: string[],
    teacherNote: string,
    context?: string,
  ) {
    setHistoricalResult(null);
    const resp = await execute((signal) =>
      logIntervention({
        classroom_id: classroomId,
        student_refs: studentRefs,
        teacher_note: teacherNote,
        context,
      }, signal)
    );
    if (resp) {
      showSuccess("Intervention logged");
      session.recordGeneration("log-intervention", "log_intervention");
      history.refresh();
      return true;
    }
    return false;
  }

  function handleQuickSubmit(request: InterventionRequest) {
    return handleSubmit(
      request.classroom_id,
      request.student_refs,
      request.teacher_note,
      request.context,
    );
  }

  function handleHistorySelect(record: InterventionRecord) {
    setHistoricalResult({ record, model_id: "", latency_ms: 0 });
  }

  return (
    <section className="workspace-page">
      <PageIntro
        title="Log Intervention Notes"
        sectionTone="slate"
        sectionIcon="grid"
        breadcrumb={{ group: "Ops", tab: "Log Intervention" }}
        description="Log what happened while the moment is still fresh. The result canvas formats the note for classroom memory, follow-up review, and later pattern analysis."
        badges={[
          { label: profile ? `Grade ${profile.grade_band}` : "Intervention log", tone: "sun" },
          { label: "Saved to memory", tone: "provenance" },
          { label: "Follow-up status", tone: "slate" },
        ]}
      />

      <RoleReadOnlyBanner
        role={role}
        required="canLogInterventions"
        whatIsBlocked="Logging interventions is reserved for adults actively working with this classroom."
      />

      <WorkspaceLayout
        rail={(
          <>
            {role.canLogInterventions ? (
              <QuickCaptureTray
                classroomId={activeClassroom}
                students={students}
                loading={loading}
                onSubmit={handleQuickSubmit}
              />
            ) : null}
            <ContextualHint
              featureKey="log-intervention"
              title="Log Intervention"
              description="Describe what happened and the system structures your note into classroom memory for follow-up review and later pattern analysis."
              tone="slate"
            />
            <HistoryDrawer<InterventionRecord>
              items={history.items}
              loading={history.loading}
              error={history.error}
              renderItem={(rec) => `${rec.student_refs.join(", ")} — ${rec.observation.slice(0, 60)}`}
              getKey={(rec) => rec.record_id}
              getTimestamp={(rec) => rec.created_at}
              onSelect={handleHistorySelect}
              label="Intervention History"
            />
            {history.items.length > 0 && (
              <>
                <InterventionTimeline records={history.items} />
                <FollowUpSuccessRate records={history.items} />
              </>
            )}
            {role.canLogInterventions ? (
              <details ref={detailsRef} className="intervention-structured-details">
                <summary>Structured details (optional)</summary>
                <InterventionLogger
                  classrooms={classrooms}
                  students={students}
                  selectedClassroom={activeClassroom}
                  onClassroomChange={setActiveClassroom}
                  onSubmit={handleSubmit}
                  loading={loading}
                  prefill={prefill}
                />
              </details>
            ) : null}
          </>
        )}
        canvas={(
          <div className="workspace-result" aria-live="polite" aria-busy={loading && displayResult === null}>
            {error && displayResult === null ? <ErrorBanner message={error} onDismiss={reset} /> : null}
            {loading && displayResult === null ? (
              <SkeletonLoader variant="single" message="Structuring your intervention note..." label="Structuring intervention note" />
            ) : null}
            {!loading && displayResult === null && !error ? (
              <EmptyStateCard
                icon={<EmptyStateIllustration name="intervention" />}
                title="No intervention logged"
                description="Select students, capture the observation, and the note will land in a structured record you can revisit later."
              />
            ) : null}
            {displayResult ? (
              <>
                <ResultBanner
                  label="Intervention logged"
                  generatedAt={displayResult.record.created_at}
                  latencyMs={displayResult.latency_ms || undefined}
                />
                <MockModeBanner
                  modelId={displayResult.model_id}
                  panelHint="The structured record is real and persisted to memory, but tag and follow-up suggestions come from a static fixture in mock mode. Run with Ollama or hosted Gemini to see real classification."
                />
                <InterventionCard record={displayResult.record} meta={displayResult} />
                <FeedbackCollector
                  onSubmit={handleFeedbackSubmit}
                  submitted={feedback.submitted}
                  panelLabel="intervention log"
                />
              </>
            ) : null}
          </div>
        )}
      />
    </section>
  );
}
