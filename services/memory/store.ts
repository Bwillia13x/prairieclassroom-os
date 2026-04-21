// services/memory/store.ts
import { getDb } from "./db.js";
import type { ClassroomId } from "../../packages/shared/schemas/branded.js";
import type { TomorrowPlan } from "../../packages/shared/schemas/plan.js";
import type { DifferentiatedVariant } from "../../packages/shared/schemas/artifact.js";
import type { FamilyMessageDraft } from "../../packages/shared/schemas/message.js";
import type { InterventionRecord } from "../../packages/shared/schemas/intervention.js";
import type { SupportPatternReport } from "../../packages/shared/schemas/pattern.js";
import type { ComplexityForecast } from "../../packages/shared/schemas/forecast.js";
import type { ScaffoldDecayReport } from "../../packages/shared/schemas/scaffold-decay.js";
import type { SurvivalPacket } from "../../packages/shared/schemas/survival-packet.js";
import type { FeedbackRequest, FeedbackSummary } from "../../packages/shared/schemas/feedback.js";
import type { SessionRequest, SessionSummary } from "../../packages/shared/schemas/session.js";
import type { RunTool } from "../../packages/shared/schemas/run.js";
import { RUN_RETENTION_LIMIT } from "../../packages/shared/schemas/run.js";

interface SessionRow {
  started_at: string;
  panels_visited: string;
  generations_triggered: string;
}

interface FlowAggregate {
  sequence: string[];
  count: number;
  last_seen_at: string;
}

const TODAY_NUDGE_SEQUENCE_LIMIT = 4;

