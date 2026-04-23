import { useEffect, useMemo, useState } from "react";
import { useApp } from "../AppContext";
import { useSession } from "../SessionContext";
import { useAsyncAction } from "../useAsyncAction";
import {
  fetchTodaySnapshot,
  fetchClassroomHealth,
  fetchStudentSummary,
  fetchSessionSummary,
  type SessionSummary,
} from "../api";
import type { NavTarget } from "../appReducer";
import PageIntro from "../components/PageIntro";
import SectionSkeleton from "../components/SectionSkeleton";
import ErrorBanner from "../components/ErrorBanner";
import HealthBar from "../components/HealthBar";
import StudentRoster from "../components/StudentRoster";
import OperatingDashboard from "../components/OperatingDashboard";
import DrillDownDrawer from "../components/DrillDownDrawer";
import { StudentCoverageStrip } from "../components/TriageSurfaces";
import {
  ClassroomCompositionRings,
  InterventionRecencyTimeline,
  StudentPriorityMatrix,
  ComplexityDebtGauge,
} from "../components/DataVisualizations";
import { ActionButton, Card } from "../components/shared";
import SectionIcon from "../components/SectionIcon";
import type {
  ClassroomHealth,
  DrillDownContext,
  FamilyMessagePrefill,
  InterventionPrefill,
  StudentSummary,
  TodaySnapshot,
} from "../types";
import "./TodayPanel.css";

interface Props {
  onTabChange: (target: NavTarget) => void;
  onInterventionPrefill?: (prefill: InterventionPrefill) => void;
  onMessagePrefill?: (prefill: FamilyMessagePrefill) => void;
}

/**
 * ClassroomPanel — bird's-eye operating dashboard for the classroom.
 *
 * Hosts the OperatingDashboard (week overview, support coverage, queue
 * state, transition risks), the planning-health bar, student priority
 * and composition surfaces, and explicit jump actions into the adjacent
 * temporal surfaces (Today, Tomorrow, Week). The live-day triage view
 * continues to live on the Today page; this page is the always-on
 * classroom lens.
 */
