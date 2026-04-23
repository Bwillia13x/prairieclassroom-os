import { useMemo } from "react";
import type { CSSProperties } from "react";
import {
  isActiveTab as isAppActiveTab,
  isActiveTool,
  isTabVisibleForRole,
  resolveLegacyPanel,
  type ActiveTool,
  type ClassroomRole,
  type NavTarget,
} from "../appReducer";
import type {
  ClassroomHealth,
  ClassroomProfile,
  ComplexityBlock,
  DrillDownContext,
  OperatingDashboardBlockLevel,
  OperatingDashboardCoverageCell,
  OperatingDashboardCoverageRow,
  OperatingDashboardDay,
  OperatingDashboardQueue,
  OperatingDashboardSnapshot,
  OperatingDashboardSource,
  OperatingDashboardTransitionRisk,
  PanelStatus,
  ScheduleBlockInput,
  StudentThread,
  TodaySnapshot,
  UpcomingEvent,
} from "../types";
import type { SessionSummary } from "../api";
import "./OperatingDashboard.css";

interface OperatingDashboardProps {
  snapshot: TodaySnapshot;
  profile: ClassroomProfile;
  health?: ClassroomHealth | null;
  sessionSummary?: Pick<SessionSummary, "transition_counts" | "terminal_counts" | "common_flows"> | null;
  activeRole: ClassroomRole;
  onNavigate: (target: NavTarget) => void;
  onOpenContext: (context: DrillDownContext) => void;
}

const SCHOOL_DAY_COUNT = 5;

const LEVEL_RANK: Record<OperatingDashboardBlockLevel, number> = {
  unknown: 0,
  low: 1,
  medium: 2,
  high: 3,
};

const COVERAGE_COLUMNS: OperatingDashboardCoverageCell["category"][] = [
  "touchpoint",
  "family",
  "eal",
  "support",
  "plan",
];

const COVERAGE_LABELS: Record<OperatingDashboardCoverageCell["category"], string> = {
  touchpoint: "Touch",
  family: "Family",
  eal: "EAL",
  support: "Support",
  plan: "Plan",
};

const CATEGORY_TARGET_TAB: Record<string, ActiveTool> = {
  unapproved_message: "family-message",
  family_followup: "family-message",
  stale_followup: "log-intervention",
  support_priority: "tomorrow-plan",
  ea_action: "ea-briefing",
};

function targetFromString(value: string | null | undefined): NavTarget | null {
  if (typeof value !== "string") return null;
  if (isAppActiveTab(value) || isActiveTool(value)) return value;
  return null;
}

function isVisibleTargetForRole(target: NavTarget | null, role: ClassroomRole): boolean {
  if (!target) return false;
  const hostTab = resolveLegacyPanel(target).tab;
  return isTabVisibleForRole(hostTab, role);
}

