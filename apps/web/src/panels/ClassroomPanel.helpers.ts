/**
 * ClassroomPanel.helpers.ts
 *
 * Pure helpers for ClassroomPanel metric derivation. Extracted so the
 * Classroom Pulse counts can be unit-tested without rendering the full
 * panel (which depends on AppContext, SessionContext, multiple async
 * actions, and several heavy data-viz children).
 *
 * Background: the orchestrator's `student_threads` field is built by
 * `services/memory/triage.ts:buildStudentThreads`, which maps over the
 * full `classroom.students` roster. As a result, `student_threads.length`
 * equals the roster size (e.g. 26 for `demo-okafor-grade34`). Using it
 * directly as the "Threads" stat made THREADS visually equal STUDENTS,
 * contradicting the demo seed contract (8 active + 7 watch + 11
 * strength-only = 26).
 *
 * `countActionableThreads` filters to threads that actually carry
 * something to do or track — see the predicate below.
 */
import type { StudentThread } from "../types";

/**
 * A thread is "actionable" — meaning it deserves to be counted on the
 * "Threads" stat — when it carries any signal: a derived `thread_count`,
 * a pending action, a pending message, an active pattern, or a populated
 * `actions[]` array.
 *
 * Strength-only roster entries (the 11 light-touch students in the
 * tiered seed) have all of these as 0 / empty and are correctly excluded.
 */
export function isActionableThread(thread: StudentThread): boolean {
  if (thread.thread_count > 0) return true;
  if (thread.pending_action_count > 0) return true;
  if (thread.pending_message_count > 0) return true;
  if (thread.active_pattern_count > 0) return true;
  if (thread.actions && thread.actions.length > 0) return true;
  return false;
}

/**
 * Count of student threads that are actionable. Returns null when the
 * snapshot has not loaded yet (so the hero stat can render an em-dash).
 */
export function countActionableThreads(
  threads: StudentThread[] | undefined,
): number | null {
  if (!threads) return null;
  return threads.filter(isActionableThread).length;
}
