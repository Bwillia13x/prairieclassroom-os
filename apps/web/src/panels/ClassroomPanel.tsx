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
import CohortSparklineGrid from "../components/CohortSparklineGrid";
import ErrorBanner from "../components/ErrorBanner";
import HealthBar from "../components/HealthBar";
import StudentRoster from "../components/StudentRoster";
import OperatingDashboard from "../components/OperatingDashboard";
import DrillDownDrawer from "../components/DrillDownDrawer";
import { StudentCoverageStrip } from "../components/TriageSurfaces";
import PageHero, {
  type PageHeroMetricGroup,
  type PageHeroStatusRow,
} from "../components/shared/PageHero";
import OperationalPreview, {
  type OperationalPreviewChip,
  type OperationalPreviewGroup,
} from "../components/shared/OperationalPreview";
import { useZoneDisclosure } from "../hooks/useZoneDisclosure";
import {
  ClassroomCompositionRings,
  InterventionRecencyTimeline,
  StudentPriorityMatrix,
  ComplexityDebtGauge,
} from "../components/DataVisualizations";
import { countActionableThreads } from "./ClassroomPanel.helpers";
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
  const intelDisclosure = useZoneDisclosure(`classroom-${activeClassroom}`, "intel", {
    defaultOpen: false,
  });
  const rosterDisclosure = useZoneDisclosure(`classroom-${activeClassroom}`, "roster", {
    defaultOpen: false,
  });

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
  // Count only threads that actually carry work — see ClassroomPanel.helpers.
  // The orchestrator returns one student_threads entry per roster student
  // (built from `classroom.students.map(...)`), so the raw `.length` would
  // always equal the roster size and made the THREADS stat read identically
  // to STUDENTS. Filtering preserves the seed contract's tiered roster.
  const openThreadCount = countActionableThreads(result?.student_threads);
  const openItemCount = result?.debt_register.items.length ?? null;
  const plannedDays = health.result?.plans_last_7.filter(Boolean).length ?? null;
  const watchCount = openThreadCount ?? 0;

  const pulse = derivePulse(health.result ?? null, pendingActionCount);

  if (!profile) return null;

  const streakDays = health.result?.streak_days ?? 0;

  // Metric groups read as a command-block: "Today" lens → "Roster" lens →
  // "Plan" lens. Each group keeps its own eyebrow so the labels never
  // collide and the figures stay readable when the aside collapses.
  const heroMetricGroups: PageHeroMetricGroup[] = [
    {
      label: "Today",
      metrics: [
        {
          value: openThreadCount ?? "—",
          label: "Threads",
          tone: openThreadCount && openThreadCount > 6 ? "danger" : openThreadCount && openThreadCount > 3 ? "warning" : undefined,
        },
        {
          value: openItemCount ?? "—",
          label: "Open",
          tone: openItemCount && openItemCount > 6 ? "warning" : undefined,
        },
      ],
    },
    {
      label: "Roster",
      metrics: [
        { value: profile.students.length, label: "Students" },
        { value: ealCount, label: "EAL" },
      ],
    },
    {
      label: "Plan",
      metrics: [
        {
          value: plannedDays !== null ? `${plannedDays}/7` : "—",
          label: "Filed",
        },
        {
          value: streakDays > 0 ? `${streakDays}d` : "—",
          label: "Streak",
          tone: streakDays >= 5 ? "success" : undefined,
        },
      ],
    },
  ];

  // Status rows surface secondary signals that don't deserve a tile but
  // belong on the first screen — the plan calls these "pressure status"
  // and "last activity" cues. Pulled from existing health/snapshot data.
  const lastActivityLabel = result?.last_activity_at
    ? new Date(result.last_activity_at).toLocaleString(undefined, {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";
  const heroStatusRows: PageHeroStatusRow[] = [
    {
      label: "Pressure",
      value: pulse.label,
      tone: pulse.tone,
    },
    {
      label: "Last activity",
      value: lastActivityLabel,
    },
  ];

  // Operational preview — three groups: students-to-watch, coverage
  // snapshot, and queue preview. All three pull from existing snapshot
  // data; falls back gracefully when the snapshot is loading.
  const watchChips: OperationalPreviewChip[] = (result?.student_threads ?? [])
    .slice(0, 6)
    .map((thread) => {
      const tone =
        thread.pending_action_count > 2
          ? "danger"
          : thread.pending_action_count > 0
            ? "watch"
            : thread.eal_flag
              ? "accent"
              : "neutral";
      return {
        label: thread.alias,
        tone,
        meta:
          thread.pending_action_count > 0
            ? `${thread.pending_action_count} open`
            : thread.last_intervention_days !== null
              ? `${thread.last_intervention_days}d ago`
              : undefined,
        title: thread.priority_reason ?? undefined,
      };
    });

  const DEBT_LABELS: Record<string, string> = {
    stale_followup: "Stale follow-up",
    unapproved_message: "Unapproved message",
    unaddressed_pattern: "Unaddressed pattern",
    recurring_plan_item: "Recurring plan item",
    approaching_review: "Approaching review",
  };
  const debtSummary = result?.debt_register?.items ?? [];
  const queueEvidence = debtSummary.slice(0, 4).map((item) => ({
    label: DEBT_LABELS[item.category] ?? item.category,
    meta: `${item.age_days}d · ${item.student_refs.length} student${item.student_refs.length === 1 ? "" : "s"}`,
  }));

  const previewGroups: OperationalPreviewGroup[] = [
    {
      eyebrow: "Students to watch",
      meta: watchCount > 0 ? `${watchCount} of ${profile.students.length}` : undefined,
      chips: watchChips.length > 0 ? watchChips : undefined,
    },
    {
      eyebrow: "Coverage",
      evidence: [
        {
          label: "EAL learners",
          meta: `${ealCount} flagged`,
        },
        {
          label: "Plan readiness",
          meta: plannedDays !== null ? `${plannedDays} of last 7 days` : "—",
        },
        {
          label: "Streak",
          meta: streakDays > 0 ? `${streakDays}-day` : "no streak",
        },
      ],
    },
    {
      eyebrow: "Queue",
      meta: pendingActionCount > 0 ? `${pendingActionCount} pending` : "Clear",
      evidence: queueEvidence.length > 0 ? queueEvidence : undefined,
    },
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
        metricGroups={heroMetricGroups}
        statusRows={heroStatusRows}
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

      {/* ============================================================
          ZONE 1.5 — OPERATIONAL PREVIEW
          Dense below-hero strip: students-to-watch chips, coverage
          snapshot, and queue preview. First-screen content per the
          design pass — no new backend fields, all data pulled from
          the existing snapshot/profile/health results.
          ============================================================ */}
      <OperationalPreview
        ariaLabel="Classroom operational preview"
        id="classroom-preview"
        groups={previewGroups}
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
          ZONE 3.5 — COHORT PULSE
          14-day per-student intervention sparkline grid.
          Pre-attentive outlier scan that complements the top-N
          Watchlist with an everyone-at-once view.
          ============================================================ */}
      <section className="classroom-section" aria-labelledby="classroom-cohort-pulse-heading">
        <div className="classroom-section__header">
          <div>
            <span className="classroom-section__eyebrow">Cohort pulse</span>
            <h3 id="classroom-cohort-pulse-heading" className="classroom-section__title">
              14-day intervention pulse
            </h3>
          </div>
          <p className="classroom-section__caption">
            Each cell is one student. Tall recent peaks = active attention this week. Faint dashed line = cohort average.
          </p>
        </div>
        {studentSummaries.result && studentSummaries.result.length > 0 ? (
          <CohortSparklineGrid
            students={studentSummaries.result}
            onStudentClick={(alias) => setDrillDown({ type: "student", alias })}
          />
        ) : studentSummaries.error ? (
          <div className="today-health-error" role="alert">
            Couldn&apos;t load cohort pulse: {studentSummaries.error}
          </div>
        ) : (
          <SectionSkeleton label="Loading cohort pulse" variant="story" lines={2} />
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
      <details
        className="classroom-section classroom-zone--collapsible"
        id="classroom-insights"
        aria-labelledby="classroom-insights-eyebrow classroom-insights-title"
        open={intelDisclosure.open}
        onToggle={(e) => intelDisclosure.setOpen(e.currentTarget.open)}
      >
        <summary className="classroom-zone__summary">
          <span id="classroom-insights-eyebrow" className="classroom-zone__summary-eyebrow">Intelligence</span>
          <span id="classroom-insights-title" className="classroom-zone__summary-title">Patterns &amp; composition</span>
          <span className="classroom-zone__summary-hint">{intelDisclosure.open ? "Collapse" : "Expand"}</span>
        </summary>
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
      </details>

      {/* ============================================================
          ZONE 6 — ROSTER
          ============================================================ */}
      <details
        className="classroom-section classroom-zone--collapsible"
        id="classroom-roster"
        aria-label="Full student roster"
        open={rosterDisclosure.open}
        onToggle={(e) => rosterDisclosure.setOpen(e.currentTarget.open)}
      >
        <summary className="classroom-zone__summary">
          <span className="classroom-zone__summary-eyebrow">Roster</span>
          <span className="classroom-zone__summary-title">All students</span>
          <span className="classroom-zone__summary-chips">
            <span className="classroom-section__chip classroom-section__chip--warning">
              <strong>{attentionStudents.size}</strong> need attention
            </span>
            <span className="classroom-section__chip">
              <strong>{profile.students.length}</strong> total
            </span>
          </span>
          <span className="classroom-zone__summary-hint">{rosterDisclosure.open ? "Collapse" : "Expand"}</span>
        </summary>
        <div className="classroom-roster__body">
          {result ? (
            <StudentRoster
              attentionCount={attentionStudents.size}
              onDrillDown={(context) => setDrillDown(context)}
            />
          ) : null}
        </div>
      </details>

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
