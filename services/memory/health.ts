// services/memory/health.ts
import { getDb } from "./db.js";
import type { ClassroomId } from "../../packages/shared/schemas/branded.js";
import type { ClassroomHealth } from "../../packages/shared/schemas/health.js";

function safeParseJson<T>(raw: string, label: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`Corrupt ${label} record skipped:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Return the start-of-day (midnight UTC) ISO string for a date that is
 * `daysAgo` days before today.
 */
function dayStart(daysAgo: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString();
}

/**
 * Return the end-of-day (23:59:59.999 UTC) ISO string for a date that is
 * `daysAgo` days before today.
 */
function dayEnd(daysAgo: number): string {
  const d = new Date();
  d.setUTCHours(23, 59, 59, 999);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString();
}

/**
 * Determine whether any stale follow-up exists on a given day.
 *
 * A stale follow-up is an intervention with follow_up_needed=1 that was
 * created more than 5 days before the day being checked, AND has no
 * subsequent intervention for the same students by the end of that day.
 *
 * For each such intervention we check whether there is a later intervention
 * (created_at > original created_at AND created_at <= dayEnd) that contains
 * at least one of the same student_refs.
 */
function hasStaleFollowUps(
  db: ReturnType<typeof getDb>,
  classroomId: ClassroomId,
  daysAgo: number,
): boolean {
  const staleThreshold = dayStart(daysAgo + 5); // created before this = stale for this day
  const windowEnd = dayEnd(daysAgo);

  // Get all follow_up interventions that are stale candidates for this day
  const staleRows = db.prepare(`
    SELECT record_id, student_refs, created_at
    FROM interventions
    WHERE classroom_id = ?
      AND json_extract(record_json, '$.follow_up_needed') = 1
      AND created_at < ?
  `).all(classroomId, staleThreshold) as { record_id: string; student_refs: string; created_at: string }[];

  if (staleRows.length === 0) return false;

  for (const row of staleRows) {
    const studentRefs = safeParseJson<string[]>(row.student_refs, "student_refs") ?? [];
    if (studentRefs.length === 0) continue;

    // Check if there is any subsequent intervention for any of these students
    // by end of this day
    const hasFollowUp = studentRefs.some((student) => {
      const followUpRow = db.prepare(`
        SELECT 1 FROM interventions
        WHERE classroom_id = ?
          AND created_at > ?
          AND created_at <= ?
          AND EXISTS (
            SELECT 1 FROM json_each(student_refs) WHERE json_each.value = ?
          )
        LIMIT 1
      `).get(classroomId, row.created_at, windowEnd, student) as { 1: number } | undefined;
      return followUpRow !== undefined;
    });

    if (!hasFollowUp) {
      return true; // Found at least one stale item on this day
    }
  }

  return false;
}

export function getClassroomHealth(classroomId: ClassroomId): ClassroomHealth {
  const db = getDb(classroomId);

  // ── 1. streak_days ────────────────────────────────────────────────────────
  // A classroom with no interventions at all has no streak (no activity to
  // evaluate). Streak only counts once the classroom has logged at least one
  // intervention.
  const hasAnyInterventions = (db.prepare(`
    SELECT 1 FROM interventions WHERE classroom_id = ? LIMIT 1
  `).get(classroomId) as { 1: number } | undefined) !== undefined;

  let streak_days = 0;
  if (hasAnyInterventions) {
    for (let i = 0; i < 30; i++) {
      if (hasStaleFollowUps(db, classroomId, i)) {
        break;
      }
      streak_days++;
    }
  }

  // ── 2. plans_last_7 ───────────────────────────────────────────────────────
  const plans_last_7: boolean[] = [];
  for (let i = 0; i < 7; i++) {
    const start = dayStart(i);
    const end = dayEnd(i);
    const row = db.prepare(`
      SELECT 1 FROM generated_plans
      WHERE classroom_id = ?
        AND created_at >= ?
        AND created_at <= ?
      LIMIT 1
    `).get(classroomId, start, end) as { 1: number } | undefined;
    plans_last_7.push(row !== undefined);
  }

  // ── 3. messages_approved / messages_total ─────────────────────────────────
  const windowStart14 = dayStart(13);
  const windowEnd14 = dayEnd(0);

  const msgCounts = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN teacher_approved = 1 THEN 1 ELSE 0 END) AS approved
    FROM family_messages
    WHERE classroom_id = ?
      AND created_at >= ?
      AND created_at <= ?
  `).get(classroomId, windowStart14, windowEnd14) as { total: number; approved: number | null } | undefined;

  const messages_total = msgCounts?.total ?? 0;
  const messages_approved = msgCounts?.approved ?? 0;

  // ── 4. trends.debt_total_14d (oldest first = index 0 = 13 days ago) ───────
  const debt_total_14d: number[] = [];
  for (let i = 13; i >= 0; i--) {
    const staleThreshold = dayStart(i + 5);
    const end = dayEnd(i);

    // Stale follow-ups: interventions with follow_up_needed=1 created before threshold
    const staleCount = (db.prepare(`
      SELECT COUNT(*) AS cnt
      FROM interventions
      WHERE classroom_id = ?
        AND json_extract(record_json, '$.follow_up_needed') = 1
        AND created_at < ?
    `).get(classroomId, staleThreshold) as { cnt: number } | undefined)?.cnt ?? 0;

    // Unapproved messages created before dayEnd (cumulative unapproved as of this day)
    const unapprovedCount = (db.prepare(`
      SELECT COUNT(*) AS cnt
      FROM family_messages
      WHERE classroom_id = ?
        AND teacher_approved = 0
        AND created_at <= ?
    `).get(classroomId, end) as { cnt: number } | undefined)?.cnt ?? 0;

    debt_total_14d.push(staleCount + unapprovedCount);
  }

  // ── 5. trends.plans_14d (oldest first) ────────────────────────────────────
  const plans_14d: (0 | 1)[] = [];
  for (let i = 13; i >= 0; i--) {
    const start = dayStart(i);
    const end = dayEnd(i);
    const row = db.prepare(`
      SELECT 1 FROM generated_plans
      WHERE classroom_id = ?
        AND created_at >= ?
        AND created_at <= ?
      LIMIT 1
    `).get(classroomId, start, end) as { 1: number } | undefined;
    plans_14d.push(row !== undefined ? 1 : 0);
  }

  // ── 6. trends.peak_complexity_14d (oldest first) ──────────────────────────
  const levelMap: Record<string, number> = { low: 1, medium: 2, high: 3 };

  const peak_complexity_14d: number[] = [];
  for (let i = 13; i >= 0; i--) {
    const start = dayStart(i);
    const end = dayEnd(i);

    // Get the latest forecast created within this day
    const forecastRow = db.prepare(`
      SELECT forecast_json FROM complexity_forecasts
      WHERE classroom_id = ?
        AND created_at >= ?
        AND created_at <= ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(classroomId, start, end) as { forecast_json: string } | undefined;

    if (!forecastRow) {
      peak_complexity_14d.push(0);
      continue;
    }

    const forecast = safeParseJson<{ blocks?: { level?: string }[] }>(
      forecastRow.forecast_json,
      "forecast",
    );

    if (!forecast?.blocks || forecast.blocks.length === 0) {
      peak_complexity_14d.push(0);
      continue;
    }

    let peak = 0;
    for (const block of forecast.blocks) {
      const level = levelMap[block.level ?? ""] ?? 0;
      if (level > peak) peak = level;
    }
    peak_complexity_14d.push(peak);
  }

  return {
    streak_days,
    plans_last_7,
    messages_approved,
    messages_total,
    trends: {
      debt_total_14d,
      plans_14d,
      peak_complexity_14d,
    },
  };
}
