import { useState, useCallback, useEffect } from "react";
import { useApp } from "../AppContext";
import { useSession } from "../SessionContext";
import { useAsyncAction } from "../useAsyncAction";
import { generateTomorrowPlan, fetchPlanHistory } from "../api";
import TeacherReflection from "../components/TeacherReflection";
import PlanViewer from "../components/PlanViewer";
import SkeletonLoader from "../components/SkeletonLoader";
import StreamingIndicator from "../components/StreamingIndicator";
import ContextualHint from "../components/ContextualHint";
import OutputFeedback from "../components/OutputFeedback";
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
import { useStreamingRequest } from "../hooks/useStreamingRequest";
import { parseRecordTimestamp } from "../utils/parseRecordTimestamp";
import type { TomorrowPlanResponse, TomorrowPlan, FamilyMessagePrefill, InterventionPrefill } from "../types";

interface Props {
  onFollowupClick: (prefill: FamilyMessagePrefill) => void;
  onInterventionClick: (prefill: InterventionPrefill) => void;
}

export default function TomorrowPlanPanel({ onFollowupClick, onInterventionClick }: Props) {
  const { classrooms, activeClassroom, setActiveClassroom, profile, showSuccess, streaming } = useApp();
  const session = useSession();
  const { loading, error, result, execute, cancel, reset } = useAsyncAction<TomorrowPlanResponse>();
  const history = useHistory(fetchPlanHistory, activeClassroom, 10);
  const [historicalResult, setHistoricalResult] = useState<TomorrowPlanResponse | null>(null);
  const streamer = useStreamingRequest({
    sectionLabels: ["Support priorities", "Prep checklist", "Differentiation notes"],
  });
  const feedback = useFeedback(activeClassroom, session.sessionId);

  useEffect(() => {
    session.recordPanelVisit("tomorrow-plan");
  }, [session]);

  const handleFeedbackSubmit = useCallback(
    (rating: number, comment?: string) => {
      const planId = (result ?? historicalResult)?.plan.plan_id;
      feedback.submit("tomorrow-plan", rating, comment, planId, "prepare_tomorrow_plan");
      session.recordFeedback();
    },
    [feedback.submit, result, historicalResult, session],
  );

  const displayResult = result ?? historicalResult;

  if (classrooms.length === 0) return null;

  async function handleSubmit(classroomId: string, reflection: string, teacherGoal?: string) {
    setHistoricalResult(null);
    const resp = await streamer.execute(() =>
      execute((signal) =>
        generateTomorrowPlan({
          classroom_id: classroomId,
          teacher_reflection: reflection,
          teacher_goal: teacherGoal,
        }, signal)
      )
    );
    if (resp) {
      showSuccess("Plan generated");
      session.recordGeneration("tomorrow-plan", "prepare_tomorrow_plan");
      history.refresh();
    }
  }

  function handleHistorySelect(plan: TomorrowPlan) {
    setHistoricalResult({ plan, thinking_summary: null, pattern_informed: false, model_id: "", latency_ms: 0 });
  }

  return (
    <section className="workspace-page">
      <PageIntro
        eyebrow="Operations Workspace"
        title="Plan Tomorrow's Support"
        sectionTone="slate"
        sectionIcon="grid"
        breadcrumb={{ group: "Ops", tab: "Tomorrow Plan" }}
        description="Capture the signal from today and convert it into watchpoints, student priorities, EA actions, prep items, and family follow-ups before the next school day starts."
        badges={[
          { label: profile ? `Grade ${profile.grade_band}` : "Planning suite", tone: "sun" },
          { label: "Reasoned planning", tone: "analysis" },
          { label: "Pattern-aware", tone: "slate" },
        ]}
      />

      <WorkspaceLayout
        rail={(
          <>
            <ContextualHint
              featureKey="tomorrow-plan"
              title="Tomorrow Plan"
              description="Reflect on today's wins and challenges. The planning model uses deep reasoning to generate a structured support plan — this may take a few moments."
              tone="slate"
            />
            <HistoryDrawer<TomorrowPlan>
              items={history.items}
              loading={history.loading}
              error={history.error}
              renderItem={(plan) => `${plan.support_priorities.length} priorities, ${plan.prep_checklist.length} prep items`}
              getKey={(plan) => plan.plan_id}
              getTimestamp={(plan) => parseRecordTimestamp(plan.plan_id) ?? new Date().toISOString()}
              onSelect={handleHistorySelect}
              label="Plan History"
            />
            <TeacherReflection
              classrooms={classrooms}
              selectedClassroom={activeClassroom}
              onClassroomChange={setActiveClassroom}
              onSubmit={handleSubmit}
              loading={loading}
            />
          </>
        )}
        canvas={(
          <div className="workspace-result" aria-live="polite" aria-busy={loading && displayResult === null}>
            {error && displayResult === null ? <ErrorBanner message={error} onDismiss={reset} /> : null}
            {loading && displayResult === null ? (
              streaming.phase !== "idle"
                ? <StreamingIndicator onCancel={cancel} />
                : <SkeletonLoader variant="stack" message="Deep reasoning in progress — generating your support plan..." label="Generating tomorrow plan" />
            ) : null}
            {!loading && displayResult === null && !error ? (
              <EmptyStateCard
                icon={<EmptyStateIllustration name="plan" />}
                title="No plan yet"
                description="Use the reflection rail to capture the day. The result canvas will fill with tomorrow's priorities, prep actions, and family follow-through."
              />
            ) : null}
            {displayResult ? (
              <>
                <ResultBanner
                  label="Plan generated"
                  generatedAt={parseRecordTimestamp(displayResult.plan.plan_id)}
                  modelId={displayResult.model_id || undefined}
                  latencyMs={displayResult.latency_ms || undefined}
                />
                <PlanViewer
                  plan={displayResult.plan}
                  thinkingSummary={displayResult.thinking_summary}
                  patternInformed={displayResult.pattern_informed}
                  onFollowupClick={onFollowupClick}
                  onInterventionClick={onInterventionClick}
                />
                <OutputFeedback outputId={displayResult.plan.plan_id} outputType="tomorrow-plan" />
                <FeedbackCollector
                  onSubmit={handleFeedbackSubmit}
                  submitted={feedback.submitted}
                  panelLabel="tomorrow plan"
                />
              </>
            ) : null}
          </div>
        )}
      />
    </section>
  );
}
