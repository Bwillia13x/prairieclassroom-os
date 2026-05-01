import { useEffect, useState, useCallback, useRef } from "react";
import "./InterventionPanel.css";
import { useApp } from "../AppContext";
import { useSession } from "../SessionContext";
import { useAsyncAction } from "../useAsyncAction";
import { logIntervention, fetchInterventionHistory } from "../api";
import InterventionLogger, { type InterventionLoggerDraft } from "../components/InterventionLogger";
import InterventionCard from "../components/InterventionCard";
import SkeletonLoader from "../components/SkeletonLoader";
import HistoryDrawer from "../components/HistoryDrawer";
import { InterventionTimeline, FollowUpSuccessRate } from "../components/DataVisualizations";
import WorkspaceLayout from "../components/WorkspaceLayout";
import ErrorBanner from "../components/ErrorBanner";
import ResultBanner from "../components/ResultBanner";
import MockModeBanner from "../components/MockModeBanner";
import RoleReadOnlyBanner from "../components/RoleReadOnlyBanner";
import DrillDownDrawer from "../components/DrillDownDrawer";
import { FeedbackCollector } from "../components/shared";
import { useFeedback } from "../hooks/useFeedback";
import { useHistory } from "../hooks/useHistory";
import { useRole } from "../hooks/useRole";
import type { DebtItem, DrillDownContext, InterventionResponse, InterventionRecord, InterventionPrefill, InterventionRequest } from "../types";

interface Props {
  prefill: InterventionPrefill | null;
}

/**
 * Intervention capture now uses one primary path: select the student,
 * type the evidence note, and save it to classroom memory. Fast hallway
 * capture remains available at the API/component layer, but this page no
 * longer presents it as a competing workflow.
 */
export default function InterventionPanel({ prefill }: Props) {
  const { classrooms, activeClassroom, students, showSuccess, showError, setActiveTab } = useApp();
  const session = useSession();
  const { loading, error, result, execute, reset } = useAsyncAction<InterventionResponse>({
    onError: (msg) => showError(`Couldn't save intervention — ${msg}`),
  });
  const history = useHistory(fetchInterventionHistory, activeClassroom, 20);
  const [historicalResult, setHistoricalResult] = useState<InterventionResponse | null>(null);
  const [drawerPrefill, setDrawerPrefill] = useState<InterventionPrefill | null>(null);
  const [selectedAlias, setSelectedAlias] = useState<string | null>(prefill?.student_ref ?? null);
  const [drillDown, setDrillDown] = useState<DrillDownContext | null>(null);
  const [loggerDraft, setLoggerDraft] = useState<InterventionLoggerDraft>({
    selectedStudents: prefill ? [prefill.student_ref] : [],
    teacherNote: "",
    followUpNeeded: true,
    followUpTiming: "Tomorrow morning",
    memoryDestination: "Classroom memory + student thread",
  });
  const feedback = useFeedback(activeClassroom, session.sessionId);
  const role = useRole();
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

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
  const activePrefill = prefill ?? drawerPrefill;

  useEffect(() => {
    if (prefill) {
      reset();
      setHistoricalResult(null);
      setDrawerPrefill(null);
      setSelectedAlias(prefill.student_ref);
    }
  }, [prefill, reset]);

  useEffect(() => {
    if (activePrefill && detailsRef.current) {
      detailsRef.current.open = true;
    }
  }, [activePrefill]);

  if (classrooms.length === 0) return null;

  async function submitIntervention(request: InterventionRequest) {
    setHistoricalResult(null);
    const resp = await execute((signal) => logIntervention(request, signal));
    if (resp) {
      showSuccess("Intervention logged");
      session.recordGeneration("log-intervention", "log_intervention");
      setDrawerPrefill(null);
      history.refresh();
      return true;
    }
    return false;
  }

  async function handleSubmit(
    classroomId: string,
    studentRefs: string[],
    teacherNote: string,
    context?: string,
  ) {
    return submitIntervention(
      {
        classroom_id: classroomId,
        student_refs: studentRefs,
        teacher_note: teacherNote,
        context,
      },
    );
  }

  function handleHistorySelect(record: InterventionRecord) {
    setHistoricalResult({ record, model_id: "", latency_ms: 0 });
  }

  function handleDrawerInterventionPrefill(nextPrefill: InterventionPrefill) {
    setDrawerPrefill(nextPrefill);
    setSelectedAlias(nextPrefill.student_ref);
    if (detailsRef.current) {
      detailsRef.current.open = true;
    }
  }

  function handleTimelineDotClick(record: InterventionRecord) {
    const alias = record.student_refs[0];
    if (alias) {
      setDrillDown({ type: "student", alias });
    }
  }

  return (
    <section className="workspace-page intervention-workflow-page">
      <RoleReadOnlyBanner
        role={role}
        required="canLogInterventions"
        whatIsBlocked="Logging interventions is reserved for adults actively working with this classroom."
      />

      <WorkspaceLayout
        className="workspace-layout--ops-workflow"
        surface="ops-log"
        splitState={displayResult ? "output" : "input"}
        rail={(
          <>
            <div className="intervention-workflow-primary">
              <InterventionLogger
                students={students}
                selectedClassroom={activeClassroom}
                onSubmit={handleSubmit}
                loading={loading}
                prefill={activePrefill}
                canSubmit={role.canLogInterventions}
                variant="ops-workflow"
                focusStudentAlias={selectedAlias}
                onDraftChange={setLoggerDraft}
              />
            </div>

            <div className="intervention-workflow-secondary" aria-label="Supporting capture tools">
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
                  <InterventionTimeline
                    records={history.items}
                    onDotClick={handleTimelineDotClick}
                  />
                  <FollowUpSuccessRate
                    records={history.items}
                    onSegmentClick={({ category, items }) =>
                      setDrillDown({
                        type: "debt-category",
                        category,
                        items: mapInterventionsToDebtItems(items, category),
                      })
                    }
                  />
                </>
              )}
              <details ref={detailsRef} className="intervention-structured-details">
                <summary>Add structured detail (duration · outcome · next step)</summary>
                <p className="intervention-structured-details__note">
                  The required student and evidence fields are in the primary workspace
                  above. Use the optional follow-up controls there when the note needs
                  timing or a memory destination.
                </p>
              </details>
            </div>
          </>
        )}
        canvas={(
          <div className="workspace-result intervention-memory-preview-stack" aria-live="polite" aria-busy={loading && displayResult === null}>
            {error && displayResult === null ? <ErrorBanner message={error} onDismiss={reset} /> : null}
            <InterventionMemoryPreview
              draft={loggerDraft}
              record={displayResult?.record ?? null}
            />
            {loading && displayResult === null ? (
              <SkeletonLoader variant="single" message="Saving your note to the classroom log…" label="Saving intervention note" />
            ) : null}
            {displayResult ? (
              <div className="intervention-output-stack">
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
              </div>
            ) : null}
          </div>
        )}
      />
      <DrillDownDrawer
        context={drillDown}
        onClose={() => setDrillDown(null)}
        onNavigate={(tab) => {
          setDrillDown(null);
          setActiveTab(tab);
        }}
        onContextChange={setDrillDown}
        onInterventionPrefill={handleDrawerInterventionPrefill}
      />
    </section>
  );
}

