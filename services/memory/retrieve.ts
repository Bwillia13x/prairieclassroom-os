// services/memory/retrieve.ts
import { getDb } from "./db.js";
import type { ClassroomId } from "../../packages/shared/schemas/branded.js";
import type { TomorrowPlan } from "../../packages/shared/schemas/plan.js";
import type { InterventionRecord } from "../../packages/shared/schemas/intervention.js";
import type { SupportPatternReport } from "../../packages/shared/schemas/pattern.js";
import type { ComplexityForecast } from "../../packages/shared/schemas/forecast.js";
import type { DebtItem, DebtThresholds, ComplexityDebtRegister } from "../../packages/shared/schemas/debt.js";
import type { ClassroomProfile } from "../../packages/shared/schemas/classroom.js";
import type { ScaffoldDecayReport } from "../../packages/shared/schemas/scaffold-decay.js";
import type { FamilyMessageDraft } from "../../packages/shared/schemas/message.js";
import type { SurvivalPacket } from "../../packages/shared/schemas/survival-packet.js";
import type { RunRecord, RunTool } from "../../packages/shared/schemas/run.js";
import { safeParseJson } from "./json-utils.js";
import {
  filterRosterScoped,
  isRosterScopedValue,
  type RosterScope,
} from "./roster-scope.js";

const RETRIEVAL_STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "have", "has",
  "had", "was", "were", "are", "you", "your", "today", "tomorrow", "student",
  "students", "class", "classroom",
]);

export interface RelevantInterventionOptions {
  limit?: number;
  candidateLimit?: number;
  query?: string;
  studentRefs?: string[];
  rosterScope?: RosterScope;
}

function tokenizeRetrievalText(value: string): Set<string> {
  const tokens = value
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu) ?? [];
  return new Set(tokens.filter((token) => token.length >= 3 && !RETRIEVAL_STOP_WORDS.has(token)));
}

function interventionRetrievalText(record: InterventionRecord): string {
  return [
    ...record.student_refs,
    record.observation,
    record.action_taken,
    record.outcome ?? "",
    record.follow_up_needed ? "follow up needed" : "",
  ].join(" ");
}

function scoreInterventionRelevance(
  record: InterventionRecord,
  queryTokens: Set<string>,
  studentRefs: Set<string>,
): number {
  let score = record.follow_up_needed ? 8 : 0;
  for (const studentRef of record.student_refs) {
    if (studentRefs.has(studentRef.toLowerCase())) score += 6;
  }
  if (queryTokens.size > 0) {
    const recordTokens = tokenizeRetrievalText(interventionRetrievalText(record));
    for (const token of queryTokens) {
      if (recordTokens.has(token)) score += 3;
    }
  }
  return score;
}

function sortInterventionsByRelevance(
  records: InterventionRecord[],
  options: RelevantInterventionOptions,
): InterventionRecord[] {
  const queryTokens = tokenizeRetrievalText(options.query ?? "");
  const studentRefs = new Set((options.studentRefs ?? []).map((ref) => ref.toLowerCase()));
  return [...records].sort((a, b) => {
    const scoreDiff = scoreInterventionRelevance(b, queryTokens, studentRefs)
      - scoreInterventionRelevance(a, queryTokens, studentRefs);
    if (scoreDiff !== 0) return scoreDiff;
    return Date.parse(b.created_at ?? "") - Date.parse(a.created_at ?? "");
  });
}

