#!/usr/bin/env node
/**
 * cost-status.mjs — Print today's Gemma spend vs. the daily cap.
 *
 * Reads the live in-process accumulator at output/cost-budget/today.json
 * (written by services/orchestrator/cost-budget.ts on every Gemma call).
 *
 * Use this before kicking off a release:gate:gemini run to see headroom.
 *
 *   $ npm run cost:status
 *   2026-04-17 spend: $0.0042 of $20.00 (0.02%) — 3 calls
 *   Headroom: $19.9958 — gate is OK to run.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
const STATE_FILE = process.env.PRAIRIE_COST_STATE_DIR
  ? resolve(process.env.PRAIRIE_COST_STATE_DIR, "today.json")
  : resolve(ROOT, "output", "cost-budget", "today.json");

const DEFAULT_BUDGET_USD = 20;
const today = new Date().toISOString().slice(0, 10);

const budgetRaw = (process.env.PRAIRIE_DAILY_BUDGET_USD ?? "").trim();
const budgetParsed = Number.parseFloat(budgetRaw);
const budget =
  Number.isFinite(budgetParsed) && budgetParsed >= 0 ? budgetParsed : DEFAULT_BUDGET_USD;

let spend = 0;
let callCount = 0;
let stateDate = today;
let statePresent = false;

if (existsSync(STATE_FILE)) {
  try {
    const parsed = JSON.parse(readFileSync(STATE_FILE, "utf8"));
    if (parsed && typeof parsed === "object") {
      stateDate = typeof parsed.date === "string" ? parsed.date : today;
      spend = typeof parsed.spend_usd === "number" ? parsed.spend_usd : 0;
      callCount = typeof parsed.call_count === "number" ? parsed.call_count : 0;
      statePresent = true;
    }
  } catch {
    // fall through to "no state" output
  }
}

const isCurrent = stateDate === today;
const effectiveSpend = isCurrent ? spend : 0;
const effectiveCalls = isCurrent ? callCount : 0;
const headroom = budget - effectiveSpend;
const pct = budget > 0 ? (effectiveSpend / budget) * 100 : 0;

if (budget === 0) {
  console.log(`${today} budget enforcement DISABLED (PRAIRIE_DAILY_BUDGET_USD=0)`);
  console.log(`  Today's spend (informational): $${effectiveSpend.toFixed(4)} across ${effectiveCalls} calls`);
  process.exit(0);
}

console.log(
  `${today} spend: $${effectiveSpend.toFixed(4)} of $${budget.toFixed(2)} (${pct.toFixed(2)}%) — ${effectiveCalls} calls`,
);

if (!statePresent) {
  console.log("  No state file yet — no Gemma calls have been billed today.");
} else if (!isCurrent) {
  console.log(`  Note: state file is from ${stateDate}; it will reset on the next Gemma call.`);
}

if (headroom <= 0) {
  console.log(`  OVER CAP by $${(-headroom).toFixed(4)}. Further calls will be refused with 429 cost_budget.`);
  process.exit(2);
}

if (headroom < budget * 0.1) {
  console.log(`  Headroom: $${headroom.toFixed(4)} — under 10% remaining, gate runs may exhaust budget.`);
} else {
  console.log(`  Headroom: $${headroom.toFixed(4)} — gate is OK to run.`);
}