export default function ClassroomPanel({
  onTabChange,
  onInterventionPrefill,
  onMessagePrefill,
}: Props) {
  const { activeClassroom, activeRole, profile } = useApp();
  const session = useSession();
  const { error, result, execute, reset } = useAsyncAction<TodaySnapshot>();
  const health = useAsyncAction<ClassroomHealth>();
  const studentSummaries = useAsyncAction<StudentSummary[]>();
  const sessionSummary = useAsyncAction<SessionSummary>();
  const [drillDown, setDrillDown] = useState<DrillDownContext | null>(null);

  useEffect(() => {
    session.recordPanelVisit("classroom");
  }, [session]);

  useEffect(() => {
    if (!activeClassroom) return;
    execute((signal) => fetchTodaySnapshot(activeClassroom, signal));
    health.execute((signal) => fetchClassroomHealth(activeClassroom, signal));
    studentSummaries.execute((signal) => fetchStudentSummary(activeClassroom, undefined, signal));
    sessionSummary.execute((signal) => fetchSessionSummary(activeClassroom, signal));
  }, [activeClassroom, execute, health.execute, sessionSummary.execute, studentSummaries.execute]);

  const attentionStudents = useMemo(
    () => new Set(result?.debt_register.items.flatMap((i) => i.student_refs) ?? []),
    [result],
  );
  const pendingActionCount = result?.debt_register.items.length ?? 0;
  const previousDebtTotal = useMemo(() => {
    const series = health.result?.trends?.debt_total_14d;
    if (!series || series.length < 2) return undefined;
    return series[series.length - 2];
  }, [health.result]);

  if (!profile) return null;

  return (
    <section className="workspace-page classroom-panel" id="classroom-top">
      <PageIntro
        eyebrow="Classroom"
        title="Classroom operating view"
        sectionTone="sun"
        emphasis="brand"
        description={`Bird's-eye health, coverage, and queue signal for Grade ${profile.grade_band}. Jump into Today, Tomorrow, or Week when a specific action calls.`}
        visual={{ src: "/brand/workflow-today.png" }}
        dynamicContext={[
          { label: `${profile.students.length} students`, tone: "sun" },
        ]}
      />

      {error && !result ? <ErrorBanner message={error} onDismiss={reset} /> : null}

      <div id="classroom-lenses" className="classroom-panel__anchor-target">
        <Card variant="flat" className="classroom-jump-actions" aria-label="Classroom jump actions">
          <Card.Body>
            <div className="classroom-jump-actions__row">
              <div className="classroom-jump-actions__copy">
                <strong>Pick the temporal lens</strong>
                <span>Use Classroom for the bird's-eye view, Today for same-day triage, Tomorrow to plan ahead, Week for multi-day coverage.</span>
              </div>
              <div className="classroom-jump-actions__buttons">
                <ActionButton size="sm" variant="soft" onClick={() => onTabChange("today")}>
                  <SectionIcon name="sun" className="shell-nav__group-icon" />
                  Today
                </ActionButton>
                <ActionButton size="sm" variant="soft" onClick={() => onTabChange("tomorrow")}>
                  <SectionIcon name="clock" className="shell-nav__group-icon" />
                  Tomorrow
                </ActionButton>
                <ActionButton size="sm" variant="soft" onClick={() => onTabChange("week")}>
                  <SectionIcon name="grid" className="shell-nav__group-icon" />
                  Week
                </ActionButton>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>

      <div id="classroom-watchlist" className="classroom-panel__anchor-target">
        {result?.student_threads?.length ? (
          <StudentCoverageStrip
            threads={result.student_threads}
            title="Top students to watch"
            selectedAlias={null}
            onSelectThread={(thread) => setDrillDown({ type: "student-thread", thread })}
          />
        ) : null}
      </div>

      <div id="classroom-dashboard" className="classroom-panel__anchor-target">
        {result ? (
          <OperatingDashboard
            snapshot={result}
            profile={profile}
            health={health.result ?? null}
            sessionSummary={sessionSummary.result ?? null}
            activeRole={activeRole}
            onNavigate={onTabChange}
            onOpenContext={setDrillDown}
          />
        ) : (
          <SectionSkeleton label="Loading classroom dashboard" variant="story" lines={3} />
        )}
      </div>

      <div id="classroom-intelligence" className="today-grid__viz-row classroom-panel__anchor-target">
        {result && result.debt_register.items.length > 0 ? (
          <ComplexityDebtGauge
            debtItems={result.debt_register.items}
            previousTotal={previousDebtTotal}
            onSegmentClick={(payload) =>
              setDrillDown({
                type: "trend",
                trendKey: payload.trendKey,
                data: health.result?.trends?.debt_total_14d ?? payload.data,
                label: payload.label,
              })
            }
          />
        ) : null}

        {studentSummaries.result && studentSummaries.result.length > 0 ? (
          <StudentPriorityMatrix
            students={studentSummaries.result}
            onStudentClick={(alias) => setDrillDown({ type: "student", alias })}
          />
        ) : null}

        {studentSummaries.result && studentSummaries.result.length > 0 ? (
          <InterventionRecencyTimeline
            students={studentSummaries.result}
            onStudentClick={(alias) => setDrillDown({ type: "student", alias })}
          />
        ) : null}

        {profile && profile.students.length > 0 ? (
          <ClassroomCompositionRings
            students={profile.students}
            onSegmentClick={(payload) =>
              setDrillDown({
                type: "student-tag-group",
                groupKind: payload.groupKind,
                tag: payload.tag,
                label: payload.label,
                students: payload.students,
              })
            }
          />
        ) : null}
      </div>

      <div id="classroom-health" className="classroom-panel__anchor-target">
        {health.result ? (
          <HealthBar
            health={health.result ?? null}
            loading={false}
            pendingActionCount={pendingActionCount}
            onTrendClick={(payload) => setDrillDown({ type: "trend", ...payload })}
          />
        ) : health.error ? (
          <div className="today-health-error" role="alert">Couldn&apos;t load health summary: {health.error}</div>
        ) : (
          <SectionSkeleton label="Loading health summary" variant="health" lines={2} />
        )}
      </div>

      <div id="classroom-roster" className="classroom-panel__anchor-target">
        {result ? (
          <StudentRoster
            attentionCount={attentionStudents.size}
            onDrillDown={(context) => setDrillDown(context)}
          />
        ) : null}
      </div>

      <DrillDownDrawer
        context={drillDown}
        onClose={() => setDrillDown(null)}
        onNavigate={(tab) => {
          setDrillDown(null);
          onTabChange(tab);
        }}
        onContextChange={setDrillDown}
        onInterventionPrefill={onInterventionPrefill}
        onMessagePrefill={onMessagePrefill}
      />
    </section>
  );
}
