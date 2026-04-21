import { getDb } from "./db.js";
import type { ClassroomId } from "../../packages/shared/schemas/branded.js";
import type { ClassroomProfile } from "../../packages/shared/schemas/classroom.js";
import type { ComplexityDebtRegister } from "../../packages/shared/schemas/debt.js";
import type { ComplexityForecast } from "../../packages/shared/schemas/forecast.js";
import type { TomorrowPlan } from "../../packages/shared/schemas/plan.js";
import type { StudentSummary } from "../../packages/shared/schemas/student-summary.js";

export type PanelStatusState =
  | "needs_action"
  | "draft_ready"
  | "fresh"
  | "stale"
  | "not_applicable";

export type PanelDependencyState = "ready" | "waiting" | "stale";

export interface PanelStatus {
  panel_id: string;
  label: string;
  state: PanelStatusState;
  dependency_state: PanelDependencyState;
  pending_count: number;
  detail: string;
  last_run_at: string | null;
}

export interface StudentThreadAction {
  category: string;
  label: string;
  count: number;
  target_tab: string;
  state: Extract<PanelStatusState, "needs_action" | "draft_ready" | "fresh">;
}

export interface StudentThread {
  alias: string;
  priority_reason: string | null;
  last_intervention_days: number | null;
  pending_action_count: number;
  pending_message_count: number;
  active_pattern_count: number;
  thread_count: number;
  eal_flag?: boolean;
  family_language?: string;
  support_tags?: string[];
  actions: StudentThreadAction[];
}

interface LatestGenerationMap {
  [panelId: string]: string | null;
}

function isWithinHours(timestamp: string | null, maxHours: number): boolean {
  if (!timestamp) return false;
  const ts = Date.parse(timestamp);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= maxHours * 60 * 60 * 1000;
}

function maxTimestamp(...values: Array<string | null | undefined>): string | null {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => b.localeCompare(a))[0] ?? null;
}

function getLatestGenerationTimes(classroomId: ClassroomId): LatestGenerationMap {
  const db = getDb(classroomId);
  const rows = db
    .prepare(`
      SELECT generations_triggered
      FROM sessions
      WHERE classroom_id = ?
    `)
    .all(classroomId) as { generations_triggered: string }[];

  const latest: LatestGenerationMap = {};
  for (const row of rows) {
    try {
      const generations = JSON.parse(row.generations_triggered) as Array<{
        panel_id?: string;
        timestamp?: string;
      }>;
      for (const generation of generations) {
        if (!generation.panel_id || !generation.timestamp) continue;
        const previous = latest[generation.panel_id];
        if (!previous || generation.timestamp > previous) {
          latest[generation.panel_id] = generation.timestamp;
        }
      }
    } catch {
      // Ignore malformed historical telemetry rows.
    }
  }

  return latest;
}

function getLatestRow<T extends Record<string, unknown>>(
  classroomId: ClassroomId,
  query: string,
): T | null {
  const db = getDb(classroomId);
  return (db.prepare(query).get(classroomId) as T | undefined) ?? null;
}

function buildDetail(state: PanelStatusState, base: string, fallback: string): string {
  switch (state) {
    case "needs_action":
      return base;
    case "draft_ready":
      return base;
    case "fresh":
      return base;
    case "stale":
      return base;
    case "not_applicable":
      return fallback;
  }
}

