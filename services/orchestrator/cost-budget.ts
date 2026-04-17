/**
 * Cost budget tracker for hosted Gemma calls.
 *
 * Maintains a daily-rotating accumulator of estimated USD spend per process.
 * Persists to disk so server restarts don't reset the counter mid-day.
 * Pre-flight check is invoked from `callInference()` before every Gemma call;
 * `recordCallSpend()` is invoked after a successful response so token counts
 * land in the accumulator.
 *
 * Mock and Ollama lanes report no tokens, so they incur zero spend — the
 * budget gate effectively only constrains the hosted Gemini path, which is
 * exactly the behavior the operator-facing $20/day rule cares about.
 *
 * Env vars:
 *   PRAIRIE_DAILY_BUDGET_USD — default 20. Set to 0 to disable enforcement.
 *   PRAIRIE_COST_STATE_DIR  — override the persistence directory (tests).
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const _dirname = import.meta.dirname ?? fileURLToPath(new URL(".", import.meta.url));

// ---------------------------------------------------------------------------
// Pricing — mirror scripts/cost-rollup.mjs. Operator-facing ceiling estimates
// only; update when Google publishes per-1k-token pricing for Gemma 4 hosted.
// Self-deploy lanes (Vertex, Ollama, mock) report tokens but no $.
// ---------------------------------------------------------------------------

const PRICE_PER_1K_INPUT: Record<string, number> = {
  "gemma-4-26b-a4b-it": 0.000125,
  "gemma-4-31b-it": 0.00015,
  "google/gemma-4-4b-it": 0,
  "google/gemma-4-27b-it": 0,
  "gemma4:4b": 0,
  "gemma4:27b": 0,
  mock: 0,
};

const PRICE_PER_1K_OUTPUT: Record<string, number> = {
  "gemma-4-26b-a4b-it": 0.000375,
  "gemma-4-31b-it": 0.0006,
  "google/gemma-4-4b-it": 0,
  "google/gemma-4-27b-it": 0,
  "gemma4:4b": 0,
  "gemma4:27b": 0,
  mock: 0,
};

const DEFAULT_BUDGET_USD = 20;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface DailyState {
  date: string;       // YYYY-MM-DD (UTC)
  spend_usd: number;  // running total for that date
  call_count: number; // running count of priced calls
}

let state: DailyState | null = null;

function getStateDir(): string {
  const override = process.env.PRAIRIE_COST_STATE_DIR?.trim();
  if (override) {
    return resolve(override);
  }
  return resolve(_dirname, "../..", "output", "cost-budget");
}

function getStateFile(): string {
  return resolve(getStateDir(), "today.json");
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyState(date: string): DailyState {
  return { date, spend_usd: 0, call_count: 0 };
}

function loadStateFromDisk(): DailyState | null {
  const path = getStateFile();
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.date === "string" &&
      typeof parsed.spend_usd === "number" &&
      typeof parsed.call_count === "number"
    ) {
      return parsed as DailyState;
    }
  } catch {
    // Corrupt state file — treat as if absent. Fresh accumulator beats
    // refusing to serve traffic over a parse error.
  }
  return null;
}

function persistStateToDisk(): void {
  if (!state) return;
  try {
    mkdirSync(getStateDir(), { recursive: true });
    writeFileSync(getStateFile(), `${JSON.stringify(state, null, 2)}\n`, "utf8");
  } catch {
    // Persistence failure is non-fatal: in-memory state stays correct for the
    // rest of this process's lifetime; only restart-after-crash resets it.
  }
}

function ensureCurrentState(): DailyState {
  const today = todayUtc();
  if (state === null) {
    const loaded = loadStateFromDisk();
    state = loaded && loaded.date === today ? loaded : emptyState(today);
  } else if (state.date !== today) {
    state = emptyState(today);
    persistStateToDisk();
  }
  return state;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getBudgetUsd(): number {
  const raw = process.env.PRAIRIE_DAILY_BUDGET_USD?.trim();
  if (!raw) return DEFAULT_BUDGET_USD;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_BUDGET_USD;
  return parsed;
}

export function getTodaySpendUsd(): number {
  return ensureCurrentState().spend_usd;
}

export function getTodayCallCount(): number {
  return ensureCurrentState().call_count;
}

export function isBudgetEnforced(): boolean {
  // Budget=0 is the explicit "disable" knob — useful for ollama-only or
  // mock-only days where there's no real cost to track.
  return getBudgetUsd() > 0;
}

export function isBudgetExceeded(): boolean {
  if (!isBudgetEnforced()) return false;
  return getTodaySpendUsd() >= getBudgetUsd();
}

export function estimateCallCostUsd(
  modelId: string | null | undefined,
  promptTokens: number | null,
  outputTokens: number | null,
): number {
  if (!modelId) return 0;
  if (promptTokens === null && outputTokens === null) return 0;
  const inPrice = PRICE_PER_1K_INPUT[modelId] ?? 0;
  const outPrice = PRICE_PER_1K_OUTPUT[modelId] ?? 0;
  const promptT = promptTokens ?? 0;
  const outputT = outputTokens ?? 0;
  return (promptT / 1000) * inPrice + (outputT / 1000) * outPrice;
}

export function recordCallSpend(
  modelId: string | null | undefined,
  promptTokens: number | null,
  outputTokens: number | null,
): number {
  const cost = estimateCallCostUsd(modelId, promptTokens, outputTokens);
  const current = ensureCurrentState();
  current.spend_usd += cost;
  current.call_count += 1;
  persistStateToDisk();
  return cost;
}

/** Force a state reset — for tests only. */
export function resetCostBudgetStateForTests(): void {
  state = null;
}
