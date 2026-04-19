/**
 * localStorage-backed store for prep-checklist completion state.
 * Scoped by classroomId + plan date so yesterday's ticks don't bleed into today.
 * See audit #24.
 */

const PREFIX = "prairie-prep-checklist:";

function key(classroomId: string, planDate: string): string {
  return `${PREFIX}${classroomId}:${planDate}`;
}

function read(k: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(k);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed.filter((v) => typeof v === "string"));
    return new Set();
  } catch {
    return new Set();
  }
}

function write(k: string, set: Set<string>): void {
  try {
    window.localStorage.setItem(k, JSON.stringify([...set]));
  } catch {
    /* storage unavailable; state is session-only */
  }
}

export function getCompleted(classroomId: string, planDate: string): Set<string> {
  return read(key(classroomId, planDate));
}

export function toggle(classroomId: string, planDate: string, item: string): Set<string> {
  const k = key(classroomId, planDate);
  const set = read(k);
  if (set.has(item)) set.delete(item);
  else set.add(item);
  write(k, set);
  return set;
}

export function reset(classroomId: string, planDate: string): void {
  write(key(classroomId, planDate), new Set());
}
