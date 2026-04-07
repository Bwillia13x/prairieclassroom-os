import { useEffect } from "react";
import { useApp } from "../AppContext";
import { useAsyncAction } from "../useAsyncAction";
import { logIntervention } from "../api";
import InterventionLogger from "../components/InterventionLogger";
import InterventionCard from "../components/InterventionCard";
import SkeletonLoader from "../components/SkeletonLoader";
import type { InterventionResponse, InterventionPrefill } from "../types";

interface Props {
  prefill: InterventionPrefill | null;
}

export default function InterventionPanel({ prefill }: Props) {
  const { classrooms, activeClassroom, setActiveClassroom, students, showSuccess } = useApp();
  const { loading, error, result, execute, reset } = useAsyncAction<InterventionResponse>();

  useEffect(() => {
    if (prefill) reset();
  }, [prefill, reset]);

  if (classrooms.length === 0) return null;

  async function handleSubmit(
    classroomId: string,
    studentRefs: string[],
    teacherNote: string,
    context?: string,
  ) {
    const resp = await execute((signal) =>
      logIntervention({
        classroom_id: classroomId,
        student_refs: studentRefs,
        teacher_note: teacherNote,
        context,
      }, signal)
    );
    if (resp) showSuccess("Intervention logged");
  }

  return (
    <div className={result ? "split-pane" : ""}>
      <InterventionLogger
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
          <SkeletonLoader variant="single" message="Structuring your intervention note..." label="Structuring intervention note" />
        )}
        {!loading && result === null && !error && (
          <div className="empty-state">
            <svg className="empty-state-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect x="10" y="4" width="28" height="36" rx="2" stroke="var(--color-border)" strokeWidth="2"/><path d="M16 14h16M16 20h12M16 26h8" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round"/><circle cx="16" cy="33" r="1.5" fill="var(--color-accent)"/><path d="M20 33h10" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <div className="empty-state-title">No intervention logged</div>
            <p className="empty-state-description">
              Select students and describe what happened. The system structures your note for classroom memory.
            </p>
          </div>
        )}
        {result && (
          <InterventionCard
            record={result.record}
          />
        )}
      </div>
    </div>
  );
}
