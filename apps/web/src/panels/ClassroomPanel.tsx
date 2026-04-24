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
import SectionSkeleton from "../components/SectionSkeleton";
import ErrorBanner from "../components/ErrorBanner";
import HealthBar from "../components/HealthBar";
import StudentRoster from "../components/StudentRoster";
import OperatingDashboard from "../components/OperatingDashboard";
import DrillDownDrawer from "../components/DrillDownDrawer";
import { StudentCoverageStrip } from "../components/TriageSurfaces";
import PageHero from "../components/shared/PageHero";
import {
  ClassroomCompositionRings,
  InterventionRecencyTimeline,
  StudentPriorityMatrix,
  ComplexityDebtGauge,
} from "../components/DataVisualizations";
import type {
  ClassroomHealth,
  DrillDownContext,
  FamilyMessagePrefill,
  InterventionPrefill,
  StudentSummary,
  TodaySnapshot,
} from "../types";
import "./TodayPanel.css";
import "./ClassroomPanel.css";

interface Props {
  onTabChange: (target: NavTarget) => void;
  onInterventionPrefill?: (prefill: InterventionPrefill) => void;
  onMessagePrefill?: (prefill: FamilyMessagePrefill) => void;
}

type PulseTone = "success" | "warning" | "danger" | "neutral";

function derivePulse(
  health: ClassroomHealth | null,
  pendingActionCount: number,
): { tone: PulseTone; label: string; meta: string } {
  if (!health) {
    return { tone: "neutral", label: "Reading the room", meta: "Loading signal" };
  }
  const planToday = health.plans_last_7[0] ?? false;
  const streak = health.streak_days ?? 0;
  if (pendingActionCount > 6) {
    return {
      tone: "danger",
      label: "Needs attention",
      meta: `${pendingActionCount} open · plan today: ${planToday ? "yes" : "no"}`,
    };
  }
  if (pendingActionCount > 3) {
    return {
      tone: "warning",
      label: "Catching up",
      meta: `${pendingActionCount} open · ${streak}-day streak`,
    };
  }
  if (pendingActionCount === 0 && streak >= 2 && planToday) {
    return {
      tone: "success",
      label: "On track",
      meta: `${streak}-day streak · plan filed`,
    };
  }
  return {
    tone: "neutral",
    label: planToday ? "Steady" : "Plan pending",
    meta: `${pendingActionCount} open · ${streak}-day streak`,
  };
}