function getUtcIsoWeekKey(date: Date): string {
  const working = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = working.getUTCDay() || 7;
  working.setUTCDate(working.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(working.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor((working.getTime() - yearStart.getTime()) / 86400000) + 1;
  const week = Math.ceil(dayOfYear / 7);
  return `${working.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function trackFlow(
  flowCounts: Map<string, FlowAggregate>,
  sequence: string[],
  startedAt: string,
): void {
  const key = sequence.join(" -> ");
  const existing = flowCounts.get(key);
  if (existing) {
    existing.count += 1;
    if (startedAt > existing.last_seen_at) {
      existing.last_seen_at = startedAt;
    }
    return;
  }
  flowCounts.set(key, {
    sequence,
    count: 1,
    last_seen_at: startedAt,
  });
}

function pickTopFlow(flowCounts: Map<string, FlowAggregate>): { sequence: string[]; count: number } | null {
  const ranked = [...flowCounts.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (b.last_seen_at !== a.last_seen_at) return b.last_seen_at.localeCompare(a.last_seen_at);
    if (b.sequence.length !== a.sequence.length) return b.sequence.length - a.sequence.length;
    return a.sequence.join(" -> ").localeCompare(b.sequence.join(" -> "));
  });

  if (ranked.length === 0) return null;
  return {
    sequence: ranked[0].sequence,
    count: ranked[0].count,
  };
}

function getTodayNudgeSequence(panels: string[]): string[] | null {
  if (panels[0] !== "today") return null;

  const sequence: string[] = [];
  const seen = new Set<string>();

  for (const panel of panels) {
    if (!panel) continue;
    if (sequence.length > 0 && panel === "today") break;
    if (seen.has(panel)) break;

    sequence.push(panel);
    seen.add(panel);

    if (sequence.length >= TODAY_NUDGE_SEQUENCE_LIMIT) break;
  }

  return sequence.length >= 2 ? sequence : null;
}

export function savePlan(
  classroomId: ClassroomId,
  plan: TomorrowPlan,
  teacherReflection: string,
  modelId: string,
): void {
  const db = getDb(classroomId);
  db.prepare(`
    INSERT OR REPLACE INTO generated_plans
    (plan_id, classroom_id, teacher_reflection, plan_json, model_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    plan.plan_id,
    classroomId,
    teacherReflection,
    JSON.stringify(plan),
    modelId,
    new Date().toISOString(),
  );
}

export function saveVariants(
  classroomId: ClassroomId,
  variants: DifferentiatedVariant[],
  modelId: string,
): void {
  const db = getDb(classroomId);
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO generated_variants
    (variant_id, artifact_id, classroom_id, variant_json, model_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();
  const insertAll = db.transaction(() => {
    for (const v of variants) {
      stmt.run(v.variant_id, v.artifact_id, classroomId, JSON.stringify(v), modelId, now);
    }
  });
  insertAll();
}

export function saveFamilyMessage(
  classroomId: ClassroomId,
  draft: FamilyMessageDraft,
  _modelId: string,
): void {
  const db = getDb(classroomId);
  db.prepare(`
    INSERT OR REPLACE INTO family_messages
    (draft_id, classroom_id, student_refs, message_json, teacher_approved, created_at)
    VALUES (?, ?, ?, ?, 0, ?)
  `).run(
    draft.draft_id,
    classroomId,
    JSON.stringify(draft.student_refs),
    JSON.stringify(draft),
    new Date().toISOString(),
  );
}

export function approveFamilyMessage(
  classroomId: ClassroomId,
  draftId: string,
  editedText?: string,
): void {
  const db = getDb(classroomId);
  const now = new Date().toISOString();
  // SQLite's json_set updates a field inside the message_json blob in place.
  // When editedText is undefined we leave message_json untouched (operator
  // approved the AI draft verbatim). When provided, we persist it inside the
  // draft JSON so future reads (history, MessageDraft) can prefer it over
  // plain_language_text for display.
  if (editedText === undefined) {
    db.prepare(`
      UPDATE family_messages
      SET teacher_approved = 1, approval_timestamp = ?
      WHERE draft_id = ?
    `).run(now, draftId);
  } else {
    db.prepare(`
      UPDATE family_messages
      SET teacher_approved = 1,
          approval_timestamp = ?,
          message_json = json_set(message_json, '$.edited_text', ?)
      WHERE draft_id = ?
    `).run(now, editedText, draftId);
  }
}

export function saveIntervention(
  classroomId: ClassroomId,
  record: InterventionRecord,
  modelId: string,
): void {
  const db = getDb(classroomId);
  db.prepare(`
    INSERT OR REPLACE INTO interventions
    (record_id, classroom_id, student_refs, record_json, model_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    record.record_id,
    classroomId,
    JSON.stringify(record.student_refs),
    JSON.stringify(record),
    modelId,
    record.created_at ?? new Date().toISOString(),
  );
}

export function savePatternReport(
  classroomId: ClassroomId,
  report: SupportPatternReport,
  modelId: string,
): void {
  const db = getDb(classroomId);
  db.prepare(`
    INSERT OR REPLACE INTO pattern_reports
    (report_id, classroom_id, student_filter, report_json, model_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    report.report_id,
    classroomId,
    report.student_filter,
    JSON.stringify(report),
    modelId,
    new Date().toISOString(),
  );
}

export function saveForecast(
  classroomId: ClassroomId,
  forecast: ComplexityForecast,
  modelId: string,
): void {
  const db = getDb(classroomId);
  db.prepare(`
    INSERT OR REPLACE INTO complexity_forecasts
    (forecast_id, classroom_id, forecast_date, forecast_json, model_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    forecast.forecast_id,
    classroomId,
    forecast.forecast_date,
    JSON.stringify(forecast),
    modelId,
    new Date().toISOString(),
  );
}

export function saveScaffoldReview(
  classroomId: ClassroomId,
  report: ScaffoldDecayReport,
  modelId: string,
): void {
  const db = getDb(classroomId);
  db.prepare(`
    INSERT OR REPLACE INTO scaffold_reviews
    (report_id, classroom_id, student_ref, report_json, model_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    report.report_id,
    classroomId,
    report.student_ref,
    JSON.stringify(report),
    modelId,
    new Date().toISOString(),
  );
}

export function saveSurvivalPacket(
  classroomId: ClassroomId,
  packet: SurvivalPacket,
  modelId: string,
): void {
  const db = getDb(classroomId);
  db.prepare(`
    INSERT OR REPLACE INTO survival_packets
    (packet_id, classroom_id, generated_for_date, packet_json, model_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    packet.packet_id,
    classroomId,
    packet.generated_for_date,
    JSON.stringify(packet),
    modelId,
    new Date().toISOString(),
  );
}

// ---------------------------------------------------------------------------
// Feedback & Session store functions (evidence instrumentation)
// ---------------------------------------------------------------------------

export function saveFeedback(
  classroomId: ClassroomId,
  record: FeedbackRequest & { id: string },
): void {
  const db = getDb(classroomId);
  db.prepare(`
    INSERT OR REPLACE INTO feedback
    (id, classroom_id, panel_id, prompt_class, rating, comment, generation_id, session_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    record.id,
    record.classroom_id,
    record.panel_id,
    record.prompt_class ?? null,
    record.rating,
    record.comment ?? null,
    record.generation_id ?? null,
    record.session_id ?? null,
    new Date().toISOString(),
  );
}

export function saveSession(
  classroomId: ClassroomId,
  record: SessionRequest & { id: string },
): void {
  const db = getDb(classroomId);
  db.prepare(`
    INSERT OR REPLACE INTO sessions
    (id, classroom_id, started_at, ended_at, panels_visited, generations_triggered, feedback_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    record.id,
    record.classroom_id,
    record.started_at,
    record.ended_at,
    JSON.stringify(record.panels_visited),
    JSON.stringify(record.generations_triggered),
    record.feedback_count,
    new Date().toISOString(),
  );
}

// ---------------------------------------------------------------------------
// Prep run history (differentiate / simplify / vocab chip row)
// ---------------------------------------------------------------------------

export interface SaveRunInput {
  run_id: string;
  tool: RunTool;
  label: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

/**
 * Upsert a single run row, then prune anything older than the retention
 * window for the (classroom, tool) pair. Retention is enforced synchronously
 * so the table never grows unbounded even if no separate cron runs.
 */
export function saveRun(classroomId: ClassroomId, input: SaveRunInput): void {
  const db = getDb(classroomId);
  const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;
  db.prepare(`
    INSERT OR REPLACE INTO runs
    (run_id, classroom_id, tool, label, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    input.run_id,
    classroomId,
    input.tool,
    input.label,
    metadataJson,
    input.created_at,
  );

  // Retention: keep only the most recent RUN_RETENTION_LIMIT per (classroom, tool).
  db.prepare(`
    DELETE FROM runs
    WHERE classroom_id = ?
      AND tool = ?
      AND run_id NOT IN (
        SELECT run_id FROM runs
        WHERE classroom_id = ? AND tool = ?
        ORDER BY created_at DESC
        LIMIT ?
      )
  `).run(classroomId, input.tool, classroomId, input.tool, RUN_RETENTION_LIMIT);
}

/**
 * Return low-rated feedback rows for a classroom, optionally bounded by a
 * created_at cutoff. Used by the feedback-harvest script (F14) to materialize
 * draft eval candidate files in `evals/cases/_pending/`.
 */
export interface LowRatedFeedbackRow {
  id: string;
  classroom_id: string;
  panel_id: string;
  prompt_class: string | null;
  rating: number;
  comment: string | null;
  generation_id: string | null;
  session_id: string | null;
  created_at: string;
}

export function getLowRatedFeedback(
  classroomId: ClassroomId,
  ratingMax: number,
  sinceIso?: string,
): LowRatedFeedbackRow[] {
  const db = getDb(classroomId);
  const where = sinceIso
    ? "WHERE classroom_id = ? AND rating <= ? AND created_at >= ?"
    : "WHERE classroom_id = ? AND rating <= ?";
  const params: unknown[] = sinceIso
    ? [classroomId, ratingMax, sinceIso]
    : [classroomId, ratingMax];
  return db
    .prepare(
      `SELECT id, classroom_id, panel_id, prompt_class, rating, comment,
              generation_id, session_id, created_at
       FROM feedback
       ${where}
       ORDER BY created_at DESC`,
    )
    .all(...params) as LowRatedFeedbackRow[];
}

export function getFeedbackSummary(classroomId: ClassroomId): FeedbackSummary {
  const db = getDb(classroomId);

  // Total count
  const totalRow = db
    .prepare("SELECT COUNT(*) as total FROM feedback WHERE classroom_id = ?")
    .get(classroomId) as { total: number };

  // By panel: count, avg_rating, recent comments (up to 5 per panel)
  const panelRows = db
    .prepare(`
      SELECT panel_id, COUNT(*) as count, AVG(rating) as avg_rating
      FROM feedback WHERE classroom_id = ?
      GROUP BY panel_id
    `)
    .all(classroomId) as { panel_id: string; count: number; avg_rating: number }[];

  const byPanel: Record<string, { count: number; avg_rating: number; recent_comments: string[] }> = {};
  for (const row of panelRows) {
    const comments = db
      .prepare(`
        SELECT comment FROM feedback
        WHERE classroom_id = ? AND panel_id = ? AND comment IS NOT NULL AND comment != ''
        ORDER BY created_at DESC LIMIT 5
      `)
      .all(classroomId, row.panel_id) as { comment: string }[];

    byPanel[row.panel_id] = {
      count: row.count,
      avg_rating: Math.round(row.avg_rating * 100) / 100,
      recent_comments: comments.map((c) => c.comment),
    };
  }

  // By week
  const weekRows = db
    .prepare(`
      SELECT strftime('%Y-W%W', created_at) as week, COUNT(*) as count, AVG(rating) as avg_rating
      FROM feedback WHERE classroom_id = ?
      GROUP BY week ORDER BY week
    `)
    .all(classroomId) as { week: string; count: number; avg_rating: number }[];

  const byWeek = weekRows.map((r) => ({
    week: r.week,
    count: r.count,
    avg_rating: Math.round(r.avg_rating * 100) / 100,
  }));

  // Top comments (most recent with comments, up to 10)
  const topRows = db
    .prepare(`
      SELECT comment as text, panel_id, rating, created_at
      FROM feedback
      WHERE classroom_id = ? AND comment IS NOT NULL AND comment != ''
      ORDER BY created_at DESC LIMIT 10
    `)
    .all(classroomId) as { text: string; panel_id: string; rating: number; created_at: string }[];

  return {
    total: totalRow.total,
    by_panel: byPanel,
    by_week: byWeek,
    top_comments: topRows,
  };
}

export function getSessionSummary(classroomId: ClassroomId): SessionSummary {
  const db = getDb(classroomId);

  // Total sessions
  const totalRow = db
    .prepare("SELECT COUNT(*) as total FROM sessions WHERE classroom_id = ?")
    .get(classroomId) as { total: number };

  if (totalRow.total === 0) {
    return {
      total_sessions: 0,
      avg_duration_minutes: 0,
      common_flows: [],
      transition_counts: [],
      terminal_counts: [],
      panel_time_distribution: {},
      generations_per_session: 0,
      today_workflow_nudge: null,
    };
  }

  // Average duration in minutes
  const durationRow = db
    .prepare(`
      SELECT AVG(
        (julianday(ended_at) - julianday(started_at)) * 24 * 60
      ) as avg_min
      FROM sessions WHERE classroom_id = ?
    `)
    .get(classroomId) as { avg_min: number | null };

  // All sessions for flow analysis
  const allSessions = db
    .prepare("SELECT started_at, panels_visited, generations_triggered FROM sessions WHERE classroom_id = ?")
    .all(classroomId) as SessionRow[];

  // Common flows: count occurrences of panel visit sequences
  const flowCounts = new Map<string, { sequence: string[]; count: number }>();
  const todayFlowCountsByWeek = new Map<string, Map<string, FlowAggregate>>();
  const transitionCounts = new Map<string, { from_panel: string; to_panel: string; count: number }>();
  const terminalCounts = new Map<string, number>();
  const panelVisitCounts: Record<string, number> = {};
  let totalGenerations = 0;
  let latestTodayWeekKey: string | null = null;
  let latestTodayWeekSeenAt: string | null = null;
  const currentWeekKey = getUtcIsoWeekKey(new Date());

  for (const sess of allSessions) {
    const panels: string[] = JSON.parse(sess.panels_visited);
    const generations: unknown[] = JSON.parse(sess.generations_triggered);
    totalGenerations += generations.length;

    // Count panel visits for distribution
    for (const p of panels) {
      panelVisitCounts[p] = (panelVisitCounts[p] ?? 0) + 1;
    }

    // Track the full flow as a key
    const key = panels.join(" -> ");
    const existing = flowCounts.get(key);
    if (existing) {
      existing.count++;
    } else {
      flowCounts.set(key, { sequence: panels, count: 1 });
    }

    for (let i = 0; i < panels.length - 1; i += 1) {
      const from = panels[i];
      const to = panels[i + 1];
      if (!from || !to) continue;
      const transitionKey = `${from}->${to}`;
      const existingTransition = transitionCounts.get(transitionKey);
      if (existingTransition) {
        existingTransition.count += 1;
      } else {
        transitionCounts.set(transitionKey, {
          from_panel: from,
          to_panel: to,
          count: 1,
        });
      }
    }

    const terminalPanel = panels[panels.length - 1];
    if (terminalPanel) {
      terminalCounts.set(terminalPanel, (terminalCounts.get(terminalPanel) ?? 0) + 1);
    }

    const todayNudgeSequence = getTodayNudgeSequence(panels);
    if (todayNudgeSequence) {
      const startedAt = new Date(sess.started_at);
      if (!Number.isNaN(startedAt.getTime())) {
        const weekKey = getUtcIsoWeekKey(startedAt);
        let weekFlows = todayFlowCountsByWeek.get(weekKey);
        if (!weekFlows) {
          weekFlows = new Map<string, FlowAggregate>();
          todayFlowCountsByWeek.set(weekKey, weekFlows);
        }
        trackFlow(weekFlows, todayNudgeSequence, sess.started_at);
        if (!latestTodayWeekSeenAt || sess.started_at > latestTodayWeekSeenAt) {
          latestTodayWeekSeenAt = sess.started_at;
          latestTodayWeekKey = weekKey;
        }
      }
    }
  }

  // Sort flows by count descending, take top 5
  const commonFlows = [...flowCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const rankedTransitions = [...transitionCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
  const rankedTerminals = [...terminalCounts.entries()]
    .map(([panel_id, count]) => ({ panel_id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const nudgeWeekKey = todayFlowCountsByWeek.has(currentWeekKey)
    ? currentWeekKey
    : latestTodayWeekKey;
  const nudgeFlow = nudgeWeekKey
    ? pickTopFlow(todayFlowCountsByWeek.get(nudgeWeekKey) ?? new Map())
    : null;

  // Normalize panel distribution to proportions
  const totalVisits = Object.values(panelVisitCounts).reduce((a, b) => a + b, 0);
  const panelTimeDistribution: Record<string, number> = {};
  for (const [panel, count] of Object.entries(panelVisitCounts)) {
    panelTimeDistribution[panel] = Math.round((count / totalVisits) * 100) / 100;
  }

  return {
    total_sessions: totalRow.total,
    avg_duration_minutes: Math.round((durationRow.avg_min ?? 0) * 100) / 100,
    common_flows: commonFlows,
    transition_counts: rankedTransitions,
    terminal_counts: rankedTerminals,
    panel_time_distribution: panelTimeDistribution,
    generations_per_session: Math.round((totalGenerations / totalRow.total) * 100) / 100,
    today_workflow_nudge: nudgeWeekKey && nudgeFlow
      ? {
          week: nudgeWeekKey,
          is_current_week: nudgeWeekKey === currentWeekKey,
          sequence: nudgeFlow.sequence,
          count: nudgeFlow.count,
        }
      : null,
  };
}