export function buildPanelStatuses(
  classroomId: ClassroomId,
  classroom: ClassroomProfile,
  register: ComplexityDebtRegister,
  latestPlan: TomorrowPlan | null,
  latestForecast: ComplexityForecast | null,
): PanelStatus[] {
  const latestGenerations = getLatestGenerationTimes(classroomId);
  const latestPlanRow = getLatestRow<{ created_at: string }>(
    classroomId,
    `
      SELECT created_at
      FROM generated_plans
      WHERE classroom_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `,
  );
  const latestForecastRow = getLatestRow<{ created_at: string }>(
    classroomId,
    `
      SELECT created_at
      FROM complexity_forecasts
      WHERE classroom_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `,
  );
  const latestPatternRow = getLatestRow<{ created_at: string }>(
    classroomId,
    `
      SELECT created_at
      FROM pattern_reports
      WHERE classroom_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `,
  );
  const latestInterventionRow = getLatestRow<{ created_at: string }>(
    classroomId,
    `
      SELECT created_at
      FROM interventions
      WHERE classroom_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `,
  );
  const latestMessageRow = getLatestRow<{ created_at: string; teacher_approved: number }>(
    classroomId,
    `
      SELECT created_at, teacher_approved
      FROM family_messages
      WHERE classroom_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `,
  );
  const latestPacketRow = getLatestRow<{ created_at: string }>(
    classroomId,
    `
      SELECT created_at
      FROM survival_packets
      WHERE classroom_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `,
  );

  const pendingMessages = register.item_count_by_category.unapproved_message ?? 0;
  const pendingFollowups = register.item_count_by_category.stale_followup ?? 0;
  const pendingPatterns =
    (register.item_count_by_category.unaddressed_pattern ?? 0) +
    (register.item_count_by_category.approaching_review ?? 0);

  const latestPlanAt = latestPlanRow?.created_at ?? null;
  const latestForecastAt = latestForecastRow?.created_at ?? null;
  const latestPatternAt = latestPatternRow?.created_at ?? null;
  const latestPacketAt = latestPacketRow?.created_at ?? null;
  const latestMessageAt = latestMessageRow?.created_at ?? null;
  const latestInterventionAt = latestInterventionRow?.created_at ?? null;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = tomorrow.toISOString().split("T")[0];
  const hasSchedule = (classroom.schedule?.length ?? 0) > 0;
  const planDependency = register.items.length > 0 ? "stale" : "ready";
  const forecastDependency = hasSchedule ? "ready" : "waiting";
  const handoffDependency: PanelDependencyState = latestPlan ? "ready" : "waiting";
  const loadDependency: PanelDependencyState = !hasSchedule
    ? "waiting"
    : latestForecast
      ? "ready"
      : "waiting";
  const packetDependency: PanelDependencyState = latestPlan && latestForecast
    ? "ready"
    : "waiting";

  const messageStatus: PanelStatusState = pendingMessages > 0
    ? "needs_action"
    : latestMessageRow && latestMessageRow.teacher_approved === 0
      ? "draft_ready"
      : latestMessageAt && isWithinHours(latestMessageAt, 24 * 7)
        ? "fresh"
        : latestMessageAt
          ? "stale"
          : "needs_action";

  const interventionStatus: PanelStatusState = pendingFollowups > 0
    ? "needs_action"
    : latestInterventionAt && isWithinHours(latestInterventionAt, 24 * 5)
      ? "fresh"
      : latestInterventionAt
        ? "stale"
        : "needs_action";

  const planStatus: PanelStatusState = !latestPlanAt
    ? "needs_action"
    : isWithinHours(latestPlanAt, 36)
      ? "fresh"
      : "stale";

  const forecastStatus: PanelStatusState = !hasSchedule
    ? "not_applicable"
    : !latestForecast
      ? "needs_action"
      : latestForecast.forecast_date === tomorrowIso
        ? "fresh"
        : "stale";

  const latestBriefingAt = latestGenerations["ea-briefing"] ?? null;
  const latestLoadAt = latestGenerations["ea-load"] ?? null;

  const eaBriefStatus: PanelStatusState = !latestPlan
    ? "not_applicable"
    : !latestBriefingAt
      ? "needs_action"
      : latestPlanAt && latestBriefingAt < latestPlanAt
        ? "stale"
        : isWithinHours(latestBriefingAt, 36)
          ? "fresh"
          : "stale";

  const eaLoadStatus: PanelStatusState = !hasSchedule
    ? "not_applicable"
    : !latestForecast
      ? "not_applicable"
      : !latestLoadAt
        ? "needs_action"
        : latestForecastAt && latestLoadAt < latestForecastAt
          ? "stale"
          : isWithinHours(latestLoadAt, 36)
            ? "fresh"
            : "stale";

  const packetStatus: PanelStatusState = !hasSchedule
    ? "not_applicable"
    : !latestPlan || !latestForecast
      ? "not_applicable"
      : !latestPacketAt
        ? "needs_action"
        : latestPacketAt < maxTimestamp(latestPlanAt, latestForecastAt)!
          ? "stale"
          : isWithinHours(latestPacketAt, 24 * 7)
            ? "fresh"
            : "stale";

  const patternStatus: PanelStatusState = pendingPatterns > 0
    ? "needs_action"
    : latestPatternAt && isWithinHours(latestPatternAt, 24 * 7)
      ? "fresh"
      : latestPatternAt
        ? "stale"
        : "needs_action";

  return [
    {
      panel_id: "family-message",
      label: "Message",
      state: messageStatus,
      dependency_state: "ready",
      pending_count: pendingMessages,
      detail: buildDetail(
        messageStatus,
        pendingMessages > 0
          ? `${pendingMessages} family updates waiting for approval`
          : latestMessageRow?.teacher_approved === 0
            ? "A family draft is ready for review"
            : latestMessageAt
              ? "Family communication is current"
              : "No recent family message yet",
        "Family communication is not in play right now",
      ),
      last_run_at: latestMessageAt,
    },
    {
      panel_id: "log-intervention",
      label: "Intervention",
      state: interventionStatus,
      dependency_state: "ready",
      pending_count: pendingFollowups,
      detail: buildDetail(
        interventionStatus,
        pendingFollowups > 0
          ? `${pendingFollowups} follow-up notes still need a touchpoint`
          : latestInterventionAt
            ? "Intervention log is current"
            : "No intervention history yet",
        "No intervention coverage needed right now",
      ),
      last_run_at: latestInterventionAt,
    },
    {
      panel_id: "support-patterns",
      label: "Patterns",
      state: patternStatus,
      dependency_state: pendingPatterns > 0 ? "stale" : "ready",
      pending_count: pendingPatterns,
      detail: buildDetail(
        patternStatus,
        pendingPatterns > 0
          ? `${pendingPatterns} pattern signals need review`
          : latestPatternAt
            ? "Pattern review is current"
            : "No pattern review captured yet",
        "Pattern review is not in play right now",
      ),
      last_run_at: latestPatternAt,
    },
    {
      panel_id: "tomorrow-plan",
      label: "Plan",
      state: planStatus,
      dependency_state: planDependency,
      pending_count: register.items.length,
      detail: buildDetail(
        planStatus,
        latestPlanAt
          ? "Tomorrow's support plan is available"
          : "Today's signal has not been turned into tomorrow's plan yet",
        "No planning dependency is active",
      ),
      last_run_at: latestPlanAt,
    },
    {
      panel_id: "complexity-forecast",
      label: "Forecast",
      state: forecastStatus,
      dependency_state: forecastDependency,
      pending_count: latestForecast?.blocks.filter((block) => block.level === "high").length ?? 0,
      detail: buildDetail(
        forecastStatus,
        !hasSchedule
          ? "Add a classroom schedule before forecasting tomorrow"
          : latestForecast
            ? `Forecast covers ${latestForecast.blocks.length} blocks for ${latestForecast.forecast_date}`
            : "Tomorrow's block-by-block forecast has not been generated yet",
        "Forecasting is not available without a schedule",
      ),
      last_run_at: latestForecastAt,
    },
    {
      panel_id: "ea-briefing",
      label: "EA Brief",
      state: eaBriefStatus,
      dependency_state: handoffDependency,
      pending_count: latestPlan?.ea_actions.length ?? 0,
      detail: buildDetail(
        eaBriefStatus,
        latestPlan
          ? `EA handoff has ${latestPlan.ea_actions.length} planned actions`
          : "Build tomorrow's plan before generating the briefing",
        "EA briefing is waiting on tomorrow's plan",
      ),
      last_run_at: latestBriefingAt,
    },
    {
      panel_id: "ea-load",
      label: "EA Load",
      state: eaLoadStatus,
      dependency_state: loadDependency,
      pending_count: classroom.schedule?.filter((block) => block.ea_available).length ?? 0,
      detail: buildDetail(
        eaLoadStatus,
        latestForecast
          ? "EA load can be balanced against tomorrow's forecast"
          : "Generate tomorrow's forecast before balancing EA load",
        "EA load balancing is waiting on forecastable schedule data",
      ),
      last_run_at: latestLoadAt,
    },
    {
      panel_id: "survival-packet",
      label: "Sub Packet",
      state: packetStatus,
      dependency_state: packetDependency,
      pending_count: latestPlan?.support_priorities.length ?? 0,
      detail: buildDetail(
        packetStatus,
        latestPacketAt
          ? "Substitute coverage packet is ready to hand off"
          : "Build the substitute packet once plan and forecast are current",
        "Sub packet is waiting on plan and forecast inputs",
      ),
      last_run_at: latestPacketAt,
    },
  ];
}