/**
 * ClassroomPanel — bird's-eye operating console for the classroom.
 *
 * Five intentional zones, separated by --space-7 so the page reads
 * as a cadence of frames rather than a single feed:
 *
 *   1. Hero      — command + status pulse + metrics + temporal pivots
 *   2. Pulse     — HealthBar (planning streak, debt, complexity)
 *   3. Watchlist — top students to watch
 *   4. Ops       — week / coverage / queues (OperatingDashboard)
 *   5. Intel     — 2x2 viz grid (debt, priority, recency, composition)
 *   6. Roster    — full roster, collapsible
 *
 * Replaces the prior layout that incorrectly reused
 * `.today-grid__viz-row` (display:contents) and inflated each viz to
 * ~6,200px. See ClassroomPanel.css header comment for full rationale.
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
  const ealCount = profile?.students.filter((student) => student.eal_flag).length ?? 0;
  const openThreadCount = result?.student_threads?.length ?? null;
  const openItemCount = result?.debt_register.items.length ?? null;
  const plannedDays = health.result?.plans_last_7.filter(Boolean).length ?? null;
  const watchCount = result?.student_threads?.length ?? 0;

  const pulse = derivePulse(health.result ?? null, pendingActionCount);

  if (!profile) return null;

  const heroMetrics: Array<{ value: number | string; label: string }> = [
    { value: profile.students.length, label: "Students" },
    { value: ealCount, label: "EAL" },
    { value: openThreadCount ?? "—", label: "Threads" },
    { value: openItemCount ?? "—", label: "Open" },
    { value: plannedDays !== null ? `${plannedDays}/7` : "—", label: "Plans" },
  ];

  return (
    <section className="workspace-page classroom-panel" id="classroom-top">
      {/* ============================================================
          ZONE 1 — HERO
          Command + status pulse + temporal pivots + metrics row.
          ============================================================ */}
      <PageHero
        id="classroom-command"
        ariaLabel="Classroom command and temporal pivots"
        eyebrow="Classroom command"
        title="Read the room before choosing the lens."
        description={
          <>
            Bird&apos;s-eye health, coverage, and queue signal for{" "}
            <strong>Grade {profile.grade_band}</strong>. Pivot into{" "}
            <strong>Today</strong> for live triage,{" "}
            <strong>Tomorrow</strong> to stage the next block, or{" "}
            <strong>Week</strong> to forecast pressure.
          </>
        }
        pulse={{
          tone: pulse.tone,
          state: pulse.label,
          meta: pulse.meta,
          live: pulse.tone !== "neutral",
        }}
        metrics={heroMetrics}
        pivots={[
          {
            eyebrow: "Live",
            label: "Today",
            icon: "sun",
            onClick: () => onTabChange("today"),
          },
          {
            eyebrow: "Stage",
            label: "Tomorrow",
            icon: "clock",
            onClick: () => onTabChange("tomorrow"),
          },
          {
            eyebrow: "Forecast",
            label: "Week",
            icon: "grid",
            onClick: () => onTabChange("week"),
          },
        ]}
        variant="classroom"
      />

      {error && !result ? <ErrorBanner message={error} onDismiss={reset} /> : null}

      {/* ============================================================
          ZONE 2 — PULSE (HealthBar moved up from bottom)
          ============================================================ */}
      <section className="classroom-section" id="classroom-health" aria-label="Classroom pulse">
        <div className="classroom-section__header">
          <div className="classroom-section__header-text">
            <span className="classroom-section__eyebrow">Pulse</span>
            <h3 className="classroom-section__title">Planning streak &amp; trend</h3>
          </div>
          <p className="classroom-section__caption">
            Record-derived. Updated on every plan, intervention, and message.
          </p>
        </div>
        <div className="classroom-pulse__body">
          {health.result ? (
            <HealthBar
              health={health.result ?? null}
              loading={false}
              pendingActionCount={pendingActionCount}
              onTrendClick={(payload) => setDrillDown({ type: "trend", ...payload })}
            />
          ) : health.error ? (
            <div className="today-health-error" role="alert">
              Couldn&apos;t load health summary: {health.error}
            </div>
          ) : (
            <SectionSkeleton label="Loading health summary" variant="health" lines={2} />
          )}
        </div>
      </section>

      {/* ============================================================
          ZONE 3 — WATCHLIST
          ============================================================ */}
      <section className="classroom-section" id="classroom-watchlist" aria-label="Top students to watch">
        <div className="classroom-section__header">
          <div className="classroom-section__header-text">
            <span className="classroom-section__eyebrow">Watchlist</span>
            <h3 className="classroom-section__title">Students to watch</h3>
          </div>
          <div className="classroom-section__chips">
            <span className="classroom-section__chip classroom-section__chip--warning">
              <strong>{watchCount}</strong> active
            </span>
            <span className="classroom-section__chip">
              of <strong>{profile.students.length}</strong> total
            </span>
          </div>
        </div>
        {result?.student_threads?.length ? (
          <StudentCoverageStrip
            threads={result.student_threads}
            title="Top students to watch"
            selectedAlias={null}
            onSelectThread={(thread) => setDrillDown({ type: "student-thread", thread })}
          />
        ) : (
          <SectionSkeleton label="Loading watchlist" variant="story" lines={2} />
        )}
      </section>

      {/* ============================================================
          ZONE 4 — OPERATIONS (week / coverage / queues)
          ============================================================ */}
      <section className="classroom-section" id="classroom-dashboard" aria-label="Operating board">
        <div className="classroom-section__header">
          <div className="classroom-section__header-text">
            <span className="classroom-section__eyebrow">Operations</span>
            <h3 className="classroom-section__title">Week, coverage, queues</h3>
          </div>
          <p className="classroom-section__caption">
            Five-day view, student × support coverage, and pending teacher actions.
          </p>
        </div>
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
      </section>

      {/* ============================================================
          ZONE 5 — INTELLIGENCE (was the broken display:contents bug)
          Now a real CSS grid: 2x2 at >=1180px, 1-col below.
          Each viz is height-capped so no single chart can dominate.
          ============================================================ */}
      <section className="classroom-section" id="classroom-intelligence" aria-label="Classroom intelligence">
        <div className="classroom-section__header">
          <div className="classroom-section__header-text">
            <span className="classroom-section__eyebrow">Intelligence</span>
            <h3 className="classroom-section__title">Patterns &amp; composition</h3>
          </div>
          <p className="classroom-section__caption">
            Click a segment to drill into the underlying students and history.
          </p>
        </div>
        <div className="classroom-intelligence__grid">
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
      </section>

      {/* ============================================================
          ZONE 6 — ROSTER
          ============================================================ */}
      <section className="classroom-section" id="classroom-roster" aria-label="Full student roster">
        <div className="classroom-section__header">
          <div className="classroom-section__header-text">
            <span className="classroom-section__eyebrow">Roster</span>
            <h3 className="classroom-section__title">All students</h3>
          </div>
          <div className="classroom-section__chips">
            <span className="classroom-section__chip classroom-section__chip--warning">
              <strong>{attentionStudents.size}</strong> need attention
            </span>
            <span className="classroom-section__chip">
              <strong>{profile.students.length}</strong> total
            </span>
          </div>
        </div>
        <div className="classroom-roster__body">
          {result ? (
            <StudentRoster
              attentionCount={attentionStudents.size}
              onDrillDown={(context) => setDrillDown(context)}
            />
          ) : null}
        </div>
      </section>

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
