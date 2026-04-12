/**
 * evidence-generate.ts — Reads classroom SQLite databases and request logs
 * to produce markdown evidence reports for the PrairieClassroom portfolio.
 *
 * Usage:
 *   npx tsx scripts/evidence-generate.ts
 *
 * Outputs:
 *   docs/evidence/feedback-summary.md
 *   docs/evidence/session-patterns.md
 *   docs/evidence/system-reliability.md
 */

import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";

const MEMORY_DIR = process.env.PRAIRIE_MEMORY_DIR || path.resolve("data/memory");
const LOGS_DIR = path.resolve("output/request-logs");
const OUTPUT_DIR = path.resolve("docs/evidence");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sqliteFiles(): string[] {
  if (!fs.existsSync(MEMORY_DIR)) return [];
  return fs.readdirSync(MEMORY_DIR)
    .filter((f) => f.endsWith(".sqlite"))
    .map((f) => path.join(MEMORY_DIR, f));
}

function jsonlFiles(): string[] {
  if (!fs.existsSync(LOGS_DIR)) return [];
  return fs.readdirSync(LOGS_DIR)
    .filter((f) => f.endsWith(".jsonl"))
    .sort()
    .map((f) => path.join(LOGS_DIR, f));
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

interface TableInfo { name: string }

function tableExists(db: Database.Database, name: string): boolean {
  const row = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
  ).get(name) as TableInfo | undefined;
  return !!row;
}

// ---------------------------------------------------------------------------
// Feedback summary
// ---------------------------------------------------------------------------