function pushAction(
  actions: StudentThreadAction[],
  next: StudentThreadAction,
): void {
  const existing = actions.find((action) => action.category === next.category && action.target_tab === next.target_tab);
  if (existing) {
    existing.count += next.count;
    return;
  }
  actions.push(next);
}

export function buildStudentThreads(
  classroom: ClassroomProfile,
  register: ComplexityDebtRegister,
  latestPlan: TomorrowPlan | null,
  summaries: StudentSummary[],
): StudentThread[] {
  const summaryByAlias = new Map(summaries.map((summary) => [summary.alias, summary]));
  const actionsByAlias = new Map<string, StudentThreadAction[]>();

  for (const item of register.items) {
    const target_tab = item.category === "unapproved_message"
      ? "family-message"
      : item.category === "stale_followup"
        ? "log-intervention"
        : "support-patterns";
    const label = item.category === "unapproved_message"
      ? "Family follow-up"
      : item.category === "stale_followup"
        ? "Follow-up note"
        : "Pattern review";
    for (const alias of item.student_refs) {
      const actions = actionsByAlias.get(alias) ?? [];
      pushAction(actions, {
        category: item.category,
        label,
        count: 1,
        target_tab,
        state: "needs_action",
      });
      actionsByAlias.set(alias, actions);
    }
  }

  if (latestPlan) {
    for (const priority of latestPlan.support_priorities) {
      const actions = actionsByAlias.get(priority.student_ref) ?? [];
      pushAction(actions, {
        category: "support_priority",
        label: "Plan priority",
        count: 1,
        target_tab: "tomorrow-plan",
        state: "draft_ready",
      });
      actionsByAlias.set(priority.student_ref, actions);
    }

    for (const followup of latestPlan.family_followups) {
      const actions = actionsByAlias.get(followup.student_ref) ?? [];
      pushAction(actions, {
        category: "family_followup",
        label: "Planned family follow-up",
        count: 1,
        target_tab: "family-message",
        state: "draft_ready",
      });
      actionsByAlias.set(followup.student_ref, actions);
    }

    for (const action of latestPlan.ea_actions) {
      for (const alias of action.student_refs) {
        const actions = actionsByAlias.get(alias) ?? [];
        pushAction(actions, {
          category: "ea_action",
          label: "EA handoff",
          count: 1,
          target_tab: "ea-briefing",
          state: "fresh",
        });
        actionsByAlias.set(alias, actions);
      }
    }
  }

  return classroom.students
    .map((student) => {
      const summary = summaryByAlias.get(student.alias);
      const actions = actionsByAlias.get(student.alias) ?? [];
      const thread_count = actions.reduce((total, action) => total + action.count, 0);

      return {
        alias: student.alias,
        priority_reason: summary?.latest_priority_reason ?? null,
        last_intervention_days: summary?.last_intervention_days ?? null,
        pending_action_count: summary?.pending_action_count ?? 0,
        pending_message_count: summary?.pending_message_count ?? 0,
        active_pattern_count: summary?.active_pattern_count ?? 0,
        thread_count,
        eal_flag: student.eal_flag,
        family_language: student.family_language,
        support_tags: student.support_tags,
        actions,
      };
    })
    .sort((a, b) => {
      const aScore =
        a.thread_count * 5 +
        a.pending_action_count * 3 +
        Math.min(a.last_intervention_days ?? 0, 14);
      const bScore =
        b.thread_count * 5 +
        b.pending_action_count * 3 +
        Math.min(b.last_intervention_days ?? 0, 14);
      if (bScore !== aScore) return bScore - aScore;
      return a.alias.localeCompare(b.alias);
    });
}
