import { useEffect, useState } from "react";
import { useApp } from "../AppContext";
import { useAsyncAction } from "../useAsyncAction";
import { logIntervention, fetchInterventionHistory } from "../api";
import InterventionLogger from "../components/InterventionLogger";
import InterventionCard from "../components/InterventionCard";
import SkeletonLoader from "../components/SkeletonLoader";
import ContextualHint from "../components/ContextualHint";
import HistoryDrawer from "../components/HistoryDrawer";
import { useHistory } from "../hooks/useHistory";
import type { InterventionResponse, InterventionRecord, InterventionPrefill } from "../types";

interface Props {
  prefill: InterventionPrefill | null;
}

export default function InterventionPanel({ prefill }: Props) {
  const { classrooms, activeClassroom, setActiveClassroom, students, showSuccess, showUndo } = useApp();
  const { loading, error, result, execute, reset } = useAsyncAction<InterventionResponse>();
  const history = useHistory(fetchInterventionHistory, activeClassroom, 20);
  const [historicalResult, setHistoricalResult] = useState<InterventionResponse | null>(null);

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
    <div className={displayResult ? "split-pane" : ""}>
      <div>
        <ContextualHint
          featureKey="log-intervention"
          title="Log Intervention"
          description="Describe what happened and the system structures your note into classroom memory. You can undo within a few seconds if needed."
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
      </div>
      <div aria-live="polite">
        {error && displayResult === null && <div className="error-banner">{error}</div>}
        {loading && displayResult === null && (
          <SkeletonLoader variant="single" message="Structuring your intervention note..." label="Structuring intervention note" />
        )}
        {!loading && displayResult === null && !error && (
          <div className="empty-state">
            <svg className="empty-state-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect x="10" y="4" width="28" height="36" rx="2" stroke="var(--color-border)" strokeWidth="2"/><path d="M16 14h16M16 20h12M16 26h8" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round"/><circle cx="16" cy="33" r="1.5" fill="var(--color-accent)"/><path d="M20 33h10" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <div className="empty-state-title">No intervention logged</div>
            <p className="empty-state-description">
              Select students and describe what happened. The system structures your note for classroom memory.
            </p>
          </div>
        )}
        {displayResult && (
          <InterventionCard
            record={displayResult.record}
          />
        )}
      </div>
    </div>
  );
}
