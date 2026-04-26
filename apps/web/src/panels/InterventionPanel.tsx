import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import "./InterventionPanel.css";
import { useApp } from "../AppContext";
import { useSession } from "../SessionContext";
import { useAsyncAction } from "../useAsyncAction";
import { logIntervention, logInterventionQuick, fetchInterventionHistory } from "../api";
import InterventionLogger from "../components/InterventionLogger";
import OpsWorkflowStepper from "../components/OpsWorkflowStepper";
import InterventionCard from "../components/InterventionCard";
import SkeletonLoader from "../components/SkeletonLoader";
import HistoryDrawer from "../components/HistoryDrawer";
import { InterventionTimeline, FollowUpSuccessRate } from "../components/DataVisualizations";
import PageIntro from "../components/PageIntro";
import WorkspaceLayout from "../components/WorkspaceLayout";
import EmptyStateCard from "../components/EmptyStateCard";
import ErrorBanner from "../components/ErrorBanner";
import ResultBanner from "../components/ResultBanner";
import MockModeBanner from "../components/MockModeBanner";
import RoleReadOnlyBanner from "../components/RoleReadOnlyBanner";
import DrillDownDrawer from "../components/DrillDownDrawer";
import { FeedbackCollector } from "../components/shared";
import { useFeedback } from "../hooks/useFeedback";
import { useHistory } from "../hooks/useHistory";
import { useRole } from "../hooks/useRole";
import QuickCaptureTray from "../components/quickCapture/QuickCaptureTray";
import { StudentCoverageStrip } from "../components/TriageSurfaces";
import type { DebtItem, DrillDownContext, InterventionResponse, InterventionRecord, InterventionPrefill, InterventionRequest } from "../types";

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
  const { classrooms, activeClassroom, students, showSuccess, showError, latestTodaySnapshot, setActiveTab } = useApp();
  const session = useSession();
  const { loading, error, result, execute, reset } = useAsyncAction<InterventionResponse>({
    onError: (msg) => showError(`Couldn't save intervention — ${msg}`),
  });
  const history = useHistory(fetchInterventionHistory, activeClassroom, 20);
  const [historicalResult, setHistoricalResult] = useState<InterventionResponse | null>(null);
  const [drawerPrefill, setDrawerPrefill] = useState<InterventionPrefill | null>(null);
  const [selectedAlias, setSelectedAlias] = useState<string | null>(prefill?.student_ref ?? null);
  const [drillDown, setDrillDown] = useState<DrillDownContext | null>(null);
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

  // 2026-04-19 OPS audit phase 7.1: derive per-student follow-up flags
  // from intervention history so the avatar row surfaces who still needs
  // a touchpoint. Graceful degradation: when history is empty or loading,
  // the map is empty and StudentAvatar renders without a dot.
  //   priority  — any open follow_up_needed record.
  //   stale     — follow_up_needed record older than 5 days.
  const studentFlags = useMemo<Record<string, { priority?: boolean; staleFollowupDays?: number }>>(() => {
    const now = Date.now();
    const dayMs = 86_400_000;
    const flags: Record<string, { priority?: boolean; staleFollowupDays?: number }> = {};
    for (const rec of history.items) {
      if (!rec.follow_up_needed) continue;
      const createdAt = rec.created_at ? new Date(rec.created_at).getTime() : NaN;
      const ageDays = Number.isFinite(createdAt)
        ? Math.floor((now - createdAt) / dayMs)
        : 0;
      for (const alias of rec.student_refs) {
        const prev = flags[alias] ?? {};
        const nextAge = Math.max(prev.staleFollowupDays ?? 0, ageDays);
        flags[alias] = {
          priority: true,
          staleFollowupDays: nextAge >= 5 ? nextAge : prev.staleFollowupDays,
        };
      }
    }
    return flags;
  }, [history.items]);

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

  async function submitIntervention(
    request: InterventionRequest,
    // Hallway-grade capture: the quick path saves a deterministic record
    // server-side in <100ms. Structured-details submissions continue to use
    // the full model-enriched path so action_taken + follow-up stay accurate.
    path: "quick" | "full",
  ) {
    setHistoricalResult(null);
    const call = path === "quick" ? logInterventionQuick : logIntervention;
    const resp = await execute((signal) => call(request, signal));
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
      "full",
    );
  }

  function handleQuickSubmit(request: InterventionRequest) {
    return submitIntervention(request, "quick");
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
    <section className="workspace-page">
      <PageIntro
        title="Log Intervention Notes"
        sectionTone="slate"
        description="Log what happened while the moment is still fresh. The result canvas formats the note for classroom memory, follow-up review, and later pattern analysis."
        infoContent={{
          title: "Log Intervention",
          body: (
            <p>
              Describe what happened and the system structures your note into classroom
              memory for follow-up review and later pattern analysis.
            </p>
          ),
        }}
      />

      <RoleReadOnlyBanner
        role={role}
        required="canLogInterventions"
        whatIsBlocked="Logging interventions is reserved for adults actively working with this classroom."
      />

      {latestTodaySnapshot?.student_threads?.length ? (
        <StudentCoverageStrip
          threads={latestTodaySnapshot.student_threads}
          title="Intervention coverage"
          selectedAlias={selectedAlias}
          onSelectThread={(thread) => setSelectedAlias(thread.alias)}
        />
      ) : null}

      <OpsWorkflowStepper activeTool="log-intervention" />

      <WorkspaceLayout
        splitState={displayResult ? "output" : "input"}
        rail={(
          <>
            {role.canLogInterventions ? (
              <QuickCaptureTray
                classroomId={activeClassroom}
                students={students}
                loading={loading}
                onSubmit={handleQuickSubmit}
                studentFlags={studentFlags}
                prefillAliases={selectedAlias ? [selectedAlias] : undefined}
              />
            ) : null}
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
            {/* 2026-04-19 OPS audit phase 7.4: always render the structured
                details disclosure so it reads as an affordance. Role
                gating stays on the submit inside InterventionLogger via
                canSubmit, not on the disclosure itself. Audit-fix F2
                lifted the Classroom field — InterventionLogger now reads
                activeClassroom from useApp and no longer needs the
                classrooms/onClassroomChange props. */}
            <details ref={detailsRef} className="intervention-structured-details">
              <summary>Add structured detail (duration · outcome · next step)</summary>
              <InterventionLogger
                students={students}
                selectedClassroom={activeClassroom}
                onSubmit={handleSubmit}
                loading={loading}
                prefill={activePrefill}
                canSubmit={role.canLogInterventions}
              />
            </details>
          </>
        )}
        canvas={(
          <div className="workspace-result" aria-live="polite" aria-busy={loading && displayResult === null}>
            {error && displayResult === null ? <ErrorBanner message={error} onDismiss={reset} /> : null}
            {loading && displayResult === null ? (
              <SkeletonLoader variant="single" message="Saving your note to the classroom log…" label="Saving intervention note" />
            ) : null}
            {!loading && displayResult === null && !error ? (
              <EmptyStateCard
                variant="minimal"
                cue="Select a student to begin."
                hint="Capture the observation in the form on the left; the structured note will land here."
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
