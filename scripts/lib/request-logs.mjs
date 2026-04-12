import { readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";

function parseJsonLine(line) {
  if (!line.trim()) {
    return null;
  }
  return JSON.parse(line);
}

export async function readRequestLogRecords(filePath) {
  const raw = await readFile(filePath, "utf8");
  return raw
    .split("\n")
    .map(parseJsonLine)
    .filter(Boolean);
}

export async function listRequestLogFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".jsonl"))
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

export async function findLatestRequestLogFile(dir) {
  const files = await listRequestLogFiles(dir);
  return files.at(-1) ?? null;
}

export function summarizeRequestLogs(records) {
  const countsByRoute = {};
  const countsByCategory = {};
  let retryableCount = 0;
  let nonRetryableCount = 0;
  let injectionSuspectedCount = 0;

  for (const record of records) {
    const route = record.route ?? "unknown";
    countsByRoute[route] = (countsByRoute[route] ?? 0) + 1;

    const category = record.category ?? "uncategorized";
    countsByCategory[category] = (countsByCategory[category] ?? 0) + 1;

    if (record.retryable) {
      retryableCount += 1;
    } else {
      nonRetryableCount += 1;
    }

    if (record.injection_suspected) {
      injectionSuspectedCount += 1;
    }
  }

  const recentNon200 = records
    .filter((record) => typeof record.status_code === "number" && record.status_code !== 200)
    .slice(-10)
    .reverse()
    .map((record) => ({
      timestamp: record.timestamp ?? null,
      request_id: record.request_id ?? null,
      route: record.route ?? null,
      status_code: record.status_code ?? null,
      category: record.category ?? null,
      detail_code: record.detail_code ?? null,
      retryable: Boolean(record.retryable),
    }));

  return {
    total_records: records.length,
    counts_by_route: countsByRoute,
    counts_by_category: countsByCategory,
    retryable: retryableCount,
    non_retryable: nonRetryableCount,
    injection_suspected: injectionSuspectedCount,
    recent_non_200: recentNon200,
  };
}

function cutoffDate(days, now) {
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  cutoff.setUTCHours(0, 0, 0, 0);
  return cutoff;
}

// Audit-outcome codes that represent a denial. Kept in sync with auth.ts
// detail_code vocabulary and AuthOutcome in request-context.ts.
const DENIAL_OUTCOMES = new Set([
  "classroom_code_missing",
  "classroom_code_invalid",
  "classroom_role_invalid",
  "classroom_role_forbidden",
]);

function matchesOutcome(record, outcome) {
  if (!outcome) return true;
  if (outcome === "allowed") return record.auth_outcome === "allowed";
  if (outcome === "denied") return DENIAL_OUTCOMES.has(record.auth_outcome);
  if (outcome === "demo_bypass") return record.auth_outcome === "demo_bypass";
  if (outcome === "all") return true;
  return record.auth_outcome === outcome;
}

function dateKey(timestamp) {
  if (typeof timestamp !== "string") return null;
  return timestamp.slice(0, 10);
}

// Filter request-log records down to the subset that answers pilot-audit
// questions: "Who accessed which classroom, when, under what role, and was
// the access allowed?" All filter fields are optional; omit them to include
// everything.
export function filterAccessAuditRecords(records, filters = {}) {
  const { classroomId, role, outcome, from, to, onlyClassroomContext } = filters;
  return records.filter((record) => {
    if (classroomId && record.classroom_id !== classroomId) return false;
    if (role && record.classroom_role !== role) return false;
    if (onlyClassroomContext && !record.classroom_id) return false;
    if (!matchesOutcome(record, outcome)) return false;
    if (from && dateKey(record.timestamp) && dateKey(record.timestamp) < from) return false;
    if (to && dateKey(record.timestamp) && dateKey(record.timestamp) > to) return false;
    return true;
  });
}

// Aggregate access-audit records into the shape a pilot operator actually
// wants to eyeball: per-classroom counts, per-role counts, per-outcome counts,
// and top-level denial / demo-bypass totals.
export function summarizeAccessAudit(records) {
  const byClassroom = {};
  const byRole = {};
  const byOutcome = {};
  let denialCount = 0;
  let demoBypassCount = 0;

  for (const record of records) {
    const outcome = record.auth_outcome ?? "unknown";
    byOutcome[outcome] = (byOutcome[outcome] ?? 0) + 1;
    if (DENIAL_OUTCOMES.has(outcome)) denialCount += 1;
    if (outcome === "demo_bypass") demoBypassCount += 1;

    if (record.classroom_id) {
      const bucket =
        byClassroom[record.classroom_id] ??
        (byClassroom[record.classroom_id] = { total: 0, by_outcome: {} });
      bucket.total += 1;
      bucket.by_outcome[outcome] = (bucket.by_outcome[outcome] ?? 0) + 1;
    }

    if (record.classroom_role) {
      byRole[record.classroom_role] = (byRole[record.classroom_role] ?? 0) + 1;
    }
  }

  return {
    total_records: records.length,
    by_classroom: byClassroom,
    by_role: byRole,
    by_outcome: byOutcome,
    denial_count: denialCount,
    demo_bypass_count: demoBypassCount,
  };
}

export async function pruneRequestLogFiles(dir, { days = 14, now = new Date() } = {}) {
  const files = await listRequestLogFiles(dir);
  const cutoff = cutoffDate(days, now);
  const removed = [];

  for (const file of files) {
    const basename = path.basename(file, ".jsonl");
    const fileDate = new Date(`${basename}T00:00:00.000Z`);
    if (Number.isNaN(fileDate.getTime())) {
      continue;
    }
    if (fileDate < cutoff) {
      await rm(file, { force: true });
      removed.push(file);
    }
  }

  return removed;
}