function resolveActionTarget(action: StudentThread["actions"][number]): NavTarget | null {
  return CATEGORY_TARGET_TAB[action.category] ?? targetFromString(action.target_tab);
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDateKey(value: string | undefined): string | null {
  if (!value) return null;
  const direct = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (direct) return direct;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : formatDateKey(parsed);
}

function nextSchoolDays(now = new Date(), count = SCHOOL_DAY_COUNT) {
  const days: { id: string; date: Date; label: string; date_label: string; is_today: boolean }[] = [];
  const cursor = new Date(now);
  cursor.setHours(12, 0, 0, 0);
  const todayKey = formatDateKey(cursor);

  while (days.length < count) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      const key = formatDateKey(cursor);
      days.push({
        id: key,
        date: new Date(cursor),
        label: cursor.toLocaleDateString(undefined, { weekday: "short" }),
        date_label: cursor.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        is_today: key === todayKey,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function eventMatchesDay(event: UpcomingEvent, dayId: string): boolean {
  const key = normalizeDateKey(event.event_date);
  return key === dayId;
}

function eventMatchesBlock(event: UpcomingEvent, block: { time_slot: string; activity: string }): boolean {
  if (!event.time_slot) return true;
  const eventText = event.time_slot.toLowerCase();
  const blockText = `${block.time_slot} ${block.activity}`.toLowerCase();
  return blockText.includes(eventText) || eventText.includes(block.time_slot.toLowerCase());
}

function blockFromSchedule(
  dayId: string,
  block: ScheduleBlockInput,
  index: number,
  dayEvents: UpcomingEvent[],
): OperatingDashboardDay["blocks"][number] {
  const matchingEvents = dayEvents.filter((event) => eventMatchesBlock(event, block));
  if (matchingEvents.length > 0) {
    return {
      id: `${dayId}-schedule-${index}`,
      day_id: dayId,
      time_slot: block.time_slot,
      activity: block.activity,
      level: "medium",
      source: "event",
      detail: matchingEvents.map((event) => event.impacts ?? event.description).join(" · "),
      event_count: matchingEvents.length,
    };
  }

  return {
    id: `${dayId}-schedule-${index}`,
    day_id: dayId,
    time_slot: block.time_slot,
    activity: block.activity,
    level: "unknown",
    source: "schedule",
    detail: block.notes ?? "Schedule-only block. Generate a forecast for risk detail.",
  };
}

function blockFromForecast(dayId: string, block: ComplexityBlock, index: number): OperatingDashboardDay["blocks"][number] {
  return {
    id: `${dayId}-forecast-${index}`,
    day_id: dayId,
    time_slot: block.time_slot,
    activity: block.activity,
    level: block.level,
    source: "forecast",
    detail: block.contributing_factors[0] ?? block.suggested_mitigation,
    forecast_index: index,
  };
}

function buildWeekOverview(snapshot: TodaySnapshot, profile: ClassroomProfile): OperatingDashboardDay[] {
  const forecastDate = normalizeDateKey(snapshot.latest_forecast?.forecast_date);
  const baseSchedule = profile.schedule?.length
    ? profile.schedule
    : snapshot.latest_forecast?.blocks.map((block) => ({
        time_slot: block.time_slot,
        activity: block.activity,
        ea_available: false,
      })) ?? [];

  return nextSchoolDays().map((day) => {
    const dayEvents = (profile.upcoming_events ?? []).filter((event) => eventMatchesDay(event, day.id));
    const forecastApplies = Boolean(snapshot.latest_forecast && forecastDate === day.id);
    const blocks = forecastApplies && snapshot.latest_forecast
      ? snapshot.latest_forecast.blocks.map((block, index) => blockFromForecast(day.id, block, index))
      : baseSchedule.map((block, index) => blockFromSchedule(day.id, block, index, dayEvents));

    if (blocks.length === 0) {
      return {
        id: day.id,
        label: day.label,
        date_label: day.date_label,
        is_today: day.is_today,
        source: "insufficient_data",
        blocks: [{
          id: `${day.id}-empty`,
          day_id: day.id,
          time_slot: "No schedule",
          activity: "Add a classroom schedule",
          level: "unknown",
          source: "insufficient_data",
          detail: "No schedule or forecast is available for this day.",
        }],
      };
    }

    return {
      id: day.id,
      label: day.label,
      date_label: day.date_label,
      is_today: day.is_today,
      source: forecastApplies ? "forecast" : dayEvents.length > 0 ? "event" : "schedule",
      blocks,
    };
  });
}

function hasActionForTarget(thread: StudentThread | null, targets: NavTarget[]): boolean {
  if (!thread) return false;
  return thread.actions.some((action) => {
    const target = resolveActionTarget(action);
    return target ? targets.includes(target) : false;
  });
}

function actionCountForTarget(thread: StudentThread | null, targets: NavTarget[]): number {
  if (!thread) return 0;
  return thread.actions.reduce((total, action) => {
    const target = resolveActionTarget(action);
    return target && targets.includes(target) ? total + action.count : total;
  }, 0);
}

function buildCoverageCells(
  thread: StudentThread | null,
  student: ClassroomProfile["students"][number] | null,
): OperatingDashboardCoverageCell[] {
  const staleTouch = thread?.last_intervention_days === null || (thread?.last_intervention_days ?? 0) >= 7;
  const familyCount = thread?.pending_message_count ?? actionCountForTarget(thread, ["family-message"]);
  const supportCount = thread?.active_pattern_count ?? 0;
  const planCount = actionCountForTarget(thread, ["tomorrow-plan", "ea-briefing", "ea-load"]);
  const ealFlag = Boolean(thread?.eal_flag ?? student?.eal_flag);
  const supportTags = thread?.support_tags ?? student?.support_tags ?? [];
  const cells: OperatingDashboardCoverageCell[] = [
    {
      category: "touchpoint",
      label: COVERAGE_LABELS.touchpoint,
      state: hasActionForTarget(thread, ["log-intervention"]) ? "open" : staleTouch ? "watch" : "covered",
      count: actionCountForTarget(thread, ["log-intervention"]),
      detail: staleTouch
        ? "No recent intervention touchpoint is visible."
        : "Recent intervention touchpoint is visible.",
      target_tab: "log-intervention",
    },
    {
      category: "family",
      label: COVERAGE_LABELS.family,
      state: familyCount > 0 ? "open" : thread?.family_language || student?.family_language ? "watch" : "not_applicable",
      count: familyCount,
      detail: familyCount > 0
        ? "Family communication is waiting."
        : thread?.family_language || student?.family_language
          ? "Language preference is visible for future family communication."
          : "No family communication signal is active.",
      target_tab: "family-message",
    },
    {
      category: "eal",
      label: COVERAGE_LABELS.eal,
      state: ealFlag ? "watch" : "not_applicable",
      count: ealFlag ? 1 : 0,
      detail: ealFlag ? "EAL support should remain visible in planning." : "No EAL flag is visible.",
      target_tab: "language-tools",
    },
    {
      category: "support",
      label: COVERAGE_LABELS.support,
      state: supportCount > 0 ? "open" : supportTags.length > 0 ? "watch" : "covered",
      count: supportCount || supportTags.length,
      detail: supportCount > 0
        ? "Active support pattern evidence is waiting for review."
        : supportTags.length > 0
          ? `Support tags: ${supportTags.slice(0, 2).join(", ")}`
          : "No open support pattern signal.",
      target_tab: "support-patterns",
    },
    {
      category: "plan",
      label: COVERAGE_LABELS.plan,
      state: planCount > 0 ? "open" : (thread?.pending_action_count ?? 0) > 0 ? "watch" : "covered",
      count: planCount,
      detail: planCount > 0
        ? "Planning or handoff action is open."
        : "No current planning action for this student.",
      target_tab: "tomorrow-plan",
    },
  ];
  return cells;
}

function coverageScore(row: OperatingDashboardCoverageRow): number {
  return row.cells.reduce((score, cell) => {
    if (cell.state === "open") return score + 8 + cell.count;
    if (cell.state === "watch") return score + 3 + cell.count;
    return score;
  }, row.thread_count);
}

function buildSupportCoverage(snapshot: TodaySnapshot, profile: ClassroomProfile): OperatingDashboardCoverageRow[] {
  const threadByAlias = new Map((snapshot.student_threads ?? []).map((thread) => [thread.alias, thread]));
  const aliases = new Set<string>([
    ...profile.students.map((student) => student.alias),
    ...(snapshot.student_threads ?? []).map((thread) => thread.alias),
  ]);

  return [...aliases].map((alias) => {
    const student = profile.students.find((entry) => entry.alias === alias) ?? null;
    const thread = threadByAlias.get(alias) ?? null;
    return {
      alias,
      priority_reason: thread?.priority_reason ?? null,
      thread_count: thread?.thread_count ?? 0,
      eal_flag: thread?.eal_flag ?? student?.eal_flag,
      family_language: thread?.family_language ?? student?.family_language,
      support_tags: thread?.support_tags ?? student?.support_tags,
      cells: buildCoverageCells(thread, student),
      thread: thread ?? undefined,
    };
  }).sort((a, b) => coverageScore(b) - coverageScore(a) || a.alias.localeCompare(b.alias)).slice(0, 10);
}

function queueFromStatus(
  status: PanelStatus | undefined,
  fallback: Omit<OperatingDashboardQueue, "state" | "count" | "detail"> & {
    count: number;
    state?: OperatingDashboardQueue["state"];
    detail: string;
  },
): OperatingDashboardQueue {
  return {
    ...fallback,
    count: status?.pending_count ?? fallback.count,
    state: status?.state ?? fallback.state ?? (fallback.count > 0 ? "needs_action" : "clear"),
    detail: status?.detail ?? fallback.detail,
    status,
  };
}

function buildQueues(snapshot: TodaySnapshot): Pick<OperatingDashboardSnapshot, "communication_queue" | "prep_queue"> {
  const statuses = new Map((snapshot.panel_statuses ?? []).map((status) => [status.panel_id, status]));
  const counts = snapshot.debt_register.item_count_by_category;
  const familyFollowups = snapshot.latest_plan?.family_followups.length ?? 0;
  const prepItems = snapshot.latest_plan?.prep_checklist.length ?? 0;

  return {
    communication_queue: [
      queueFromStatus(statuses.get("family-message"), {
        id: "family-message",
        label: "Family messages",
        count: counts.unapproved_message ?? 0,
        target_tab: "family-message",
        detail: "Drafts and approvals waiting for teacher review.",
      }),
      {
        id: "family-followups",
        label: "Plan follow-ups",
        count: familyFollowups,
        state: familyFollowups > 0 ? "draft_ready" : "clear",
        target_tab: "tomorrow-plan",
        detail: familyFollowups > 0
          ? "Tomorrow Plan includes family follow-ups that may need drafting."
          : "No family follow-ups are currently attached to the plan.",
      },
    ],
    prep_queue: [
      queueFromStatus(statuses.get("tomorrow-plan"), {
        id: "tomorrow-plan",
        label: "Tomorrow plan",
        count: snapshot.latest_plan ? 0 : 1,
        state: snapshot.latest_plan ? "fresh" : "waiting",
        target_tab: "tomorrow-plan",
        detail: snapshot.latest_plan ? "Latest plan is available." : "Generate a plan to seed prep coverage.",
      }),
      {
        id: "prep-items",
        label: "Prep items",
        count: prepItems,
        state: prepItems > 0 ? "draft_ready" : "clear",
        target_tab: "tomorrow-plan",
        detail: prepItems > 0 ? "Materials or setup items are waiting inside the plan." : "No prep checklist items are visible.",
      },
      queueFromStatus(statuses.get("complexity-forecast"), {
        id: "complexity-forecast",
        label: "Forecast",
        count: snapshot.latest_forecast ? 0 : 1,
        state: snapshot.latest_forecast ? "fresh" : "waiting",
        target_tab: "complexity-forecast",
        detail: snapshot.latest_forecast ? "Forecast is available." : "Generate forecast to populate risk timing.",
      }),
      queueFromStatus(statuses.get("ea-briefing"), {
        id: "ea-briefing",
        label: "EA brief",
        count: 0,
        state: "waiting",
        target_tab: "ea-briefing",
        detail: "EA handoff waits on plan and forecast context.",
      }),
      queueFromStatus(statuses.get("survival-packet"), {
        id: "survival-packet",
        label: "Sub packet",
        count: 0,
        state: "waiting",
        target_tab: "survival-packet",
        detail: "Substitute packet waits on teacher approval.",
      }),
    ],
  };
}

function watchpointMatchesBlock(block: ComplexityBlock, watchpoint: { time_or_activity: string }) {
  const blockText = `${block.time_slot} ${block.activity}`.toLowerCase();
  const watchText = watchpoint.time_or_activity.toLowerCase();
  return blockText.includes(watchText) || watchText.includes(block.activity.toLowerCase()) || watchText.includes(block.time_slot.toLowerCase());
}

function buildTransitionRisks(snapshot: TodaySnapshot): OperatingDashboardTransitionRisk[] {
  const risks: OperatingDashboardTransitionRisk[] = [];
  const watchpoints = snapshot.latest_plan?.transition_watchpoints ?? [];

  snapshot.latest_forecast?.blocks.forEach((block, index) => {
    const matches = watchpoints.filter((watchpoint) => watchpointMatchesBlock(block, watchpoint));
    if (block.level !== "low" || matches.length > 0) {
      risks.push({
        id: `forecast-${index}`,
        time_slot: block.time_slot,
        activity: block.activity,
        level: block.level,
        reason: block.contributing_factors[0] ?? block.suggested_mitigation,
        mitigation: block.suggested_mitigation,
        watchpoints: matches.map((watchpoint) => watchpoint.risk_description),
        target_tab: "complexity-forecast",
        forecast_index: index,
      });
    }
  });

  watchpoints.forEach((watchpoint, index) => {
    const alreadyCovered = snapshot.latest_forecast?.blocks.some((block) => watchpointMatchesBlock(block, watchpoint));
    if (alreadyCovered) return;
    risks.push({
      id: `watchpoint-${index}`,
      time_slot: watchpoint.time_or_activity,
      activity: watchpoint.time_or_activity,
      level: "medium",
      reason: watchpoint.risk_description,
      mitigation: watchpoint.suggested_mitigation,
      watchpoints: [watchpoint.risk_description],
      target_tab: "tomorrow-plan",
    });
  });

  return risks
    .sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level] || a.time_slot.localeCompare(b.time_slot))
    .slice(0, 6);
}

function buildOutcomeMetrics(
  sessionSummary: Pick<SessionSummary, "transition_counts" | "terminal_counts"> | null | undefined,
): OperatingDashboardSnapshot["outcome_metrics"] {
  const transitions = sessionSummary?.transition_counts ?? [];
  const terminals = sessionSummary?.terminal_counts ?? [];
  return {
    today_exits: transitions
      .filter((transition) => transition.from_panel === "today")
      .reduce((total, transition) => total + transition.count, 0),
    return_loops: transitions
      .filter((transition) => transition.to_panel === "today" && transition.from_panel !== "today")
      .reduce((total, transition) => total + transition.count, 0),
    session_endings: terminals.reduce((total, terminal) => total + terminal.count, 0),
  };
}

export function buildOperatingDashboardSnapshot(
  snapshot: TodaySnapshot,
  profile: ClassroomProfile,
  sessionSummary?: Pick<SessionSummary, "transition_counts" | "terminal_counts"> | null,
): OperatingDashboardSnapshot {
  return {
    week_overview: buildWeekOverview(snapshot, profile),
    support_coverage: buildSupportCoverage(snapshot, profile),
    ...buildQueues(snapshot),
    transition_risks: buildTransitionRisks(snapshot),
    outcome_metrics: buildOutcomeMetrics(sessionSummary),
  };
}

function formatSource(source: OperatingDashboardSource) {
  switch (source) {
    case "forecast":
      return "forecast";
    case "event":
      return "event";
    case "schedule":
      return "schedule";
    case "insufficient_data":
      return "insufficient data";
  }
}

function stateLabel(state: OperatingDashboardQueue["state"] | OperatingDashboardCoverageCell["state"]) {
  return state.replace(/_/g, " ");
}

function queueMax(queues: OperatingDashboardQueue[]) {
  return Math.max(1, ...queues.map((queue) => queue.count));
}

export default function OperatingDashboard({
  snapshot,
  profile,
  health,
  sessionSummary,
  activeRole,
  onNavigate,
  onOpenContext,
}: OperatingDashboardProps) {
  const dashboard = useMemo(
    () => buildOperatingDashboardSnapshot(snapshot, profile, sessionSummary),
    [profile, sessionSummary, snapshot],
  );
  const highRiskCount = dashboard.week_overview.reduce(
    (total, day) => total + day.blocks.filter((block) => block.level === "high").length,
    0,
  );
  const openCoverageCount = dashboard.support_coverage.reduce(
    (total, row) => total + row.cells.filter((cell) => cell.state === "open").length,
    0,
  );
  const queueCount = [...dashboard.communication_queue, ...dashboard.prep_queue]
    .reduce((total, queue) => total + queue.count, 0);
  const debtTrend = health?.trends?.debt_total_14d ?? [];
  const latestDebt = debtTrend[debtTrend.length - 1] ?? snapshot.debt_register.items.length;
  const previousDebt = debtTrend.length > 1 ? debtTrend[debtTrend.length - 2] : latestDebt;
  const debtDelta = latestDebt - previousDebt;

  function navigateIfVisible(tabRaw: string | null) {
    const target = targetFromString(tabRaw);
    if (target && isVisibleTargetForRole(target, activeRole)) {
      onNavigate(target);
    }
  }

  return (
    <section className="operating-dashboard" aria-labelledby="operating-dashboard-heading">
      <header className="operating-dashboard__header">
        <div>
          <span className="operating-dashboard__eyebrow">Operating dashboard</span>
          <h2 id="operating-dashboard-heading" className="operating-dashboard__title">Week, coverage, queues</h2>
        </div>
        <div className="operating-dashboard__metrics" aria-label="Operating dashboard metrics">
          <span><strong>{highRiskCount}</strong> high blocks</span>
          <span><strong>{openCoverageCount}</strong> open coverage cells</span>
          <span><strong>{queueCount}</strong> queued items</span>
          <span><strong>{debtDelta > 0 ? `+${debtDelta}` : debtDelta}</strong> debt delta</span>
        </div>
      </header>

      <div className="operating-dashboard__band operating-dashboard__band--week">
        <div className="operating-dashboard__band-header">
          <h3>This Week</h3>
          <p>Forecasted days use AI risk levels; the rest stays schedule- or event-seeded.</p>
        </div>
        <div
          className="week-heatmap"
          style={{ "--op-day-count": dashboard.week_overview.length } as CSSProperties}
        >
          {dashboard.week_overview.map((day) => (
            <div key={day.id} className={`week-heatmap__day week-heatmap__day--${day.source}`}>
              <button
                type="button"
                className="week-heatmap__day-head"
                onClick={() => onOpenContext({ type: "week-day", day })}
                aria-label={`Open dashboard details for ${day.label} ${day.date_label}`}
              >
                <span>{day.label}</span>
                <strong>{day.date_label}</strong>
                {day.is_today ? <em>Today</em> : null}
              </button>
              <div className="week-heatmap__cells">
                {day.blocks.map((block) => (
                  <button
                    key={block.id}
                    type="button"
                    className={`week-heatmap__cell week-heatmap__cell--${block.level} week-heatmap__cell--${block.source}`}
                    onClick={() => {
                      if (typeof block.forecast_index === "number" && snapshot.latest_forecast?.blocks[block.forecast_index]) {
                        onOpenContext({
                          type: "forecast-block",
                          blockIndex: block.forecast_index,
                          block: snapshot.latest_forecast.blocks[block.forecast_index],
                        });
                        return;
                      }
                      onOpenContext({ type: "week-day", day });
                    }}
                    aria-label={`${day.label} ${block.time_slot}, ${block.activity}: ${block.level} from ${formatSource(block.source)}`}
                    title={block.detail}
                  >
                    <span>{block.time_slot}</span>
                    <strong>{block.activity}</strong>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="operating-dashboard__split">
        <div className="operating-dashboard__band operating-dashboard__band--coverage">
          <div className="operating-dashboard__band-header">
            <h3>Coverage</h3>
            <p>Student x support category, sorted by open or watch signals.</p>
          </div>
          <div
            className="support-coverage-grid"
            style={{ "--coverage-column-count": COVERAGE_COLUMNS.length } as CSSProperties}
          >
            <div className="support-coverage-grid__corner">Student</div>
            {COVERAGE_COLUMNS.map((category) => (
              <div key={category} className="support-coverage-grid__heading">{COVERAGE_LABELS[category]}</div>
            ))}
            {dashboard.support_coverage.map((row) => (
              <div key={row.alias} className="support-coverage-grid__row">
                <button
                  type="button"
                  className="support-coverage-grid__student"
                  onClick={() => {
                    if (row.thread) onOpenContext({ type: "student-thread", thread: row.thread });
                    else onOpenContext({ type: "student", alias: row.alias });
                  }}
                >
                  <strong>{row.alias}</strong>
                  <span>{row.priority_reason ?? `${row.thread_count} active threads`}</span>
                </button>
                {row.cells.map((cell) => {
                  const targetTab = targetFromString(cell.target_tab);
                  const hidden = targetTab ? !isVisibleTargetForRole(targetTab, activeRole) : false;
                  return (
                    <button
                      key={`${row.alias}-${cell.category}`}
                      type="button"
                      className={`support-coverage-grid__cell support-coverage-grid__cell--${cell.state}${hidden ? " support-coverage-grid__cell--hidden" : ""}`}
                      onClick={() => onOpenContext({ type: "coverage-cell", row, cell })}
                      aria-label={`${row.alias} ${cell.label}: ${cell.detail}`}
                      title={hidden ? "Hidden for current role" : cell.detail}
                    >
                      <span>{stateLabel(cell.state)}</span>
                      <strong>{cell.count || "—"}</strong>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="operating-dashboard__band operating-dashboard__band--queues">
          <div className="operating-dashboard__band-header">
            <h3>Queues</h3>
            <p>Communication and prep work waiting on a teacher move.</p>
          </div>
          <QueueLane
            title="Family communication"
            queues={dashboard.communication_queue}
            activeRole={activeRole}
            onOpenContext={onOpenContext}
            onNavigate={navigateIfVisible}
          />
          <QueueLane
            title="Prep load"
            queues={dashboard.prep_queue}
            activeRole={activeRole}
            onOpenContext={onOpenContext}
            onNavigate={navigateIfVisible}
          />
          <div className="operating-dashboard__outcome">
            <span>{dashboard.outcome_metrics.today_exits} after-Today moves</span>
            <span>{dashboard.outcome_metrics.return_loops} return loops</span>
            <span>{dashboard.outcome_metrics.session_endings} recorded endings</span>
          </div>
        </div>
      </div>

      <div className="operating-dashboard__band operating-dashboard__band--risks">
        <div className="operating-dashboard__band-header">
          <h3>Transition Risks</h3>
          <p>Forecast and plan signals that need staging before the block starts.</p>
        </div>
        {dashboard.transition_risks.length > 0 ? (
          <div className="transition-risk-strip">
            {dashboard.transition_risks.map((risk) => (
              <button
                key={risk.id}
                type="button"
                className={`transition-risk-strip__item transition-risk-strip__item--${risk.level}`}
                aria-label={`Transition risk ${risk.time_slot} ${risk.activity}: ${risk.reason}`}
                onClick={() => onOpenContext({ type: "transition-risk", risk })}
              >
                <span>{risk.time_slot}</span>
                <strong>{risk.activity}</strong>
                <em>{risk.reason}</em>
              </button>
            ))}
          </div>
        ) : (
          <div className="operating-dashboard__empty">
            No transition risk signal yet. Generate a forecast or Tomorrow Plan to populate this strip.
          </div>
        )}
      </div>
    </section>
  );
}

interface QueueLaneProps {
  title: string;
  queues: OperatingDashboardQueue[];
  activeRole: ClassroomRole;
  onOpenContext: (context: DrillDownContext) => void;
  onNavigate: (tab: string | null) => void;
}

function QueueLane({ title, queues, activeRole, onOpenContext, onNavigate }: QueueLaneProps) {
  const max = queueMax(queues);

  return (
    <section className="queue-lane" aria-label={title}>
      <div className="queue-lane__header">
        <h4>{title}</h4>
      </div>
      <div className="queue-lane__items">
        {queues.map((queue) => {
          const targetTab = targetFromString(queue.target_tab);
          const hidden = targetTab ? !isVisibleTargetForRole(targetTab, activeRole) : false;
          return (
            <button
              key={queue.id}
              type="button"
              className={`queue-lane__item queue-lane__item--${queue.state}${hidden ? " queue-lane__item--hidden" : ""}`}
              onClick={() => onOpenContext({ type: "queue-state", queue })}
              onDoubleClick={() => {
                if (!hidden) onNavigate(queue.target_tab);
              }}
              aria-label={`${queue.label}: ${queue.count} queued, ${queue.detail}`}
              title={hidden ? "Hidden for current role" : queue.detail}
            >
              <span className="queue-lane__label">{queue.label}</span>
              <span className="queue-lane__bar" aria-hidden="true">
                <span style={{ width: `${Math.max(8, (queue.count / max) * 100)}%` }} />
              </span>
              <strong>{queue.count}</strong>
            </button>
          );
        })}
      </div>
    </section>
  );
}
