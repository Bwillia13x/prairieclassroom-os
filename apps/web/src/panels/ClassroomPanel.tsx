import { lazy, Suspense, useEffect, useMemo, useState, type CSSProperties } from "react";
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
import OperatingDashboard from "../components/OperatingDashboard";
import DrillDownDrawer from "../components/DrillDownDrawer";
import { StudentCoverageStrip } from "../components/TriageSurfaces";
import SectionIcon, { type SectionIconName } from "../components/SectionIcon";
import { ActionButton } from "../components/shared";
import SectionMarker from "../components/shared/SectionMarker";
import { useZoneDisclosure } from "../hooks/useZoneDisclosure";
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

const ClassroomIntelligenceGrid = lazy(() => import("../components/ClassroomIntelligenceGrid"));
const HealthBar = lazy(() => import("../components/HealthBar"));
const StudentRoster = lazy(() => import("../components/StudentRoster"));

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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function pressureIndex({
  pendingActionCount,
  openThreadCount,
  plannedDays,
  streakDays,
}: {
  pendingActionCount: number;
  openThreadCount: number | null;
  plannedDays: number | null;
  streakDays: number;
}) {
  const threads = openThreadCount ?? 0;
  const plans = plannedDays ?? 0;
  return Math.round(clamp(
    30 + pendingActionCount * 1.25 + threads * 0.58 - plans * 2 - Math.min(streakDays, 7) * 1.5,
    8,
    96,
  ));
}

interface ClassroomCommandInstrumentProps {
  pulse: { tone: PulseTone; label: string; meta: string };
  pressure: number;
  openThreadCount: number | null;
  openItemCount: number | null;
  studentCount: number;
  ealCount: number;
  plannedDays: number | null;
  streakDays: number;
  lastActivityLabel: string;
  onViewSignals: () => void;
}

function ClassroomCommandInstrument({
  pulse,
  pressure,
  openThreadCount,
  openItemCount,
  studentCount,
  ealCount,
  plannedDays,
  streakDays,
  lastActivityLabel,
  onViewSignals,
}: ClassroomCommandInstrumentProps) {
  const pressureStyle = { "--classroom-pressure": `${pressure}%` } as CSSProperties;
  const planValue = plannedDays !== null ? `${plannedDays}/7` : "—";

  return (
    <div
      className={`classroom-command-instrument classroom-command-instrument--${pulse.tone}`}
      aria-label="Classroom health and operating pressure"
    >
      <div className="classroom-command-instrument__header">
        <span>Room health</span>
        <span className="classroom-command-instrument__live">
          <span aria-hidden="true" />
          Live
        </span>
      </div>

      <div className="classroom-command-instrument__summary">
        <div className="classroom-command-instrument__pressure">
          <div
            className="classroom-command-instrument__ring"
            style={pressureStyle}
            role="img"
            aria-label={`Pressure index ${pressure}, ${pulse.label}`}
          >
            <span className="classroom-command-instrument__ring-core">
              <strong>{pressure}</strong>
              <em>{pulse.label}</em>
            </span>
          </div>
        </div>
        <div className="classroom-command-instrument__pulse">
          <span className="classroom-command-instrument__pulse-label">{pulse.label}</span>
          <p>{pulse.meta}</p>
          <span className="classroom-command-instrument__pressure-label">Pressure index</span>
        </div>
      </div>

      <div className="classroom-command-instrument__stats">
        <div className="classroom-command-instrument__stat">
          <span>Threads</span>
          <strong>{openThreadCount ?? "—"}</strong>
          <em>Active conversations</em>
        </div>
        <div className="classroom-command-instrument__stat">
          <span>Roster</span>
          <strong>{studentCount}</strong>
          <em>{ealCount} EAL supports</em>
        </div>
        <div className="classroom-command-instrument__stat">
          <span>Plans</span>
          <strong>{planValue}</strong>
          <em>{streakDays > 0 ? `${streakDays}d streak` : "No streak"}</em>
        </div>
        <div className="classroom-command-instrument__stat">
          <span>Queue</span>
          <strong>{openItemCount ?? "—"}</strong>
          <em>Need teacher action</em>
        </div>
      </div>

      <div className="classroom-command-instrument__footer">
        <span>
          <span aria-hidden="true" />
          {openItemCount ?? "—"} open · plans filed {planValue}
        </span>
        <span>{lastActivityLabel}</span>
        <button type="button" onClick={onViewSignals}>
          View signals
        </button>
      </div>
    </div>
  );
}