interface FeedbackRow {
  classroom_id: string;
  panel_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

function generateFeedbackSummary(): string {
  const lines: string[] = [
    `# Feedback Summary`,
    ``,
    `*Generated ${today()}*`,
    ``,
  ];

  const allRows: FeedbackRow[] = [];

  for (const file of sqliteFiles()) {
    const db = new Database(file, { readonly: true });
    try {
      if (!tableExists(db, "feedback")) continue;
      const rows = db.prepare("SELECT * FROM feedback ORDER BY created_at DESC").all() as FeedbackRow[];
      allRows.push(...rows);
    } finally {
      db.close();
    }
  }

  if (allRows.length === 0) {
    lines.push("No feedback records found in any classroom database.");
    lines.push("");
    lines.push("This is expected if the feedback API has not yet been exercised.");
    return lines.join("\n");
  }

  lines.push(`**Total feedback entries:** ${allRows.length}`);
  lines.push(``);

  // Per-panel breakdown
  const byPanel = new Map<string, { count: number; totalRating: number; comments: string[] }>();
  for (const row of allRows) {
    const key = row.panel_id || "unknown";
    const entry = byPanel.get(key) || { count: 0, totalRating: 0, comments: [] };
    entry.count++;
    entry.totalRating += row.rating;
    if (row.comment) entry.comments.push(row.comment);
    byPanel.set(key, entry);
  }

  lines.push(`## Per-Panel Breakdown`);
  lines.push(``);
  lines.push(`| Panel | Count | Avg Rating | Comments |`);
  lines.push(`|-------|-------|------------|----------|`);

  for (const [panel, data] of Array.from(byPanel.entries()).sort((a, b) => b[1].count - a[1].count)) {
    const avg = (data.totalRating / data.count).toFixed(2);
    const commentCount = data.comments.length;
    lines.push(`| ${panel} | ${data.count} | ${avg} | ${commentCount} |`);
  }

  lines.push(``);

  // Recent comments
  const withComments = allRows.filter((r) => r.comment).slice(0, 10);
  if (withComments.length > 0) {
    lines.push(`## Recent Comments (up to 10)`);
    lines.push(``);
    for (const row of withComments) {
      lines.push(`- **${row.panel_id}** (rating ${row.rating}, ${row.created_at}): ${row.comment}`);
    }
    lines.push(``);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Session patterns
// ---------------------------------------------------------------------------

interface SessionRow {
  classroom_id: string;
  session_id: string;
  started_at: string;
  ended_at: string;
  panels_visited: string;
  generations_triggered: string;
  feedback_count: number;
}

function generateSessionPatterns(): string {
  const lines: string[] = [
    `# Session Patterns`,
    ``,
    `*Generated ${today()}*`,
    ``,
  ];

  const allRows: SessionRow[] = [];

  for (const file of sqliteFiles()) {
    const db = new Database(file, { readonly: true });
    try {
      if (!tableExists(db, "sessions")) continue;
      const rows = db.prepare("SELECT * FROM sessions ORDER BY started_at DESC").all() as SessionRow[];
      allRows.push(...rows);
    } finally {
      db.close();
    }
  }

  if (allRows.length === 0) {
    lines.push("No session records found in any classroom database.");
    lines.push("");
    lines.push("This is expected if the session tracking API has not yet been exercised.");
    return lines.join("\n");
  }

  lines.push(`**Total sessions:** ${allRows.length}`);
  lines.push(``);

  // Duration stats
  const durations: number[] = [];
  const flowCounts = new Map<string, number>();

  for (const row of allRows) {
    const start = new Date(row.started_at).getTime();
    const end = new Date(row.ended_at).getTime();
    if (!isNaN(start) && !isNaN(end) && end > start) {
      durations.push((end - start) / 60_000);
    }

    try {
      const panels: string[] = JSON.parse(row.panels_visited);
      if (panels.length >= 2) {
        const key = panels.join(" -> ");
        flowCounts.set(key, (flowCounts.get(key) || 0) + 1);
      }
    } catch { /* skip malformed */ }
  }

  if (durations.length > 0) {
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const sorted = [...durations].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    lines.push(`## Duration`);
    lines.push(``);
    lines.push(`- Average: ${avg.toFixed(1)} minutes`);
    lines.push(`- Median: ${median.toFixed(1)} minutes`);
    lines.push(`- Range: ${sorted[0].toFixed(1)} - ${sorted[sorted.length - 1].toFixed(1)} minutes`);
    lines.push(``);
  }

  // Common flows
  const topFlows = Array.from(flowCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (topFlows.length > 0) {
    lines.push(`## Common Workflows`);
    lines.push(``);
    lines.push(`| Flow | Count |`);
    lines.push(`|------|-------|`);
    for (const [flow, count] of topFlows) {
      lines.push(`| ${flow} | ${count} |`);
    }
    lines.push(``);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// System reliability
// ---------------------------------------------------------------------------

interface LogEntry {
  timestamp?: string;
  route?: string;
  status_code?: number;
  request_duration_ms?: number;
  inference_provider?: string;
  prompt_class?: string;
  injection_suspected?: boolean;
}

function generateSystemReliability(): string {
  const lines: string[] = [
    `# System Reliability`,
    ``,
    `*Generated ${today()}*`,
    ``,
  ];

  const files = jsonlFiles();
  if (files.length === 0) {
    lines.push("No request log files found in `output/request-logs/`.");
    return lines.join("\n");
  }

  let totalRequests = 0;
  let successCount = 0;
  let errorCount = 0;
  let injectionCount = 0;
  const latencies: number[] = [];
  const routeCounts = new Map<string, number>();
  const providerCounts = new Map<string, number>();
  const errorCodes = new Map<number, number>();
  const dateRange = { first: "", last: "" };

  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      let entry: LogEntry;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }

      totalRequests++;

      if (entry.timestamp) {
        if (!dateRange.first || entry.timestamp < dateRange.first) dateRange.first = entry.timestamp;
        if (!dateRange.last || entry.timestamp > dateRange.last) dateRange.last = entry.timestamp;
      }

      const status = entry.status_code ?? 0;
      if (status >= 200 && status < 400) {
        successCount++;
      } else if (status >= 400) {
        errorCount++;
        errorCodes.set(status, (errorCodes.get(status) || 0) + 1);
      }

      if (entry.request_duration_ms != null && entry.request_duration_ms > 0) {
        latencies.push(entry.request_duration_ms);
      }

      if (entry.route) {
        routeCounts.set(entry.route, (routeCounts.get(entry.route) || 0) + 1);
      }

      if (entry.inference_provider) {
        providerCounts.set(entry.inference_provider, (providerCounts.get(entry.inference_provider) || 0) + 1);
      }

      if (entry.injection_suspected) injectionCount++;
    }
  }

  lines.push(`**Log files analysed:** ${files.length}`);
  lines.push(`**Date range:** ${dateRange.first.slice(0, 10)} to ${dateRange.last.slice(0, 10)}`);
  lines.push(`**Total requests:** ${totalRequests}`);
  lines.push(``);

  // Success rate
  const successRate = totalRequests > 0 ? ((successCount / totalRequests) * 100).toFixed(1) : "N/A";
  lines.push(`## Reliability`);
  lines.push(``);
  lines.push(`- Success rate (2xx/3xx): **${successRate}%** (${successCount} / ${totalRequests})`);
  lines.push(`- Client/server errors: ${errorCount}`);
  if (injectionCount > 0) {
    lines.push(`- Injection attempts detected: ${injectionCount}`);
  }
  lines.push(``);

  // Error breakdown
  if (errorCodes.size > 0) {
    lines.push(`## Error Codes`);
    lines.push(``);
    lines.push(`| Status | Count |`);
    lines.push(`|--------|-------|`);
    for (const [code, count] of Array.from(errorCodes.entries()).sort((a, b) => b[1] - a[1])) {
      lines.push(`| ${code} | ${count} |`);
    }
    lines.push(``);
  }

  // Latency stats
  if (latencies.length > 0) {
    const sorted = [...latencies].sort((a, b) => a - b);
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    lines.push(`## Latency (ms)`);
    lines.push(``);
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Average | ${avg.toFixed(0)} |`);
    lines.push(`| P50 | ${p50} |`);
    lines.push(`| P95 | ${p95} |`);
    lines.push(`| P99 | ${p99} |`);
    lines.push(``);
  }

  // Top routes
  const topRoutes = Array.from(routeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  if (topRoutes.length > 0) {
    lines.push(`## Top Routes`);
    lines.push(``);
    lines.push(`| Route | Count |`);
    lines.push(`|-------|-------|`);
    for (const [route, count] of topRoutes) {
      lines.push(`| ${route} | ${count} |`);
    }
    lines.push(``);
  }

  // Inference providers
  if (providerCounts.size > 0) {
    lines.push(`## Inference Providers`);
    lines.push(``);
    lines.push(`| Provider | Count |`);
    lines.push(`|----------|-------|`);
    for (const [provider, count] of Array.from(providerCounts.entries()).sort((a, b) => b[1] - a[1])) {
      lines.push(`| ${provider} | ${count} |`);
    }
    lines.push(``);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  ensureDir(OUTPUT_DIR);

  console.log("Generating feedback summary...");
  const feedbackMd = generateFeedbackSummary();
  fs.writeFileSync(path.join(OUTPUT_DIR, "feedback-summary.md"), feedbackMd);

  console.log("Generating session patterns...");
  const sessionMd = generateSessionPatterns();
  fs.writeFileSync(path.join(OUTPUT_DIR, "session-patterns.md"), sessionMd);

  console.log("Generating system reliability...");
  const reliabilityMd = generateSystemReliability();
  fs.writeFileSync(path.join(OUTPUT_DIR, "system-reliability.md"), reliabilityMd);

  console.log(`Evidence reports written to ${OUTPUT_DIR}/`);
}

main();
