import { useEffect, useState, useCallback } from "react";
import { useApp } from "../AppContext";
import { useSession } from "../SessionContext";
import { useAsyncAction } from "../useAsyncAction";
import { logIntervention, fetchInterventionHistory } from "../api";
import InterventionLogger from "../components/InterventionLogger";
import InterventionCard from "../components/InterventionCard";
import SkeletonLoader from "../components/SkeletonLoader";
import ContextualHint from "../components/ContextualHint";
import HistoryDrawer from "../components/HistoryDrawer";
import PageIntro from "../components/PageIntro";
import WorkspaceLayout from "../components/WorkspaceLayout";
import EmptyStateCard from "../components/EmptyStateCard";
import EmptyStateIllustration from "../components/EmptyStateIllustration";
import ErrorBanner from "../components/ErrorBanner";
import ResultBanner from "../components/ResultBanner";
import { FeedbackCollector } from "../components/shared";
import { useFeedback } from "../hooks/useFeedback";
import { useHistory } from "../hooks/useHistory";
import type { InterventionResponse, InterventionRecord, InterventionPrefill } from "../types";

interface Props {
  prefill: InterventionPrefill | null;
}

export default function InterventionPanel({ prefill }: Props) {
  const { classrooms, activeClassroom, setActiveClassroom, profile, students, showSuccess, showUndo } = useApp();
  const session = useSession();
  const { loading, error, result, execute, reset } = useAsyncAction<InterventionResponse>();
  const history = useHistory(fetchInterventionHistory, activeClassroom, 20);
  const [historicalResult, setHistoricalResult] = useState<InterventionResponse | null>(null);
  const feedback = useFeedback(activeClassroom, session.sessionId);

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
      showUndo("Intervention logged — undo?", async () => {
        console.log("Undo intervention", resp.record.record_id);
      });
      history.refresh();
    }
  }

  function handleHistorySelect(record: InterventionRecord) {
    setHistoricalResult({ record, model_id: "", latency_ms: 0 });
  }

  return (
    <section className="workspace-page">
      <PageIntro
        eyebrow="Operations Workspace"
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

      <WorkspaceLayout
        rail={(
          <>
            <ContextualHint
              featureKey="log-intervention"
              title="Log Intervention"
              description="Describe what happened and the system structures your note into classroom memory. You can undo within a few seconds if needed."
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
            <InterventionLogger
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
                <InterventionCard record={displayResult.record} />
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