function InterventionMemoryPreview({
  draft,
  record,
}: {
  draft: InterventionLoggerDraft;
  record: InterventionRecord | null;
}) {
  const selectedStudents = record?.student_refs ?? draft.selectedStudents;
  const observation = record?.observation ?? draft.teacherNote;
  const followUpText = record
    ? record.follow_up_needed
      ? "Follow-up flagged from saved note"
      : "No follow-up flagged from saved note"
    : draft.followUpNeeded
      ? draft.followUpTiming
      : "Record only";
  const destination = record ? "Classroom memory + student thread" : draft.memoryDestination;

  return (
    <article className="intervention-memory-preview" aria-label="How this becomes classroom memory">
      <header className="intervention-memory-preview__header">
        <span className="intervention-memory-preview__eyebrow">
          {record ? "Saved record" : "Draft preview"}
        </span>
        <h2>How this becomes classroom memory</h2>
        <p>
          The note is staged as evidence for teacher review. No family message,
          plan change, or EA instruction is sent automatically.
        </p>
      </header>

      <div className="intervention-memory-preview__record">
        <div className="intervention-memory-preview__record-header">
          <span>Classroom memory note</span>
          <span>{record ? "Saved" : "Not saved"}</span>
        </div>
        <dl className="intervention-memory-preview__fields">
          <div>
            <dt>Students</dt>
            <dd>{selectedStudents.length ? selectedStudents.join(", ") : "Select from roster"}</dd>
          </div>
          <div>
            <dt>Observation</dt>
            <dd>{observation.trim() || "Evidence note will appear here as you type."}</dd>
          </div>
          <div>
            <dt>Follow-up</dt>
            <dd>{followUpText}</dd>
          </div>
          <div>
            <dt>Destination</dt>
            <dd>{destination}</dd>
          </div>
        </dl>
      </div>

      <section className="intervention-memory-preview__connections" aria-label="Memory connections">
        <h3>Memory connections</h3>
        <div>
          <span>Student thread</span>
          <span>Follow-up queue</span>
          <span>EA/Sub context</span>
        </div>
      </section>
    </article>
  );
}

function mapInterventionsToDebtItems(
  records: InterventionRecord[],
  category: DebtItem["category"],
): DebtItem[] {
  const now = Date.now();
  const dayMs = 86_400_000;
  return records.map((record) => {
    const createdAt = new Date(record.created_at).getTime();
    const ageDays = Number.isFinite(createdAt)
      ? Math.max(0, Math.floor((now - createdAt) / dayMs))
      : 0;

    return {
      category,
      student_refs: record.student_refs,
      description: record.observation || record.action_taken || "Follow-up needed",
      source_record_id: record.record_id,
      age_days: ageDays,
      suggested_action: record.action_taken || "Log follow-up",
    };
  });
}
