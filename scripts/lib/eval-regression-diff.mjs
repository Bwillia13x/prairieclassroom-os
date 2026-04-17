/**
 * Pure helpers for the eval-regression script. Kept in a sibling module so
 * vitest can import them without spawning a child process.
 */

/**
 * Compare two eval summary artifacts and return a list of regression findings.
 * A regression is one of:
 *   - aggregate pass rate dropped vs the previous run
 *   - the set of failing case IDs grew (a previously-passing case now fails)
 *   - a model present in the previous run is missing from the current one
 *
 * Both summaries are the JSON shape written by evals/runner.ts:
 *   { passed_cases, failed_cases, total_cases, models, failing_cases: [{ case_id }] }
 */
export function diffSummaries(prev, curr) {
  const findings = [];

  const prevRate = ratio(prev.passed_cases, prev.total_cases);
  const currRate = ratio(curr.passed_cases, curr.total_cases);
  if (currRate < prevRate) {
    findings.push(
      `pass rate dropped: ${(prevRate * 100).toFixed(1)}% → ${(currRate * 100).toFixed(1)}% (${prev.passed_cases}/${prev.total_cases} → ${curr.passed_cases}/${curr.total_cases})`,
    );
  }

  const prevFailing = new Set((prev.failing_cases ?? []).map((c) => (typeof c === "object" ? c.case_id : c)));
  const currFailing = new Set((curr.failing_cases ?? []).map((c) => (typeof c === "object" ? c.case_id : c)));
  const newlyFailing = [...currFailing].filter((id) => !prevFailing.has(id));
  if (newlyFailing.length > 0) {
    findings.push(`newly failing case(s): ${newlyFailing.join(", ")}`);
  }

  const prevModels = new Set(prev.models ?? []);
  const currModels = new Set(curr.models ?? []);
  const droppedModels = [...prevModels].filter((m) => !currModels.has(m));
  if (droppedModels.length > 0) {
    findings.push(`model(s) dropped from run: ${droppedModels.join(", ")}`);
  }

  return findings;
}

/** Numerator/denominator with safe handling of zero/missing total. */
export function ratio(numerator, denominator) {
  if (!denominator || denominator <= 0) return 1;
  return numerator / denominator;
}

/**
 * Compute the per-endpoint P95 latency (ms) from a results.json artifact's
 * `results` array. Only counts cases that passed — failed cases often time
 * out and would skew the latency distribution downward (the 502/timeout
 * rejection happens fast, not the actual generation).
 *
 * Returns Map<endpoint, p95_ms>. Endpoints with fewer than `minSamples`
 * results are excluded so a single slow run can't trigger a false positive.
 */
export function p95LatencyByEndpoint(results, minSamples = 2) {
  if (!Array.isArray(results)) return new Map();

  const byEndpoint = new Map();
  for (const result of results) {
    if (!result || typeof result !== "object") continue;
    if (result.passed !== true) continue; // exclude failures from latency stats
    const endpoint = typeof result.endpoint === "string" ? result.endpoint : null;
    const latency = typeof result.latency_ms === "number" ? result.latency_ms : null;
    if (!endpoint || latency === null || !Number.isFinite(latency)) continue;
    if (!byEndpoint.has(endpoint)) byEndpoint.set(endpoint, []);
    byEndpoint.get(endpoint).push(latency);
  }

  const out = new Map();
  for (const [endpoint, samples] of byEndpoint) {
    if (samples.length < minSamples) continue;
    samples.sort((a, b) => a - b);
    out.set(endpoint, percentile(samples, 95));
  }
  return out;
}

function percentile(sorted, p) {
  // Standard "nearest rank" P95 with linear interpolation between samples.
  // For very small N (2-3 samples) this still degrades gracefully.
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  const fraction = rank - lo;
  return sorted[lo] + (sorted[hi] - sorted[lo]) * fraction;
}

/**
 * Compare two per-endpoint P95 latency maps. Flag any endpoint where the
 * current P95 grew by more than `growthThreshold` (default 0.20 = 20%).
 * Endpoints that disappeared from the current run are reported separately
 * since that's a coverage regression, not a latency regression.
 */
export function diffLatency(prevP95, currP95, growthThreshold = 0.20) {
  const findings = [];
  for (const [endpoint, currMs] of currP95) {
    const prevMs = prevP95.get(endpoint);
    if (prevMs === undefined) continue; // new endpoint — no baseline
    if (prevMs <= 0) continue; // can't compute growth from zero
    const growth = (currMs - prevMs) / prevMs;
    if (growth > growthThreshold) {
      findings.push(
        `${endpoint} P95 latency grew ${(growth * 100).toFixed(1)}% (${formatMs(prevMs)} → ${formatMs(currMs)})`,
      );
    }
  }
  for (const endpoint of prevP95.keys()) {
    if (!currP95.has(endpoint)) {
      findings.push(`${endpoint} dropped from current run (no passing samples)`);
    }
  }
  return findings;
}

function formatMs(ms) {
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}