interface ClassroomCommandCardProps {
  gradeBand: string;
  pulse: { tone: PulseTone; label: string; meta: string };
  pressure: number;
  openThreadCount: number | null;
  openItemCount: number | null;
  studentCount: number;
  ealCount: number;
  plannedDays: number | null;
  streakDays: number;
  lastActivityLabel: string;
  onTabChange: (target: NavTarget) => void;
}

interface ClassroomCommandFact {
  label: string;
  value: string | number;
  caption: string;
}

interface ClassroomCommandPivot {
  eyebrow: string;
  label: string;
  icon: SectionIconName;
  target: NavTarget;
}

function ClassroomCommandCard({
  gradeBand,
  pulse,
  pressure,
  openThreadCount,
  openItemCount,
  studentCount,
  ealCount,
  plannedDays,
  streakDays,
  lastActivityLabel,
  onTabChange,
}: ClassroomCommandCardProps) {
  const planValue = plannedDays !== null ? `${plannedDays}/7` : "—";
  const planCaption = streakDays > 0 ? `${streakDays}d streak` : "No streak";
  const facts: ClassroomCommandFact[] = [
    {
      label: "Open work",
      value: openItemCount ?? "—",
      caption: "Queue items",
    },
    {
      label: "Threads",
      value: openThreadCount ?? "—",
      caption: "Active student signals",
    },
    {
      label: "Roster",
      value: studentCount,
      caption: `${ealCount} EAL supports`,
    },
    {
      label: "Plan coverage",
      value: planValue,
      caption: planCaption,
    },
  ];
  const pivots: ClassroomCommandPivot[] = [
    { eyebrow: "Live", label: "Today triage", icon: "sun", target: "today" },
    { eyebrow: "Stage", label: "Tomorrow plan", icon: "clock", target: "tomorrow" },
    { eyebrow: "Forecast", label: "Week map", icon: "trend", target: "week" },
  ];

  return (
    <section
      className={`classroom-command-card classroom-command-card--${pulse.tone}`}
      id="classroom-command"
      aria-label="Classroom command and temporal pivots"
    >
      <div className="classroom-command-card__layout">
        <article className="classroom-command-card__command" aria-labelledby="classroom-command-title">
          <div className="classroom-command-card__kicker">
            <span className="classroom-command-card__eyebrow">Classroom command</span>
            <span className="classroom-command-card__phase">Room view</span>
          </div>
          <div className="classroom-command-card__body">
            <span className="classroom-command-card__icon" aria-hidden="true">
              <SectionIcon name="grid" />
            </span>
            <div className="classroom-command-card__copy">
              <h1 id="classroom-command-title" className="classroom-command-card__title">
                Read the room, then choose the lens.
              </h1>
              <p className="classroom-command-card__description">
                Grade {gradeBand} is showing <strong>{pulse.label.toLowerCase()}</strong>.
                Start with the live queue, stage tomorrow&apos;s support, or step back to the
                weekly pressure map.
              </p>
            </div>
            <div className="classroom-command-card__actions">
              <ActionButton
                variant="primary"
                size="lg"
                onClick={() => onTabChange("today")}
                className="classroom-command-card__primary"
                trailingIcon={<span className="classroom-command-card__arrow">→</span>}
              >
                Open Today triage
              </ActionButton>
            </div>
            <dl className="classroom-command-card__facts" aria-label="Classroom command facts">
              {facts.map((fact) => (
                <div className="classroom-command-card__fact" key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                  <span>{fact.caption}</span>
                </div>
              ))}
            </dl>
          </div>

          <div className="classroom-command-card__pivots" role="group" aria-label="Temporal pivots">
            {pivots.map((pivot) => (
              <button
                key={pivot.label}
                type="button"
                className="classroom-command-card__pivot"
                data-pivot={pivot.target}
                onClick={() => onTabChange(pivot.target)}
                aria-label={`${pivot.eyebrow}: ${pivot.label}`}
              >
                <span className="classroom-command-card__pivot-icon" aria-hidden="true">
                  <SectionIcon name={pivot.icon} />
                </span>
                <span className="classroom-command-card__pivot-body">
                  <span className="classroom-command-card__pivot-eyebrow">{pivot.eyebrow}</span>
                  <span className="classroom-command-card__pivot-label">{pivot.label}</span>
                </span>
              </button>
            ))}
          </div>
        </article>

        <aside className="classroom-command-card__rail" aria-label="Classroom health rail">
          <ClassroomCommandInstrument
            pulse={pulse}
            pressure={pressure}
            openThreadCount={openThreadCount}
            openItemCount={openItemCount}
            studentCount={studentCount}
            ealCount={ealCount}
            plannedDays={plannedDays}
            streakDays={streakDays}
            lastActivityLabel={lastActivityLabel}
            onViewSignals={() => onTabChange("today")}
          />
        </aside>
      </div>
    </section>
  );
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
  const cohortCount = studentSummaries.result?.length ?? profile?.students.length ?? 0;
  const cohortActiveCount = studentSummaries.result?.filter((student) =>
    student.intervention_history_14d.some((count) => count > 0),
  ).length ?? 0;
  const forecastBlockCount = result?.latest_forecast?.blocks.length ?? 0;

  const pulse = derivePulse(health.result ?? null, pendingActionCount);

  if (!profile) return null;

  const streakDays = health.result?.streak_days ?? 0;
  const lastActivityLabel = result?.last_activity_at
    ? new Date(result.last_activity_at).toLocaleString(undefined, {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";
  const pressure = pressureIndex({
    pendingActionCount,
    openThreadCount,
    plannedDays,
    streakDays,
  });

  return (
    <section className="workspace-page classroom-panel" id="classroom-top">
      {/* ============================================================
          ZONE 1 — HERO
          Command + status pulse + temporal pivots + metrics row.
          ============================================================ */}
      <ClassroomCommandCard
        gradeBand={profile.grade_band}
        pulse={pulse}
        pressure={pressure}
        openThreadCount={openThreadCount}
        openItemCount={openItemCount}
        studentCount={profile.students.length}
        ealCount={ealCount}
        plannedDays={plannedDays}
        streakDays={streakDays}
        lastActivityLabel={lastActivityLabel}
        onTabChange={onTabChange}
      />

      {/* ============================================================
          ZONE 1.5 — COMMAND DASHBOARD BANDS
          First-screen watchlist, coverage, and queue bands. This is a
          compact OperatingDashboard view; the full board remains below.
          ============================================================ */}
      {result ? (
        <OperatingDashboard
          id="classroom-preview"
          variant="summary"
          snapshot={result}
          profile={profile}
          health={health.result ?? null}
          sessionSummary={sessionSummary.result ?? null}
          activeRole={activeRole}
          onNavigate={onTabChange}
          onOpenContext={setDrillDown}
        />
      ) : (
        <SectionSkeleton label="Loading operating preview" variant="story" lines={2} />
      )}

      {error && !result ? <ErrorBanner message={error} onDismiss={reset} /> : null}

      <SectionMarker
        number="02"
        title="Operating signal"
        subtitle="What's hot, who's watching, what's pending — at a glance."
      />

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
            <Suspense fallback={<SectionSkeleton label="Loading health trends" variant="health" lines={2} />}>
              <HealthBar
                health={health.result ?? null}
                loading={false}
                pendingActionCount={pendingActionCount}
                onTrendClick={(payload) => setDrillDown({ type: "trend", ...payload })}
              />
            </Suspense>
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
      <section
        className="classroom-section classroom-section--surface classroom-section--watchlist"
        id="classroom-watchlist"
        aria-label="Top students to watch"
      >
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
            sticky={false}
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
      <section
        className="classroom-section classroom-section--surface classroom-section--cohort"
        id="classroom-cohort-pulse"
        aria-labelledby="classroom-cohort-pulse-heading"
      >
        <div className="classroom-section__header">
          <div>
            <span className="classroom-section__eyebrow">Cohort pulse</span>
            <h3 id="classroom-cohort-pulse-heading" className="classroom-section__title">
              14-day intervention pulse
            </h3>
          </div>
          <div className="classroom-section__chips" aria-label="Cohort pulse summary">
            <span className="classroom-section__chip">
              <strong>{cohortCount}</strong> students
            </span>
            <span className="classroom-section__chip classroom-section__chip--warning">
              <strong>{cohortActiveCount}</strong> active traces
            </span>
            <span className="classroom-section__chip">14 days</span>
          </div>
        </div>
        <p className="classroom-section__caption classroom-section__caption--lede">
          Each cell is one student. Tall recent peaks mark active attention this week; the faint dashed line is the cohort average.
        </p>
        {studentSummaries.result && studentSummaries.result.length > 0 ? (
          <div className="classroom-section__content classroom-section__content--cohort">
            <CohortSparklineGrid
              students={studentSummaries.result}
              onStudentClick={(alias) => setDrillDown({ type: "student", alias })}
            />
          </div>
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
      <section
        className="classroom-section classroom-section--operations"
        id="classroom-dashboard"
        aria-label="Operating board"
      >
        <div className="classroom-section__header">
          <div className="classroom-section__header-text">
            <span className="classroom-section__eyebrow">Operations</span>
            <h3 className="classroom-section__title">Week, coverage, queues</h3>
          </div>
          <div className="classroom-section__chips" aria-label="Operations summary">
            <span className="classroom-section__chip">
              <strong>{forecastBlockCount}</strong> forecast blocks
            </span>
            <span className="classroom-section__chip classroom-section__chip--warning">
              <strong>{openItemCount ?? "—"}</strong> queue
            </span>
            <span className="classroom-section__chip">
              <strong>{watchCount}</strong> watch
            </span>
          </div>
        </div>
        <p className="classroom-section__caption classroom-section__caption--lede">
          Five-day view, student x support coverage, and pending teacher actions.
        </p>
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
          A real CSS grid: 2x2 at >=1180px, 1-col below.
          The card owns the frame; each visualization manages its own
          internal density and clipping.
          ============================================================ */}
      <details
        className="classroom-section classroom-section--surface classroom-zone--collapsible classroom-zone--insights"
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
        {intelDisclosure.open ? (
          <Suspense fallback={<SectionSkeleton label="Loading pattern intelligence" variant="story" lines={2} />}>
            <ClassroomIntelligenceGrid
              debtItems={result?.debt_register.items ?? []}
              previousDebtTotal={previousDebtTotal}
              debtTrendData={health.result?.trends?.debt_total_14d}
              students={studentSummaries.result ?? []}
              profileStudents={profile?.students ?? []}
              onOpenContext={setDrillDown}
            />
          </Suspense>
        ) : null}
      </details>

      {/* ============================================================
          ZONE 6 — ROSTER
          ============================================================ */}
      <details
        className="classroom-section classroom-section--surface classroom-zone--collapsible classroom-zone--roster"
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
          {rosterDisclosure.open && result ? (
            <Suspense fallback={<SectionSkeleton label="Loading roster" variant="story" lines={2} />}>
              <StudentRoster
                attentionCount={attentionStudents.size}
                onDrillDown={(context) => setDrillDown(context)}
              />
            </Suspense>
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
