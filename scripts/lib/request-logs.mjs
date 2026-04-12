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