export function getRecentPlans(classroomId: ClassroomId, limit = 5): TomorrowPlan[] {
  const db = getDb(classroomId);
  const rows = db.prepare(`
    SELECT plan_json FROM generated_plans
    WHERE classroom_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(classroomId, limit) as { plan_json: string }[];

  return rows.map((r) => safeParseJson<TomorrowPlan>(r.plan_json, "plan")).filter((p): p is TomorrowPlan => p !== null);
}

export function getLatestPlan(classroomId: ClassroomId): TomorrowPlan | null {
  const plans = getRecentPlans(classroomId, 1);
  return plans.length > 0 ? plans[0] : null;
}

/**
 * Return the most recent run rows for a (classroom, tool), newest first.
 * Mirrors the Prep chip row on DifferentiatePanel / LanguageToolsPanel.
 */
export function getRecentRuns(
  classroomId: ClassroomId,
  tool: RunTool,
  limit = 3,
): RunRecord[] {
  const db = getDb(classroomId);
  const safeLimit = Math.max(1, Math.min(limit, 50));
  const rows = db.prepare(`
    SELECT run_id, classroom_id, tool, label, metadata_json, created_at
    FROM runs
    WHERE classroom_id = ? AND tool = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(classroomId, tool, safeLimit) as {
    run_id: string;
    classroom_id: string;
    tool: RunTool;
    label: string;
    metadata_json: string | null;
    created_at: string;
  }[];

  return rows.map((r) => ({
    run_id: r.run_id,
    classroom_id: r.classroom_id,
    tool: r.tool,
    label: r.label,
    created_at: r.created_at,
    metadata: r.metadata_json
      ? safeParseJson<Record<string, unknown>>(r.metadata_json, "run metadata")
      : null,
  }));
}

export function summarizeRecentPlans(plans: TomorrowPlan[]): string {
  if (plans.length === 0) return "";

  const lines: string[] = ["Recent classroom history:"];

  for (const plan of plans.slice(0, 3)) {
    lines.push("");
    lines.push(`Previous plan (${plan.plan_id}):`);

    if (plan.support_priorities.length > 0) {
      lines.push(
        "  Priority students: " +
          plan.support_priorities
            .map((p) => `${p.student_ref} (${p.reason})`)
            .join("; "),
      );
    }

    if (plan.transition_watchpoints.length > 0) {
      lines.push(
        "  Watchpoints: " +
          plan.transition_watchpoints
            .map((w) => `${w.time_or_activity}: ${w.risk_description}`)
            .join("; "),
      );
    }

    if (plan.ea_actions.length > 0) {
      lines.push(
        "  EA actions taken: " +
          plan.ea_actions.map((a) => a.description).join("; "),
      );
    }

    if (plan.family_followups.length > 0) {
      lines.push(
        "  Family followups: " +
          plan.family_followups
            .map((f) => `${f.student_ref} (${f.message_type})`)
            .join("; "),
      );
    }
  }

  return lines.join("\n");
}

export function getRecentInterventions(classroomId: ClassroomId, limit = 5, studentRef?: string): InterventionRecord[] {
  if (studentRef !== undefined) {
    return getStudentInterventions(classroomId, studentRef, limit);
  }
  const db = getDb(classroomId);
  const rows = db.prepare(`
    SELECT record_json FROM interventions
    WHERE classroom_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(classroomId, limit) as { record_json: string }[];

  return rows.map((r) => safeParseJson<InterventionRecord>(r.record_json, "intervention")).filter((rec): rec is InterventionRecord => rec !== null);
}

export function getRelevantInterventions(
  classroomId: ClassroomId,
  options: RelevantInterventionOptions = {},
): InterventionRecord[] {
  const limit = Math.max(1, Math.min(options.limit ?? 5, 50));
  const candidateLimit = Math.max(limit, Math.min(options.candidateLimit ?? Math.max(limit * 4, 20), 100));
  const db = getDb(classroomId);
  const rows = db.prepare(`
    SELECT record_json FROM interventions
    WHERE classroom_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(classroomId, candidateLimit) as { record_json: string }[];
  const records = rows
    .map((r) => safeParseJson<InterventionRecord>(r.record_json, "relevant-intervention"))
    .filter((rec): rec is InterventionRecord => rec !== null)
    .filter((rec) => isRosterScopedValue(rec, options.rosterScope));
  return sortInterventionsByRelevance(records, options).slice(0, limit);
}

export function summarizeRecentInterventions(records: InterventionRecord[]): string {
  if (records.length === 0) return "";

  const lines: string[] = ["Recent interventions:"];

  for (const rec of records.slice(0, 5)) {
    const students = rec.student_refs.join(", ");
    const outcome = rec.outcome ? ` (outcome: ${rec.outcome})` : "";
    lines.push(`  - ${students}: ${rec.observation} -> ${rec.action_taken}${outcome}`);
  }

  return lines.join("\n");
}

export function getStudentInterventions(
  classroomId: ClassroomId,
  studentRef: string,
  limit = 10,
): InterventionRecord[] {
  const db = getDb(classroomId);
  const rows = db.prepare(`
    SELECT record_json FROM interventions
    WHERE classroom_id = ?
      AND EXISTS (
        SELECT 1 FROM json_each(student_refs) WHERE json_each.value = ?
      )
    ORDER BY created_at DESC
    LIMIT ?
  `).all(classroomId, studentRef, limit) as { record_json: string }[];

  return rows.map((r) => safeParseJson<InterventionRecord>(r.record_json, "student-intervention")).filter((rec): rec is InterventionRecord => rec !== null);
}

export function getFollowUpPending(classroomId: ClassroomId): InterventionRecord[] {
  const db = getDb(classroomId);
  const rows = db.prepare(`
    SELECT record_json FROM interventions
    WHERE classroom_id = ?
      AND json_extract(record_json, '$.follow_up_needed') = 1
    ORDER BY created_at DESC
    LIMIT 20
  `).all(classroomId) as { record_json: string }[];

  return rows.map((r) => safeParseJson<InterventionRecord>(r.record_json, "followup-intervention")).filter((rec): rec is InterventionRecord => rec !== null);
}

export function buildPatternContext(
  classroomId: ClassroomId,
  studentRef?: string,
  windowSize = 10,
  rosterScope?: RosterScope,
): string {
  const lines: string[] = [];

  const interventions = studentRef
    ? getStudentInterventions(classroomId, studentRef, windowSize)
    : getRelevantInterventions(classroomId, {
      limit: windowSize,
      candidateLimit: Math.max(windowSize * 4, 20),
      query: "support pattern follow up transition confidence independence scaffold",
      rosterScope,
    });
  const scopedInterventions = filterRosterScoped(interventions, rosterScope);

  if (scopedInterventions.length > 0) {
    lines.push("INTERVENTION RECORDS:");
    for (const rec of scopedInterventions) {
      const students = rec.student_refs.join(", ");
      const followUp = rec.follow_up_needed ? " [FOLLOW-UP NEEDED]" : "";
      lines.push(
        `  - [${rec.record_id}] ${students}: ${rec.observation} -> ${rec.action_taken}` +
          (rec.outcome ? ` (outcome: ${rec.outcome})` : "") +
          followUp,
      );
    }
  }

  const plans = filterRosterScoped(getRecentPlans(classroomId, 5), rosterScope);
  if (plans.length > 0) {
    lines.push("");
    lines.push("RECENT PLAN SUPPORT PRIORITIES:");
    for (const plan of plans) {
      for (const sp of plan.support_priorities) {
        if (!studentRef || sp.student_ref === studentRef) {
          lines.push(
            `  - ${sp.student_ref}: ${sp.reason} (action: ${sp.suggested_action})`,
          );
        }
      }
    }
  }

  const pending = filterRosterScoped(getFollowUpPending(classroomId), rosterScope);
  if (pending.length > 0) {
    lines.push("");
    lines.push("PENDING FOLLOW-UPS (follow_up_needed = true):");
    for (const rec of pending) {
      if (!studentRef || rec.student_refs.includes(studentRef)) {
        lines.push(
          `  - [${rec.record_id}] ${rec.student_refs.join(", ")}: ${rec.observation}`,
        );
      }
    }
  }

  return lines.join("\n");
}

export function getLatestPatternReport(
  classroomId: ClassroomId,
): SupportPatternReport | null {
  const db = getDb(classroomId);
  const row = db.prepare(`
    SELECT report_json FROM pattern_reports
    WHERE classroom_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(classroomId) as { report_json: string } | undefined;

  return row ? safeParseJson<SupportPatternReport>(row.report_json, "pattern-report") : null;
}

export function getRecentMessages(classroomId: ClassroomId, limit = 10, studentRef?: string): FamilyMessageDraft[] {
  const db = getDb(classroomId);
  if (studentRef !== undefined) {
    const rows = db.prepare(`
      SELECT message_json FROM family_messages
      WHERE classroom_id = ?
        AND EXISTS (
          SELECT 1 FROM json_each(student_refs) WHERE json_each.value = ?
        )
      ORDER BY created_at DESC
      LIMIT ?
    `).all(classroomId, studentRef, limit) as { message_json: string }[];
    return rows.map((r) => safeParseJson<FamilyMessageDraft>(r.message_json, "family-message")).filter((m): m is FamilyMessageDraft => m !== null);
  }
  const rows = db.prepare(`
    SELECT message_json FROM family_messages
    WHERE classroom_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(classroomId, limit) as { message_json: string }[];
  return rows.map((r) => safeParseJson<FamilyMessageDraft>(r.message_json, "family-message")).filter((m): m is FamilyMessageDraft => m !== null);
}

export function getRecentPatternReports(classroomId: ClassroomId, limit = 5): SupportPatternReport[] {
  const db = getDb(classroomId);
  const rows = db.prepare(`
    SELECT report_json FROM pattern_reports
    WHERE classroom_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(classroomId, limit) as { report_json: string }[];
  return rows.map((r) => safeParseJson<SupportPatternReport>(r.report_json, "pattern-report")).filter((rpt): rpt is SupportPatternReport => rpt !== null);
}

export function buildEABriefingContext(classroomId: ClassroomId, rosterScope?: RosterScope): string {
  const lines: string[] = [];

  // Pull EA actions from the most recent plan
  const plans = filterRosterScoped(getRecentPlans(classroomId, 1), rosterScope);
  if (plans.length > 0) {
    const plan = plans[0];
    lines.push("TODAY'S PLAN — EA ACTIONS:");
    for (const ea of plan.ea_actions) {
      const students = ea.student_refs.length > 0 ? ` (${ea.student_refs.join(", ")})` : "";
      lines.push(`  - [${ea.timing}]${students}: ${ea.description}`);
    }

    if (plan.support_priorities.length > 0) {
      lines.push("");
      lines.push("TODAY'S PLAN — SUPPORT PRIORITIES:");
      for (const sp of plan.support_priorities) {
        lines.push(`  - ${sp.student_ref}: ${sp.reason} → ${sp.suggested_action}`);
      }
    }

    if (plan.prep_checklist.length > 0) {
      lines.push("");
      lines.push("PREP CHECKLIST:");
      for (const item of plan.prep_checklist) {
        lines.push(`  - ${item}`);
      }
    }
  }

  // Pull recent interventions, prioritizing follow-up-needed
  const pending = filterRosterScoped(getFollowUpPending(classroomId), rosterScope);
  if (pending.length > 0) {
    lines.push("");
    lines.push("PENDING FOLLOW-UPS (from recent interventions):");
    for (const rec of pending.slice(0, 5)) {
      lines.push(
        `  - ${rec.student_refs.join(", ")}: ${rec.observation} → ${rec.action_taken}`,
      );
    }
  }

  const recent = getRelevantInterventions(classroomId, {
    limit: 5,
    query: "ea briefing support priority schedule transition follow up",
    rosterScope,
  });
  if (recent.length > 0) {
    lines.push("");
    lines.push("RECENT INTERVENTIONS:");
    for (const rec of recent) {
      const outcome = rec.outcome ? ` (outcome: ${rec.outcome})` : "";
      lines.push(
        `  - ${rec.student_refs.join(", ")}: ${rec.observation} → ${rec.action_taken}${outcome}`,
      );
    }
  }

  // Pull pattern insights if available
  const report = getLatestPatternReport(classroomId);
  if (report && isRosterScopedValue(report, rosterScope)) {
    const highFocus = report.suggested_focus.filter((f) => f.priority === "high");
    if (highFocus.length > 0) {
      lines.push("");
      lines.push("PATTERN INSIGHTS — HIGH-PRIORITY FOCUS:");
      for (const f of highFocus) {
        lines.push(`  - ${f.student_ref}: ${f.reason} → ${f.suggested_action}`);
      }
    }

    if (report.positive_trends.length > 0) {
      lines.push("");
      lines.push("POSITIVE TRENDS (from teacher's records):");
      for (const t of report.positive_trends) {
        lines.push(`  - ${t.student_ref}: ${t.description}`);
      }
    }
  }

  return lines.join("\n");
}

export function getLatestForecast(
  classroomId: ClassroomId,
): ComplexityForecast | null {
  const db = getDb(classroomId);
  const row = db.prepare(`
    SELECT forecast_json FROM complexity_forecasts
    WHERE classroom_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(classroomId) as { forecast_json: string } | undefined;

  return row ? safeParseJson<ComplexityForecast>(row.forecast_json, "forecast") : null;
}

export function getInterventionsByTimeBlock(
  classroomId: ClassroomId,
  limit = 30,
  rosterScope?: RosterScope,
): Map<string, number> {
  const db = getDb(classroomId);
  const rows = db.prepare(`
    SELECT record_json FROM interventions
    WHERE classroom_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(classroomId, limit) as { record_json: string }[];

  const blockCounts = new Map<string, number>();
  for (const row of rows) {
    const record = safeParseJson<InterventionRecord>(row.record_json, "time-block-intervention");
    if (!record) continue;
    if (!isRosterScopedValue(record, rosterScope)) continue;
    // Extract time reference from observation or action if present
    const text = `${record.observation} ${record.action_taken}`;
    // Match common time patterns: "after lunch", "morning", "recess", "math block", etc.
    const timePatterns = [
      "morning", "after lunch", "post-lunch", "recess", "afternoon",
      "math block", "literacy", "transition", "end of day", "bell work",
    ];
    for (const pattern of timePatterns) {
      if (text.toLowerCase().includes(pattern)) {
        blockCounts.set(pattern, (blockCounts.get(pattern) ?? 0) + 1);
      }
    }
  }
  return blockCounts;
}

export function buildForecastContext(classroomId: ClassroomId, rosterScope?: RosterScope): string {
  const lines: string[] = [];

  // Intervention frequency by time-of-day patterns
  const blockCounts = getInterventionsByTimeBlock(classroomId, 30, rosterScope);
  if (blockCounts.size > 0) {
    lines.push("INTERVENTION FREQUENCY BY TIME/CONTEXT (last 30 records):");
    const sorted = [...blockCounts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [block, count] of sorted) {
      lines.push(`  - "${block}": ${count} mentions`);
    }
  }

  // Recent interventions for context
  const recent = getRelevantInterventions(classroomId, {
    limit: 5,
    query: "forecast schedule transition morning afternoon lunch recess math literacy follow up",
    rosterScope,
  });
  if (recent.length > 0) {
    lines.push("");
    lines.push("MOST RECENT INTERVENTIONS:");
    for (const rec of recent) {
      const students = rec.student_refs.join(", ");
      const outcome = rec.outcome ? ` (outcome: ${rec.outcome})` : "";
      lines.push(`  - ${students}: ${rec.observation} -> ${rec.action_taken}${outcome}`);
    }
  }

  // Latest pattern report highlights
  const pattern = getLatestPatternReport(classroomId);
  if (pattern && isRosterScopedValue(pattern, rosterScope)) {
    const highFocus = pattern.suggested_focus.filter((f) => f.priority === "high");
    if (highFocus.length > 0) {
      lines.push("");
      lines.push("HIGH-PRIORITY PATTERN FOCUS:");
      for (const f of highFocus) {
        lines.push(`  - ${f.student_ref}: ${f.reason}`);
      }
    }
    if (pattern.recurring_themes.length > 0) {
      lines.push("");
      lines.push("RECURRING THEMES:");
      for (const t of pattern.recurring_themes) {
        lines.push(`  - ${t.theme} (${t.student_refs.join(", ")}, ${t.evidence_count} records)`);
      }
    }
  }

  // Pending follow-ups
  const pending = filterRosterScoped(getFollowUpPending(classroomId), rosterScope);
  if (pending.length > 0) {
    lines.push("");
    lines.push("PENDING FOLLOW-UPS:");
    for (const rec of pending.slice(0, 5)) {
      lines.push(`  - ${rec.student_refs.join(", ")}: ${rec.observation}`);
    }
  }

  return lines.join("\n");
}

export function summarizePatternInsights(report: SupportPatternReport): string {
  const lines: string[] = [];

  // High-priority focus items first — these most directly inform the plan
  const highFocus = report.suggested_focus.filter((f) => f.priority === "high");
  const otherFocus = report.suggested_focus.filter((f) => f.priority !== "high");

  if (highFocus.length > 0) {
    lines.push("HIGH-PRIORITY FOCUS (from your pattern review):");
    for (const f of highFocus) {
      lines.push(
        `  - ${f.student_ref}: ${f.reason} → Suggested: ${f.suggested_action}`,
      );
    }
  }

  if (report.recurring_themes.length > 0) {
    lines.push("");
    lines.push("RECURRING THEMES your records show:");
    for (const t of report.recurring_themes) {
      lines.push(
        `  - ${t.theme} (${t.student_refs.join(", ")}, ${t.evidence_count} records)`,
      );
    }
  }

  if (report.follow_up_gaps.length > 0) {
    lines.push("");
    lines.push("PENDING FOLLOW-UPS (no subsequent record):");
    for (const g of report.follow_up_gaps) {
      lines.push(
        `  - ${g.student_refs.join(", ")}: ${g.observation} (${g.days_since} days ago)`,
      );
    }
  }

  if (report.positive_trends.length > 0) {
    lines.push("");
    lines.push("POSITIVE TRENDS your records show:");
    for (const t of report.positive_trends) {
      lines.push(`  - ${t.student_ref}: ${t.description}`);
    }
  }

  if (otherFocus.length > 0) {
    lines.push("");
    lines.push("ADDITIONAL FOCUS AREAS:");
    for (const f of otherFocus) {
      lines.push(
        `  - ${f.student_ref} (${f.priority}): ${f.reason}`,
      );
    }
  }

  return lines.join("\n");
}

export function getStaleFollowUps(
  classroomId: ClassroomId,
  thresholdDays = 5,
): DebtItem[] {
  const db = getDb(classroomId);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - thresholdDays);
  const cutoffIso = cutoff.toISOString();

  const rows = db.prepare(`
    SELECT record_id, record_json, created_at FROM interventions
    WHERE classroom_id = ?
      AND json_extract(record_json, '$.follow_up_needed') = 1
      AND created_at < ?
    ORDER BY created_at ASC
  `).all(classroomId, cutoffIso) as { record_id: string; record_json: string; created_at: string }[];

  const items: DebtItem[] = [];
  const followUpStmt = db.prepare(`
    SELECT 1 FROM interventions
    WHERE classroom_id = ?
      AND created_at > ?
      AND record_id != ?
      AND EXISTS (
        SELECT 1 FROM json_each(student_refs) AS s1
        WHERE s1.value IN (
          SELECT s2.value FROM json_each(?) AS s2
        )
      )
    LIMIT 1
  `);
  for (const row of rows) {
    const record = safeParseJson<InterventionRecord>(row.record_json, "stale-followup-intervention");
    if (!record) continue;

    const hasFollowUp = followUpStmt.get(classroomId, row.created_at, row.record_id, JSON.stringify(record.student_refs));

    if (!hasFollowUp) {
      const ageDays = Math.floor(
        (Date.now() - new Date(row.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      items.push({
        category: "stale_followup",
        student_refs: record.student_refs,
        description: `Follow-up needed: "${record.observation}" (${ageDays} days ago)`,
        source_record_id: row.record_id,
        age_days: ageDays,
        suggested_action: `Review and document follow-up for ${record.student_refs.join(", ")}`,
      });
    }
  }
  return items;
}

export function getUnapprovedMessages(
  classroomId: ClassroomId,
  thresholdDays = 3,
): DebtItem[] {
  const db = getDb(classroomId);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - thresholdDays);
  const cutoffIso = cutoff.toISOString();

  const rows = db.prepare(`
    SELECT draft_id, student_refs, message_json, created_at FROM family_messages
    WHERE classroom_id = ?
      AND teacher_approved = 0
      AND created_at < ?
    ORDER BY created_at ASC
  `).all(classroomId, cutoffIso) as { draft_id: string; student_refs: string; message_json: string; created_at: string }[];

  const items: DebtItem[] = [];
  for (const row of rows) {
    const studentRefs = safeParseJson<string[]>(row.student_refs, "unapproved-message-refs");
    if (!studentRefs) continue;
    const ageDays = Math.floor(
      (Date.now() - new Date(row.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    items.push({
      category: "unapproved_message",
      student_refs: studentRefs,
      description: `Family message drafted ${ageDays} days ago, not yet approved`,
      source_record_id: row.draft_id,
      age_days: ageDays,
      suggested_action: `Review and approve or discard the draft message for ${studentRefs.join(", ")}`,
    });
  }
  return items;
}

export function getUnaddressedPatternInsights(
  classroomId: ClassroomId,
): DebtItem[] {
  const latestPattern = getLatestPatternReport(classroomId);
  if (!latestPattern) return [];

  // Use DB created_at timestamps to find plans generated after the pattern report
  const db = getDb(classroomId);
  const patternRow = db.prepare(`
    SELECT created_at FROM pattern_reports WHERE report_id = ? LIMIT 1
  `).get(latestPattern.report_id) as { created_at: string } | undefined;
  if (!patternRow) return [];

  const planRows = db.prepare(`
    SELECT plan_json FROM generated_plans
    WHERE classroom_id = ? AND created_at > ?
    ORDER BY created_at DESC
    LIMIT 5
  `).all(classroomId, patternRow.created_at) as { plan_json: string }[];

  const planStudentRefs = new Set<string>();
  for (const row of planRows) {
    const plan = safeParseJson<TomorrowPlan>(row.plan_json, "unaddressed-pattern-plan");
    if (!plan) continue;
    for (const sp of plan.support_priorities) {
      planStudentRefs.add(sp.student_ref);
    }
  }

  const items: DebtItem[] = [];
  for (const focus of latestPattern.suggested_focus) {
    if (!planStudentRefs.has(focus.student_ref)) {
      const reportAge = Math.floor(
        (Date.now() - new Date(latestPattern.generated_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      items.push({
        category: "unaddressed_pattern",
        student_refs: [focus.student_ref],
        description: `Pattern insight (${focus.priority}): "${focus.reason}" — no plan action since`,
        source_record_id: latestPattern.report_id,
        age_days: reportAge,
        suggested_action: focus.suggested_action,
      });
    }
  }
  return items;
}

export function getRecurringPlanItems(
  classroomId: ClassroomId,
  minConsecutive = 3,
): DebtItem[] {
  const plans = getRecentPlans(classroomId, minConsecutive + 2);
  if (plans.length < minConsecutive) return [];

  // Track current consecutive streak and best streak per student
  const currentStreak = new Map<string, { count: number; reasons: string[] }>();
  const bestStreak = new Map<string, { count: number; reasons: string[] }>();

  // Plans are returned newest-first; process in chronological order
  const chronological = [...plans].reverse();
  for (const plan of chronological) {
    const currentRefs = new Set(plan.support_priorities.map((sp) => sp.student_ref));

    // Extend or start streaks for students in this plan
    for (const sp of plan.support_priorities) {
      const existing = currentStreak.get(sp.student_ref);
      if (existing) {
        existing.count++;
        if (!existing.reasons.includes(sp.reason)) {
          existing.reasons.push(sp.reason);
        }
      } else {
        currentStreak.set(sp.student_ref, { count: 1, reasons: [sp.reason] });
      }
    }

    // Break streaks for students NOT in this plan — save best before resetting
    const toDelete: string[] = [];
    for (const [ref, streak] of currentStreak) {
      if (!currentRefs.has(ref)) {
        const best = bestStreak.get(ref);
        if (!best || streak.count > best.count) {
          bestStreak.set(ref, { ...streak });
        }
        toDelete.push(ref);
      }
    }
    for (const ref of toDelete) {
      currentStreak.delete(ref);
    }
  }

  // Merge final active streaks into best
  for (const [ref, streak] of currentStreak) {
    const best = bestStreak.get(ref);
    if (!best || streak.count > best.count) {
      bestStreak.set(ref, streak);
    }
  }

  const items: DebtItem[] = [];
  for (const [studentRef, streak] of bestStreak) {
    if (streak.count >= minConsecutive) {
      items.push({
        category: "recurring_plan_item",
        student_refs: [studentRef],
        description: `Support priority for ${studentRef} has appeared in ${streak.count} consecutive plans: ${streak.reasons[0]}`,
        source_record_id: plans[0].plan_id,
        age_days: streak.count,
        suggested_action: `This recurring item may need a different approach or a dedicated conversation with the team`,
      });
    }
  }
  return items;
}

export function getStudentsApproachingReview(
  classroomId: ClassroomId,
  classroom: ClassroomProfile,
  minRecords = 2,
  windowDays = 14,
): DebtItem[] {
  const db = getDb(classroomId);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);
  const cutoffIso = cutoff.toISOString();

  const items: DebtItem[] = [];
  const countStmt = db.prepare(`
    SELECT COUNT(*) as cnt FROM interventions
    WHERE classroom_id = ?
      AND created_at > ?
      AND EXISTS (
        SELECT 1 FROM json_each(student_refs) WHERE json_each.value = ?
      )
  `);

  for (const student of classroom.students) {
    if (student.support_tags.length === 0) continue;

    const count = countStmt.get(classroomId, cutoffIso, student.alias) as { cnt: number };

    if (count.cnt < minRecords) {
      items.push({
        category: "approaching_review",
        student_refs: [student.alias],
        description: `${student.alias} has ${count.cnt} intervention records in the past ${windowDays} days (has ${student.support_tags.length} support tags)`,
        source_record_id: `student-${student.student_id}`,
        age_days: windowDays,
        suggested_action: `Consider logging observations for ${student.alias} to maintain documentation currency`,
      });
    }
  }
  return items;
}

export function buildDebtRegister(
  classroomId: ClassroomId,
  classroom: ClassroomProfile,
  thresholds?: Partial<DebtThresholds>,
  rosterScope?: RosterScope,
): ComplexityDebtRegister {
  const config: DebtThresholds = {
    stale_followup_days: thresholds?.stale_followup_days ?? 5,
    unapproved_message_days: thresholds?.unapproved_message_days ?? 3,
    recurring_plan_min: thresholds?.recurring_plan_min ?? 3,
    review_window_days: thresholds?.review_window_days ?? 14,
    review_min_records: thresholds?.review_min_records ?? 2,
  };

  const allItems = filterRosterScoped<DebtItem>([
    ...getStaleFollowUps(classroomId, config.stale_followup_days),
    ...getUnapprovedMessages(classroomId, config.unapproved_message_days),
    ...getUnaddressedPatternInsights(classroomId),
    ...getRecurringPlanItems(classroomId, config.recurring_plan_min),
    ...getStudentsApproachingReview(classroomId, classroom, config.review_min_records, config.review_window_days),
  ], rosterScope);

  allItems.sort((a, b) => b.age_days - a.age_days);

  const countByCategory: Record<string, number> = {};
  for (const item of allItems) {
    countByCategory[item.category] = (countByCategory[item.category] ?? 0) + 1;
  }

  return {
    register_id: `debt-${classroomId}-${Date.now()}`,
    classroom_id: classroomId,
    items: allItems,
    item_count_by_category: countByCategory,
    generated_at: new Date().toISOString(),
    schema_version: "0.1.0",
  };
}

export function buildScaffoldDecayContext(
  classroomId: ClassroomId,
  studentRef: string,
  windowSize = 20,
): string {
  const interventions = getStudentInterventions(classroomId, studentRef, windowSize);
  if (interventions.length < 2) return "";

  const midpoint = Math.ceil(interventions.length / 2);
  // interventions are newest-first; reverse for chronological
  const chronological = [...interventions].reverse();
  const earlyWindow = chronological.slice(0, midpoint);
  const recentWindow = chronological.slice(midpoint);

  const lines: string[] = [];

  lines.push(`INTERVENTION HISTORY FOR ${studentRef} (${interventions.length} records):`);
  lines.push("");
  lines.push(`EARLY WINDOW (${earlyWindow.length} records):`);
  for (const rec of earlyWindow) {
    lines.push(
      `  - [${rec.record_id}] ${rec.observation} -> ${rec.action_taken}` +
      (rec.outcome ? ` (outcome: ${rec.outcome})` : ""),
    );
  }

  lines.push("");
  lines.push(`RECENT WINDOW (${recentWindow.length} records):`);
  for (const rec of recentWindow) {
    lines.push(
      `  - [${rec.record_id}] ${rec.observation} -> ${rec.action_taken}` +
      (rec.outcome ? ` (outcome: ${rec.outcome})` : ""),
    );
  }

  return lines.join("\n");
}

export function getLatestScaffoldReview(
  classroomId: ClassroomId,
  studentRef: string,
): ScaffoldDecayReport | null {
  const db = getDb(classroomId);
  const row = db.prepare(`
    SELECT report_json FROM scaffold_reviews
    WHERE classroom_id = ? AND student_ref = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(classroomId, studentRef) as { report_json: string } | undefined;

  return row ? safeParseJson<ScaffoldDecayReport>(row.report_json, "scaffold-review") : null;
}

export function getRecentFamilyMessages(
  classroomId: ClassroomId,
  limit = 10,
): Array<{ draft: FamilyMessageDraft; approved: boolean }> {
  const db = getDb(classroomId);
  const rows = db.prepare(`
    SELECT message_json, teacher_approved FROM family_messages
    WHERE classroom_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(classroomId, limit) as { message_json: string; teacher_approved: number }[];

  return rows.map((r) => {
    const draft = safeParseJson<FamilyMessageDraft>(r.message_json, "family-message-draft");
    if (!draft) return null;
    return { draft, approved: r.teacher_approved === 1 };
  }).filter((item): item is { draft: FamilyMessageDraft; approved: boolean } => item !== null);
}

export function getLatestSurvivalPacket(
  classroomId: ClassroomId,
): SurvivalPacket | null {
  const db = getDb(classroomId);
  const row = db.prepare(`
    SELECT packet_json FROM survival_packets
    WHERE classroom_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(classroomId) as { packet_json: string } | undefined;

  return row ? safeParseJson<SurvivalPacket>(row.packet_json, "survival-packet") : null;
}

export function buildSurvivalContext(
  classroomId: ClassroomId,
  classroom: ClassroomProfile,
  rosterScope?: RosterScope,
): string {
  const lines: string[] = [];

  // 0. CLASSROOM OVERVIEW (teacher-written notes — contains EA name, room layout, key constraints)
  if (classroom.classroom_notes && classroom.classroom_notes.length > 0) {
    const notes = Array.isArray(classroom.classroom_notes)
      ? classroom.classroom_notes
      : [classroom.classroom_notes];
    lines.push("CLASSROOM OVERVIEW:");
    for (const note of notes) {
      lines.push(`  - ${note}`);
    }
    lines.push("");
  }

  // 1. DAILY SCHEDULE
  if (classroom.schedule && classroom.schedule.length > 0) {
    lines.push("DAILY SCHEDULE:");
    for (const block of classroom.schedule) {
      const eaRefs = (block as { ea_student_refs?: string[] }).ea_student_refs;
      const eaPart = block.ea_available
        ? ` [EA present${eaRefs && eaRefs.length > 0 ? `: ${eaRefs.join(", ")}` : ""}]`
        : " [no EA]";
      const notesPart = block.notes ? ` — ${block.notes}` : "";
      lines.push(`  - ${block.time_slot}: ${block.activity}${eaPart}${notesPart}`);
    }
  }

  // 2. ROUTINES
  const routineEntries = Object.entries(classroom.routines);
  if (routineEntries.length > 0) {
    lines.push("");
    lines.push("ROUTINES:");
    for (const [label, description] of routineEntries) {
      lines.push(`  - ${label}: ${description}`);
    }
  }

  // 3. STUDENT PROFILES
  if (classroom.students.length > 0) {
    lines.push("");
    lines.push("STUDENT PROFILES:");
    for (const student of classroom.students) {
      const tags = student.support_tags.length > 0 ? ` [${student.support_tags.join(", ")}]` : "";
      const eal = student.eal_flag ? " [EAL]" : "";
      lines.push(`  - ${student.alias}${eal}${tags}`);
      if (student.known_successful_scaffolds.length > 0) {
        lines.push(`      scaffolds: ${student.known_successful_scaffolds.join("; ")}`);
      }
      if (student.communication_notes && student.communication_notes.length > 0) {
        lines.push(`      comms: ${student.communication_notes.join("; ")}`);
      }
    }
  }

  // 4. SUPPORT CONSTRAINTS
  if (classroom.support_constraints && classroom.support_constraints.length > 0) {
    lines.push("");
    lines.push("SUPPORT CONSTRAINTS:");
    for (const constraint of classroom.support_constraints) {
      lines.push(`  - ${constraint}`);
    }
  }

  // 5. MOST RECENT TEACHER PLAN
  const plans = filterRosterScoped(getRecentPlans(classroomId, 1), rosterScope);
  if (plans.length > 0) {
    const plan = plans[0];
    lines.push("");
    lines.push("MOST RECENT TEACHER PLAN:");
    if (plan.support_priorities.length > 0) {
      lines.push("  Support priorities:");
      for (const sp of plan.support_priorities) {
        lines.push(`    - ${sp.student_ref}: ${sp.reason} → ${sp.suggested_action}`);
      }
    }
    if (plan.transition_watchpoints.length > 0) {
      lines.push("  Watchpoints:");
      for (const w of plan.transition_watchpoints) {
        lines.push(`    - ${w.time_or_activity}: ${w.risk_description}`);
      }
    }
    if (plan.ea_actions.length > 0) {
      lines.push("  EA actions:");
      for (const ea of plan.ea_actions) {
        const students = ea.student_refs.length > 0 ? ` (${ea.student_refs.join(", ")})` : "";
        lines.push(`    - [${ea.timing}]${students}: ${ea.description}`);
      }
    }
    if (plan.prep_checklist.length > 0) {
      lines.push("  Prep checklist:");
      for (const item of plan.prep_checklist) {
        lines.push(`    - ${item}`);
      }
    }
  }

  // 6. RECENT INTERVENTIONS
  const survivalNotes = Array.isArray(classroom.classroom_notes)
    ? classroom.classroom_notes
    : classroom.classroom_notes
      ? [classroom.classroom_notes]
      : [];
  const survivalQuery = [
    ...survivalNotes,
    ...(classroom.support_constraints ?? []),
    ...(classroom.schedule ?? []).map((block) => `${block.time_slot} ${block.activity} ${block.notes ?? ""}`),
  ].join(" ");
  const interventions = getRelevantInterventions(classroomId, {
    limit: 10,
    query: survivalQuery,
    rosterScope,
  });
  if (interventions.length > 0) {
    lines.push("");
    lines.push("RECENT INTERVENTIONS:");
    for (const rec of interventions) {
      const students = rec.student_refs.join(", ");
      const outcome = rec.outcome ? ` (outcome: ${rec.outcome})` : "";
      const followUp = rec.follow_up_needed ? " [FOLLOW-UP NEEDED]" : "";
      lines.push(`  - ${students}: ${rec.observation} → ${rec.action_taken}${outcome}${followUp}`);
    }
  }

  // 7. PATTERN INSIGHTS
  const report = getLatestPatternReport(classroomId);
  if (report && isRosterScopedValue(report, rosterScope)) {
    const hasThemes = report.recurring_themes.length > 0;
    const hasTrends = report.positive_trends.length > 0;
    if (hasThemes || hasTrends) {
      lines.push("");
      lines.push("PATTERN INSIGHTS:");
      if (hasThemes) {
        lines.push("  Recurring themes:");
        for (const t of report.recurring_themes) {
          lines.push(`    - ${t.theme} (${t.student_refs.join(", ")}, ${t.evidence_count} records)`);
        }
      }
      if (hasTrends) {
        lines.push("  Positive trends:");
        for (const t of report.positive_trends) {
          lines.push(`    - ${t.student_ref}: ${t.description}`);
        }
      }
    }
  }

  // 8. FAMILY MESSAGE STATUS
  const familyMessages = getRecentFamilyMessages(classroomId, 10)
    .filter(({ draft }) => isRosterScopedValue(draft, rosterScope));
  if (familyMessages.length > 0) {
    lines.push("");
    lines.push("FAMILY MESSAGE STATUS:");
    for (const { draft, approved } of familyMessages) {
      const status = approved ? "approved" : "draft";
      const students = draft.student_refs.join(", ");
      lines.push(`  - ${students}: ${draft.message_type} [${status}] (${draft.target_language})`);
    }
  }

  // 9. COMPLEXITY FORECAST
  const forecast = getLatestForecast(classroomId);
  if (forecast && isRosterScopedValue(forecast, rosterScope)) {
    lines.push("");
    lines.push("COMPLEXITY FORECAST:");
    for (const block of forecast.blocks) {
      lines.push(`  - ${block.time_slot} (${block.activity}): ${block.level}`);
    }
    lines.push(`  Highest risk: ${forecast.highest_risk_block}`);
  }

  // 10. UPCOMING EVENTS
  if (classroom.upcoming_events && classroom.upcoming_events.length > 0) {
    lines.push("");
    lines.push("UPCOMING EVENTS:");
    for (const evt of classroom.upcoming_events) {
      const eventDate = (evt as { event_date?: string }).event_date;
      const datePart = eventDate ? ` [${eventDate}]` : "";
      const timePart = evt.time_slot ? ` at ${evt.time_slot}` : "";
      const impactPart = evt.impacts ? ` — ${evt.impacts}` : "";
      lines.push(`  - ${evt.description}${datePart}${timePart}${impactPart}`);
    }
  }

  return lines.join("\n");
}
