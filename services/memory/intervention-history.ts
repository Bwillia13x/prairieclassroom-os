// services/memory/intervention-history.ts
import { getDb } from "./db.js";
import type { ClassroomId } from "../../packages/shared/schemas/branded.js";

const HISTORY_DAYS = 14;
const MS_PER_DAY = 86_400_000;

/**
 * For each student alias, return a length-14 array of integer counts
 * representing how many interventions touched that student per UTC day,
 * oldest-first. Index 0 is 13 days ago, index 13 is today.
 *
 * Bucketing is by UTC calendar day. An intervention logged near local
 * midnight (Alberta is UTC-6 or UTC-7) may appear on a different
 * sparkline day than the teacher's local calendar.
 *
 * Aliases with zero matching interventions still receive a zero-filled
 * length-14 array, so callers can iterate without nullish handling.
 */
export function getInterventionHistoryByStudent(
  classroomId: ClassroomId,
  aliases: string[],
): Map<string, number[]> {
  const result = new Map<string, number[]>();
  for (const alias of aliases) {
    result.set(alias, new Array(HISTORY_DAYS).fill(0));
  }

  if (aliases.length === 0) return result;

  const db = getDb(classroomId);

  // Today, truncated to UTC midnight, in ISO form for SQL comparison.
  const todayMidnight = new Date();
  todayMidnight.setUTCHours(0, 0, 0, 0);
  const windowStartMs = todayMidnight.getTime() - (HISTORY_DAYS - 1) * MS_PER_DAY;
  const windowStartIso = new Date(windowStartMs).toISOString();

  const rows = db.prepare<[string, string]>(`
    SELECT student_refs, created_at
    FROM interventions
    WHERE classroom_id = ?
      AND created_at >= ?
  `).all(classroomId, windowStartIso) as Array<{
    student_refs: string;
    created_at: string;
  }>;

  for (const row of rows) {
    let refs: string[];
    try {
      refs = JSON.parse(row.student_refs);
    } catch {
      continue;
    }
    if (!Array.isArray(refs)) continue;

    const tsMs = Date.parse(row.created_at);
    if (Number.isNaN(tsMs)) continue;

    const eventDate = new Date(tsMs);
    eventDate.setUTCHours(0, 0, 0, 0);
    const dayDiff = Math.round(
      (todayMidnight.getTime() - eventDate.getTime()) / MS_PER_DAY,
    );
    if (dayDiff < 0 || dayDiff >= HISTORY_DAYS) continue;
    const index = HISTORY_DAYS - 1 - dayDiff;

    for (const alias of refs) {
      const series = result.get(alias);
      if (series) series[index] += 1;
    }
  }

  return result;
}
