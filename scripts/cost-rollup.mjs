#!/usr/bin/env node
/**
 * cost-rollup.mjs — Aggregate daily Gemma token usage and estimated cost
 * from request-logs into a single JSON snapshot.
 *
 * Usage:
 *   node scripts/cost-rollup.mjs                     # today
 *   node scripts/cost-rollup.mjs --date 2026-04-15
 *   node scripts/cost-rollup.mjs --since 2026-04-10  # multi-day rollup
 *
 * Pricing assumptions are operator-facing estimates only — update as Google
 * publishes per-1k-token pricing for Gemma 4 hosted endpoints. Vertex
 * self-deploy lanes report tokens but no $ (compute is billed separately).
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
const LOG_DIR = join(ROOT, "output", "request-logs");
const OUT_DIR = join(ROOT, "output", "cost-rollups");

// Per-1k-token estimates in USD. Treat as ceiling — actual billing may be lower.
// Gemma 4 hosted via Gemini API; Ollama is local (free); mock is free.
const PRICE_PER_1K_INPUT = {
  "gemma-4-26b-a4b-it": 0.000125,
  "gemma-4-31b-it": 0.00015,
  "google/gemma-4-4b-it": 0,        // self-deploy: compute billed elsewhere
  "google/gemma-4-27b-it": 0,
  "gemma4:4b": 0,                    // ollama: local
  "gemma4:27b": 0,
  mock: 0,
};
const PRICE_PER_1K_OUTPUT = {
  "gemma-4-26b-a4b-it": 0.000375,
  "gemma-4-31b-it": 0.0006,
  "google/gemma-4-4b-it": 0,
  "google/gemma-4-27b-it": 0,
  "gemma4:4b": 0,
  "gemma4:27b": 0,
  mock: 0,
};

const args = parseArgs(process.argv.slice(2));
const today = new Date().toISOString().slice(0, 10);
const targetDates = args.since ? expandSince(args.since, today) : [args.date ?? today];

const aggregated = {
  generated_at: new Date().toISOString(),
  date_range: { from: targetDates[0], to: targetDates[targetDates.length - 1] },
  daily: [],
  totals: emptyTotals(),
};

for (const date of targetDates) {
  const path = join(LOG_DIR, `${date}.jsonl`);
  if (!existsSync(path)) {
    aggregated.daily.push({ date, present: false, totals: emptyTotals() });
    continue;
  }
  const dayTotals = aggregateDay(path);
  aggregated.daily.push({ date, present: true, totals: dayTotals });
  mergeTotals(aggregated.totals, dayTotals);
}

mkdirSync(OUT_DIR, { recursive: true });
const outFile = join(OUT_DIR, `${today}-rollup.json`);
writeFileSync(outFile, `${JSON.stringify(aggregated, null, 2)}\n`, "utf8");

const totalDollars = aggregated.totals.estimated_usd.toFixed(4);
console.log(`cost-rollup → ${outFile}`);
console.log(`  ${targetDates.length} day(s), ${aggregated.totals.calls} calls, ${aggregated.totals.total_tokens} tokens, ~$${totalDollars}`);

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--date" && argv[i + 1]) { out.date = argv[++i]; }
    else if (argv[i] === "--since" && argv[i + 1]) { out.since = argv[++i]; }
  }
  return out;
}

function expandSince(fromIso, toIso) {
  const out = [];
  const cursor = new Date(`${fromIso}T00:00:00Z`);
  const stop = new Date(`${toIso}T00:00:00Z`);
  while (cursor.getTime() <= stop.getTime()) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

function emptyTotals() {
  return {
    calls: 0,
    prompt_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
    estimated_usd: 0,
    by_provider: {},
    by_prompt_class: {},
    by_model: {},
  };
}

function aggregateDay(path) {
  const totals = emptyTotals();
  const lines = readFileSync(path, "utf8").split("\n").filter((l) => l.trim());

  for (const line of lines) {
    let record;
    try { record = JSON.parse(line); } catch { continue; }
    if (record.prompt_tokens === null && record.output_tokens === null) continue;

    const promptT = Number(record.prompt_tokens ?? 0);
    const outputT = Number(record.output_tokens ?? 0);
    const totalT = Number(record.total_tokens ?? promptT + outputT);

    totals.calls += 1;
    totals.prompt_tokens += promptT;
    totals.output_tokens += outputT;
    totals.total_tokens += totalT;

    const provider = record.inference_provider ?? "unknown";
    const promptClass = record.prompt_class ?? "unknown";
    const modelId = record.model_id ?? provider;

    const inPrice = PRICE_PER_1K_INPUT[modelId] ?? PRICE_PER_1K_INPUT[provider] ?? 0;
    const outPrice = PRICE_PER_1K_OUTPUT[modelId] ?? PRICE_PER_1K_OUTPUT[provider] ?? 0;
    const callCost = (promptT / 1000) * inPrice + (outputT / 1000) * outPrice;
    totals.estimated_usd += callCost;

    bumpBucket(totals.by_provider, provider, promptT, outputT, callCost);
    bumpBucket(totals.by_prompt_class, promptClass, promptT, outputT, callCost);
    bumpBucket(totals.by_model, modelId, promptT, outputT, callCost);
  }

  return totals;
}

function bumpBucket(bucket, key, promptT, outputT, dollars) {
  if (!bucket[key]) {
    bucket[key] = { calls: 0, prompt_tokens: 0, output_tokens: 0, estimated_usd: 0 };
  }
  bucket[key].calls += 1;
  bucket[key].prompt_tokens += promptT;
  bucket[key].output_tokens += outputT;
  bucket[key].estimated_usd += dollars;
}

function mergeTotals(into, from) {
  into.calls += from.calls;
  into.prompt_tokens += from.prompt_tokens;
  into.output_tokens += from.output_tokens;
  into.total_tokens += from.total_tokens;
  into.estimated_usd += from.estimated_usd;
  for (const [k, v] of Object.entries(from.by_provider)) mergeBucket(into.by_provider, k, v);
  for (const [k, v] of Object.entries(from.by_prompt_class)) mergeBucket(into.by_prompt_class, k, v);
  for (const [k, v] of Object.entries(from.by_model)) mergeBucket(into.by_model, k, v);
}

function mergeBucket(bucket, key, value) {
  if (!bucket[key]) {
    bucket[key] = { calls: 0, prompt_tokens: 0, output_tokens: 0, estimated_usd: 0 };
  }
  bucket[key].calls += value.calls;
  bucket[key].prompt_tokens += value.prompt_tokens;
  bucket[key].output_tokens += value.output_tokens;
  bucket[key].estimated_usd += value.estimated_usd;
}
