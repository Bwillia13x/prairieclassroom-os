// services/memory/student-summary.ts
import { getDb } from "./db.js";
import type { ClassroomId } from "../../packages/shared/schemas/branded.js";
import type { StudentSummary } from "../../packages/shared/schemas/student-summary.js";
import type { TomorrowPlan } from "../../packages/shared/schemas/plan.js";
import type { SupportPatternReport } from "../../packages/shared/schemas/pattern.js";
import { safeParseJson } from "./json-utils.js";
import { getInterventionHistoryByStudent } from "./intervention-history.js";

/**
 * Compute the number of whole calendar days between the midnight-UTC of a
 * past ISO timestamp and the midnight-UTC of today.  This matches the
 * day-offset convention used by test helpers (which set time to noon UTC)
 * and avoids sub-day rounding surprises.
 *
 * Returns null if the timestamp is null or unparseable.
 */
function daysSince(isoTimestamp: string | null): number | null {
  if (!isoTimestamp) return null;
  const pastMs = Date.parse(isoTimestamp);
  if (Number.isNaN(pastMs)) return null;

  // Truncate both sides to midnight UTC to get calendar-day difference
  const pastDate = new Date(pastMs);
  pastDate.setUTCHours(0, 0, 0, 0);

  const todayDate = new Date();
  todayDate.setUTCHours(0, 0, 0, 0);

  const diffMs = todayDate.getTime() - pastDate.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * getStudentSummaries — for each student in the provided list, compute a
 * compact summary of pending actions, intervention recency, active patterns,
 * and the latest plan priority reason.
 *
 * Prepared statements are compiled once and reused across students for
 * efficiency.
 */
export function getStudentSummaries(
  classroomId: ClassroomId,
  students: { alias: string }[],
): StudentSummary[] {
  const db = getDb(classroomId);

  // ── Precompile prepared statements ──────────────────────────────────────

  // Count unapproved family messages that reference a given student
  const stmtPendingMessages = db.prepare<[string, string]>(`
    SELECT COUNT(*) AS cnt
    FROM family_messages
    WHERE classroom_id = ?
      AND teacher_approved = 0
      AND EXISTS (
        SELECT 1 FROM json_each(student_refs) WHERE json_each.value = ?
      )
  `);

  // Most recent intervention for a given student
  const stmtLastIntervention = db.prepare<[string, string]>(`
    SELECT created_at
    FROM interventions
    WHERE classroom_id = ?
      AND EXISTS (
        SELECT 1 FROM json_each(student_refs) WHERE json_each.value = ?
      )
    ORDER BY created_at DESC
    LIMIT 1
  `);

  // ── Fetch latest plan and build priority map ─────────────────────────────

  const latestPlanRow = db.prepare<[string]>(`
    SELECT plan_json
    FROM generated_plans
    WHERE classroom_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(classroomId) as { plan_json: string } | undefined;

  // Map: student_ref → reason from latest plan's support_priorities
  const priorityMap = new Map<string, string>();
  if (latestPlanRow) {
    const plan = safeParseJson<TomorrowPlan>(latestPlanRow.plan_json, "plan");
    if (plan?.support_priorities) {
      for (const sp of plan.support_priorities) {
        priorityMap.set(sp.student_ref, sp.reason);
      }
    }
  }

  // ── Fetch latest pattern report and build focus count map ────────────────

  const latestPatternRow = db.prepare<[string]>(`
    SELECT report_json
    FROM pattern_reports
    WHERE classroom_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(classroomId) as { report_json: string } | undefined;

  // Map: student_ref → count of suggested_focus entries for that student
  const patternCountMap = new Map<string, number>();
  if (latestPatternRow) {
    const report = safeParseJson<SupportPatternReport>(
      latestPatternRow.report_json,
      "pattern-report",
    );
    if (report?.suggested_focus) {
      for (const sf of report.suggested_focus) {
        const prev = patternCountMap.get(sf.student_ref) ?? 0;
        patternCountMap.set(sf.student_ref, prev + 1);
      }
    }
  }

  // ── Build summaries per student ──────────────────────────────────────────

  const historyMap = getInterventionHistoryByStudent(
    classroomId,
    students.map((s) => s.alias),
  );

  return students.map(({ alias }) => {
    const pendingMsgRow = stmtPendingMessages.get(classroomId, alias) as
      | { cnt: number }
      | undefined;
    const pending_message_count = pendingMsgRow?.cnt ?? 0;

    const lastIntRow = stmtLastIntervention.get(classroomId, alias) as
      | { created_at: string }
      | undefined;
    const last_intervention_days = daysSince(lastIntRow?.created_at ?? null);

    const active_pattern_count = patternCountMap.get(alias) ?? 0;

    const latest_priority_reason = priorityMap.get(alias) ?? null;

    // pending_action_count = pending messages + active patterns
    const pending_action_count = pending_message_count + active_pattern_count;

    return {
      alias,
      pending_action_count,
      last_intervention_days,
      active_pattern_count,
      pending_message_count,
      latest_priority_reason,
      intervention_history_14d:
        historyMap.get(alias) ?? new Array(14).fill(0),
    };
  });
}
