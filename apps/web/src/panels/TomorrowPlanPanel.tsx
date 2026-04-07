import { useApp } from "../AppContext";
import { useAsyncAction } from "../useAsyncAction";
import { generateTomorrowPlan } from "../api";
import TeacherReflection from "../components/TeacherReflection";
import PlanViewer from "../components/PlanViewer";
import SkeletonLoader from "../components/SkeletonLoader";
import type { TomorrowPlanResponse, FamilyMessagePrefill, InterventionPrefill } from "../types";

interface Props {
  onFollowupClick: (prefill: FamilyMessagePrefill) => void;
  onInterventionClick: (prefill: InterventionPrefill) => void;
}

export default function TomorrowPlanPanel({ onFollowupClick, onInterventionClick }: Props) {
  const { classrooms, activeClassroom, setActiveClassroom, showSuccess } = useApp();
  const { loading, error, result, execute } = useAsyncAction<TomorrowPlanResponse>();

  if (classrooms.length === 0) return null;

  async function handleSubmit(classroomId: string, reflection: string, teacherGoal?: string) {
    const resp = await execute((signal) =>
      generateTomorrowPlan({
        classroom_id: classroomId,
        teacher_reflection: reflection,
        teacher_goal: teacherGoal,
      }, signal)
    );
    if (resp) showSuccess("Plan generated");
  }

  return (
    <div className={result ? "split-pane" : ""}>
      <TeacherReflection
        classrooms={classrooms}
        selectedClassroom={activeClassroom}
        onClassroomChange={setActiveClassroom}
        onSubmit={handleSubmit}
        loading={loading}
      />
      <div aria-live="polite">
        {error && result === null && <div className="error-banner">{error}</div>}
        {loading && result === null && (
          <SkeletonLoader variant="stack" message="Deep reasoning in progress — generating your support plan..." label="Generating tomorrow plan" />
        )}
        {!loading && result === null && !error && (
          <div className="empty-state">
            <svg className="empty-state-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M8 36 Q16 20 24 28 Q32 16 40 24" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" fill="none"/><line x1="8" y1="38" x2="40" y2="38" stroke="var(--color-border)" strokeWidth="1.5"/><circle cx="36" cy="14" r="5" stroke="var(--color-accent)" strokeWidth="1.5" fill="var(--color-bg-accent)"/><path d="M36 12v4M36 12l2 2" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <div className="empty-state-title">No plan yet</div>
            <p className="empty-state-description">
              Reflect on today to generate a structured support plan for tomorrow. The planning model uses deep reasoning.
            </p>
          </div>
        )}
        {result && (
          <PlanViewer
            plan={result.plan}
            thinkingSummary={result.thinking_summary}
            patternInformed={result.pattern_informed}
            onFollowupClick={onFollowupClick}
            onInterventionClick={onInterventionClick}
          />
        )}
      </div>
    </div>
  );
}
