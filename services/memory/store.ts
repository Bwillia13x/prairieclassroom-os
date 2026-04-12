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
  modelId: string,
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

export function approveFamilyMessage(classroomId: ClassroomId, draftId: string): void {
  const db = getDb(classroomId);
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE family_messages
    SET teacher_approved = 1, approval_timestamp = ?
    WHERE draft_id = ?
  `).run(now, draftId);
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
      panel_time_distribution: {},
      generations_per_session: 0,
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
    .prepare("SELECT panels_visited, generations_triggered FROM sessions WHERE classroom_id = ?")
    .all(classroomId) as { panels_visited: string; generations_triggered: string }[];

  // Common flows: count occurrences of panel visit sequences
  const flowCounts = new Map<string, { sequence: string[]; count: number }>();
  const panelVisitCounts: Record<string, number> = {};
  let totalGenerations = 0;

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
  }

  // Sort flows by count descending, take top 5
  const commonFlows = [...flowCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

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
    panel_time_distribution: panelTimeDistribution,
    generations_per_session: Math.round((totalGenerations / totalRow.total) * 100) / 100,
  };
}
