#!/usr/bin/env node
/**
 * eval-regression.mjs — Compare the latest two eval summary artifacts for a
 * given lane (mock / ollama / gemini / real / api) and flag regressions.
 *
 * A "regression" is one of:
 *   - aggregate pass rate dropped (passed_cases / total_cases fell vs prev)
 *   - the set of failing case IDs grew (a previously-passing case is now failing)
 *   - the model list shrank (something dropped — usually a tier removed)
 *
 * Exits:
 *   0  — no regression (or fewer than 2 summaries to compare)
 *   1  — regression detected
 *   2  — usage / IO error
 *
 * Usage:
 *   node scripts/eval-regression.mjs                       # default lane = mock
 *   node scripts/eval-regression.mjs --lane gemini
 *   node scripts/eval-regression.mjs --lane ollama --max-age-days 14
 *
 * Wires nicely into release-gate as a final guard:
 *   npm run release:gate && npm run eval:regression
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { diffSummaries, p95LatencyByEndpoint, diffLatency } from "./lib/eval-regression-diff.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
const EVAL_ROOT = join(ROOT, "output", "evals");

const args = parseArgs(process.argv.slice(2));
const lane = (args.lane ?? "mock").toLowerCase();
const maxAgeDays = Number.isFinite(args.maxAgeDays) ? args.maxAgeDays : 30;

const summaries = findLatestTwoSummaries(EVAL_ROOT, lane, maxAgeDays);

if (summaries.length === 0) {
  console.log(`eval-regression: no summary artifacts found for lane "${lane}" in the last ${maxAgeDays} days. Skipping.`);
  process.exit(0);
}
if (summaries.length === 1) {
  console.log(
    `eval-regression: only one summary found for lane "${lane}" (${summaries[0].label}). Need a baseline to compare. Skipping.`,
  );
  process.exit(0);
}

const [previous, current] = summaries;
const prev = readSummary(previous.path);
const curr = readSummary(current.path);
if (!prev || !curr) {
  console.error(`eval-regression: failed to parse one of the summary artifacts.`);
  process.exit(2);
}

const findings = diffSummaries(prev, curr);

// Latency-tier checks live in *-results.json (sibling of *-summary.json).
// They're best-effort: if either results file is absent or unparseable we
// just skip the latency check rather than fail the gate.
const latencyFindings = compareLatency(previous.path, current.path);
const allFindings = [...findings, ...latencyFindings];

console.log(`eval-regression: lane="${lane}"`);
console.log(`  previous: ${previous.path.replace(`${ROOT}/`, "")} (passed ${prev.passed_cases}/${prev.total_cases})`);
console.log(`  current:  ${current.path.replace(`${ROOT}/`, "")} (passed ${curr.passed_cases}/${curr.total_cases})`);

if (allFindings.length === 0) {
  console.log(`  OK — no regression detected.`);
  process.exit(0);
}

console.log(`  REGRESSION — ${allFindings.length} finding(s):`);
for (const finding of allFindings) {
  console.log(`    - ${finding}`);
}
process.exit(1);

// ---------------------------------------------------------------------------
// latency comparison
// ---------------------------------------------------------------------------

function compareLatency(prevSummaryPath, currSummaryPath) {
  const prevResults = readResultsAlongside(prevSummaryPath);
  const currResults = readResultsAlongside(currSummaryPath);
  if (!prevResults || !currResults) return [];
  const prevP95 = p95LatencyByEndpoint(prevResults);
  const currP95 = p95LatencyByEndpoint(currResults);
  return diffLatency(prevP95, currP95);
}

function readResultsAlongside(summaryPath) {
  // *-summary.json → *-results.json (same prefix, different suffix).
  const resultsPath = summaryPath.replace(/-summary\.json$/, "-results.json");
  if (resultsPath === summaryPath || !existsSync(resultsPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(resultsPath, "utf8"));
    if (parsed && Array.isArray(parsed.results)) return parsed.results;
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--lane" && argv[i + 1]) { out.lane = argv[++i]; }
    else if (argv[i] === "--max-age-days" && argv[i + 1]) { out.maxAgeDays = Number.parseInt(argv[++i], 10); }
  }
  return out;
}

function findLatestTwoSummaries(evalRoot, lane, maxAgeDays) {
  if (!existsSync(evalRoot)) return [];
  const cutoffMs = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;

  // Eval output dirs are named {YYYY-MM-DD}-{lane}; lane suffix matches.
  const dirs = readdirSync(evalRoot)
    .filter((name) => name.endsWith(`-${lane}`))
    .map((name) => ({ name, full: join(evalRoot, name) }))
    .filter((entry) => {
      try {
        return statSync(entry.full).isDirectory();
      } catch {
        return false;
      }
    });

  // Collect every summary file across all matching dirs, then sort by mtime.
  const summaries = [];
  for (const dir of dirs) {
    const files = readdirSync(dir.full).filter(
      (f) => f.endsWith("-summary.json") && !f.includes("-failure-"),
    );
    for (const file of files) {
      const full = join(dir.full, file);
      try {
        const stat = statSync(full);
        if (stat.mtimeMs < cutoffMs) continue;
        summaries.push({
          path: full,
          label: `${dir.name}/${file}`,
          mtime: stat.mtimeMs,
        });
      } catch {
        // skip
      }
    }
  }

  summaries.sort((a, b) => a.mtime - b.mtime);
  return summaries.slice(-2);
}

function readSummary(path) {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed;
  } catch {
    return null;
  }
}

