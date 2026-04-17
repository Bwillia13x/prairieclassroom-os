import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  estimateCallCostUsd,
  getBudgetUsd,
  getTodayCallCount,
  getTodaySpendUsd,
  isBudgetEnforced,
  isBudgetExceeded,
  recordCallSpend,
  resetCostBudgetStateForTests,
} from "../cost-budget.js";

// Each test gets a fresh state directory so writes from one test don't bleed
// into another. The module reads PRAIRIE_COST_STATE_DIR at every operation
// so we can swap dirs between tests cleanly.
let stateDir: string;
let originalEnv: Record<string, string | undefined>;

beforeEach(() => {
  stateDir = mkdtempSync(join(tmpdir(), "prairie-cost-budget-"));
  originalEnv = {
    PRAIRIE_COST_STATE_DIR: process.env.PRAIRIE_COST_STATE_DIR,
    PRAIRIE_DAILY_BUDGET_USD: process.env.PRAIRIE_DAILY_BUDGET_USD,
  };
  process.env.PRAIRIE_COST_STATE_DIR = stateDir;
  delete process.env.PRAIRIE_DAILY_BUDGET_USD;
  resetCostBudgetStateForTests();
});

afterEach(() => {
  resetCostBudgetStateForTests();
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  if (existsSync(stateDir)) {
    rmSync(stateDir, { recursive: true, force: true });
  }
});

describe("estimateCallCostUsd", () => {
  it("prices Gemini 26b live tier at the published rate", () => {
    // 1000 input @ $0.000125/1k + 500 output @ $0.000375/1k
    expect(estimateCallCostUsd("gemma-4-26b-a4b-it", 1000, 500)).toBeCloseTo(0.0003125, 7);
  });

  it("prices Gemini 31b planning tier higher than the live tier", () => {
    expect(estimateCallCostUsd("gemma-4-31b-it", 2000, 1000)).toBeGreaterThan(
      estimateCallCostUsd("gemma-4-26b-a4b-it", 2000, 1000),
    );
  });

  it("returns 0 for self-deploy lanes (Vertex/Ollama) where compute is billed elsewhere", () => {
    expect(estimateCallCostUsd("google/gemma-4-27b-it", 5000, 2500)).toBe(0);
    expect(estimateCallCostUsd("gemma4:27b", 5000, 2500)).toBe(0);
  });

  it("returns 0 for the mock backend regardless of token counts", () => {
    expect(estimateCallCostUsd("mock", 9999, 9999)).toBe(0);
  });

  it("returns 0 when the backend reports no tokens", () => {
    expect(estimateCallCostUsd("gemma-4-26b-a4b-it", null, null)).toBe(0);
  });

  it("returns 0 when modelId is missing", () => {
    expect(estimateCallCostUsd(null, 1000, 500)).toBe(0);
    expect(estimateCallCostUsd(undefined, 1000, 500)).toBe(0);
  });
});

describe("recordCallSpend + getTodaySpendUsd", () => {
  it("accumulates spend across multiple priced calls", () => {
    expect(getTodaySpendUsd()).toBe(0);
    recordCallSpend("gemma-4-26b-a4b-it", 1000, 500);
    recordCallSpend("gemma-4-26b-a4b-it", 1000, 500);
    expect(getTodaySpendUsd()).toBeCloseTo(0.000625, 7);
    expect(getTodayCallCount()).toBe(2);
  });

  it("counts calls even when the priced cost is zero (mock/ollama traffic still ran)", () => {
    recordCallSpend("mock", null, null);
    recordCallSpend("gemma4:27b", 4000, 2000);
    expect(getTodaySpendUsd()).toBe(0);
    expect(getTodayCallCount()).toBe(2);
  });
});

describe("disk persistence", () => {
  it("writes today.json to PRAIRIE_COST_STATE_DIR after each priced call", () => {
    recordCallSpend("gemma-4-31b-it", 2000, 1000);
    const stateFile = join(stateDir, "today.json");
    expect(existsSync(stateFile)).toBe(true);
    const persisted = JSON.parse(readFileSync(stateFile, "utf8"));
    expect(persisted).toMatchObject({
      date: new Date().toISOString().slice(0, 10),
      call_count: 1,
    });
    expect(persisted.spend_usd).toBeGreaterThan(0);
  });

  it("hydrates from disk after a process restart (simulated by reset)", () => {
    recordCallSpend("gemma-4-31b-it", 2000, 1000);
    const persistedSpend = getTodaySpendUsd();

    // Simulate a server restart: clear in-memory state, re-read from the
    // file the previous instance wrote.
    resetCostBudgetStateForTests();

    expect(getTodaySpendUsd()).toBeCloseTo(persistedSpend, 7);
    expect(getTodayCallCount()).toBe(1);
  });

  it("treats a state file from a different date as stale and starts fresh", () => {
    // Hand-write a stale state from yesterday's date.
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(
      join(stateDir, "today.json"),
      JSON.stringify({ date: "2020-01-01", spend_usd: 99.99, call_count: 500 }),
    );
    resetCostBudgetStateForTests();

    expect(getTodaySpendUsd()).toBe(0);
    expect(getTodayCallCount()).toBe(0);
  });
});

describe("budget enforcement", () => {
  it("uses the $20 default when PRAIRIE_DAILY_BUDGET_USD is unset", () => {
    expect(getBudgetUsd()).toBe(20);
    expect(isBudgetEnforced()).toBe(true);
  });

  it("honors PRAIRIE_DAILY_BUDGET_USD when set to a positive number", () => {
    process.env.PRAIRIE_DAILY_BUDGET_USD = "5.5";
    expect(getBudgetUsd()).toBe(5.5);
    expect(isBudgetEnforced()).toBe(true);
  });

  it("disables enforcement when PRAIRIE_DAILY_BUDGET_USD=0", () => {
    process.env.PRAIRIE_DAILY_BUDGET_USD = "0";
    expect(isBudgetEnforced()).toBe(false);
    // Even a giant simulated spend should not trip the gate.
    recordCallSpend("gemma-4-31b-it", 10_000_000, 5_000_000);
    expect(isBudgetExceeded()).toBe(false);
  });

  it("falls back to the default when PRAIRIE_DAILY_BUDGET_USD is malformed", () => {
    process.env.PRAIRIE_DAILY_BUDGET_USD = "not-a-number";
    expect(getBudgetUsd()).toBe(20);
  });

  it("isBudgetExceeded returns true once today_spend reaches the cap", () => {
    process.env.PRAIRIE_DAILY_BUDGET_USD = "0.0001"; // tiny cap
    expect(isBudgetExceeded()).toBe(false);
    recordCallSpend("gemma-4-31b-it", 1000, 1000); // ~$0.00075
    expect(isBudgetExceeded()).toBe(true);
  });

  it("self-deploy traffic alone never trips the gate (Vertex/Ollama prices to 0)", () => {
    process.env.PRAIRIE_DAILY_BUDGET_USD = "0.001";
    for (let i = 0; i < 100; i++) {
      recordCallSpend("gemma4:27b", 5000, 2500);
    }
    expect(isBudgetExceeded()).toBe(false);
    expect(getTodayCallCount()).toBe(100);
  });
});
