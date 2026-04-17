import { describe, expect, it } from "vitest";

// @ts-expect-error test-only import of repo-local .mjs helper without declarations
const evalRegressionModule = await import("../../../scripts/lib/eval-regression-diff.mjs");
const diffSummaries = evalRegressionModule.diffSummaries as (
  prev: Record<string, unknown>,
  curr: Record<string, unknown>,
) => string[];
const ratio = evalRegressionModule.ratio as (n: number, d: number | undefined) => number;
const p95LatencyByEndpoint = evalRegressionModule.p95LatencyByEndpoint as (
  results: Array<Record<string, unknown>>,
  minSamples?: number,
) => Map<string, number>;
const diffLatency = evalRegressionModule.diffLatency as (
  prev: Map<string, number>,
  curr: Map<string, number>,
  growthThreshold?: number,
) => string[];

describe("eval-regression diffSummaries", () => {
  const baseSummary = {
    passed_cases: 10,
    failed_cases: 0,
    total_cases: 10,
    models: ["gemma-4-26b-a4b-it", "gemma-4-31b-it"],
    failing_cases: [],
  };

  it("returns no findings when nothing changed", () => {
    expect(diffSummaries(baseSummary, baseSummary)).toEqual([]);
  });

  it("flags a pass-rate drop", () => {
    const curr = { ...baseSummary, passed_cases: 8, failed_cases: 2 };
    const findings = diffSummaries(baseSummary, curr);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain("pass rate dropped");
    expect(findings[0]).toContain("100.0%");
    expect(findings[0]).toContain("80.0%");
  });

  it("flags newly-failing case IDs (regression set)", () => {
    const curr = {
      ...baseSummary,
      passed_cases: 9,
      failed_cases: 1,
      failing_cases: [{ case_id: "diff-001-reading-schema" }],
    };
    const findings = diffSummaries(baseSummary, curr);
    expect(findings.some((f) => f.includes("newly failing"))).toBe(true);
    expect(findings.some((f) => f.includes("diff-001-reading-schema"))).toBe(true);
  });

  it("does not flag cases that were already failing in the previous run", () => {
    const prev = {
      ...baseSummary,
      passed_cases: 9,
      failed_cases: 1,
      failing_cases: [{ case_id: "diff-001-reading-schema" }],
    };
    const curr = {
      ...baseSummary,
      passed_cases: 9,
      failed_cases: 1,
      failing_cases: [{ case_id: "diff-001-reading-schema" }],
    };
    expect(diffSummaries(prev, curr)).toEqual([]);
  });

  it("flags when a model present in the previous run is missing from the current one", () => {
    const curr = { ...baseSummary, models: ["gemma-4-26b-a4b-it"] };
    const findings = diffSummaries(baseSummary, curr);
    expect(findings.some((f) => f.includes("model(s) dropped"))).toBe(true);
    expect(findings.some((f) => f.includes("gemma-4-31b-it"))).toBe(true);
  });

  it("does not flag added models (additions are improvements)", () => {
    const curr = {
      ...baseSummary,
      models: [...baseSummary.models, "gemma-4-12b-it"],
    };
    expect(diffSummaries(baseSummary, curr)).toEqual([]);
  });

  it("accepts plain string failing-case entries (legacy summary shape)", () => {
    const curr = {
      ...baseSummary,
      passed_cases: 9,
      failed_cases: 1,
      failing_cases: ["diff-001-reading-schema"],
    };
    const findings = diffSummaries(baseSummary, curr);
    expect(findings.some((f) => f.includes("diff-001-reading-schema"))).toBe(true);
  });

  it("aggregates multiple findings into a single report", () => {
    const curr = {
      passed_cases: 7,
      failed_cases: 3,
      total_cases: 10,
      models: ["gemma-4-26b-a4b-it"],
      failing_cases: [{ case_id: "ea-001-schema" }, { case_id: "fcst-001-demo-schema" }],
    };
    const findings = diffSummaries(baseSummary, curr);
    expect(findings).toHaveLength(3);
    expect(findings[0]).toContain("pass rate dropped");
    expect(findings.some((f) => f.includes("newly failing"))).toBe(true);
    expect(findings.some((f) => f.includes("model(s) dropped"))).toBe(true);
  });
});

describe("eval-regression ratio helper", () => {
  it("computes a normal pass-rate ratio", () => {
    expect(ratio(8, 10)).toBe(0.8);
  });

  it("returns 1 when total_cases is zero (no eval cases ran — vacuously OK)", () => {
    expect(ratio(0, 0)).toBe(1);
  });

  it("returns 1 when total_cases is missing", () => {
    expect(ratio(5, undefined)).toBe(1);
  });
});

describe("p95LatencyByEndpoint", () => {
  it("groups samples by endpoint and computes a P95", () => {
    // Each endpoint gets 5 samples; P95 with linear interpolation between
    // the 4th and 5th (rank = 0.95 * 4 = 3.8 → between idx 3 and 4).
    const results = [
      { endpoint: "POST /api/diff", passed: true, latency_ms: 100 },
      { endpoint: "POST /api/diff", passed: true, latency_ms: 200 },
      { endpoint: "POST /api/diff", passed: true, latency_ms: 300 },
      { endpoint: "POST /api/diff", passed: true, latency_ms: 400 },
      { endpoint: "POST /api/diff", passed: true, latency_ms: 500 },
      { endpoint: "POST /api/plan", passed: true, latency_ms: 1000 },
      { endpoint: "POST /api/plan", passed: true, latency_ms: 2000 },
    ];
    const p95 = p95LatencyByEndpoint(results);
    expect(p95.get("POST /api/diff")).toBeCloseTo(480, 0); // 400 + 0.8*(500-400)
    expect(p95.get("POST /api/plan")).toBeCloseTo(1950, 0); // 1000 + 0.95*(2000-1000)
  });

  it("excludes failed cases from the latency distribution (timeouts skew low)", () => {
    const results = [
      { endpoint: "POST /api/x", passed: true, latency_ms: 1000 },
      { endpoint: "POST /api/x", passed: true, latency_ms: 2000 },
      { endpoint: "POST /api/x", passed: false, latency_ms: 50 }, // 502 reject — fast, ignore
    ];
    const p95 = p95LatencyByEndpoint(results);
    expect(p95.get("POST /api/x")).toBeGreaterThan(1500);
  });

  it("excludes endpoints with fewer than minSamples passing results", () => {
    const results = [
      { endpoint: "POST /api/rare", passed: true, latency_ms: 9999 },
    ];
    expect(p95LatencyByEndpoint(results, 2).has("POST /api/rare")).toBe(false);
    expect(p95LatencyByEndpoint(results, 1).has("POST /api/rare")).toBe(true);
  });

  it("returns an empty map for non-array input", () => {
    expect(p95LatencyByEndpoint(null as never).size).toBe(0);
    expect(p95LatencyByEndpoint(undefined as never).size).toBe(0);
  });

  it("ignores results with missing endpoint or non-numeric latency", () => {
    const results = [
      { endpoint: "POST /api/x", passed: true, latency_ms: "fast" },
      { endpoint: null, passed: true, latency_ms: 100 },
      { endpoint: "POST /api/x", passed: true, latency_ms: 200 },
      { endpoint: "POST /api/x", passed: true, latency_ms: 300 },
    ];
    const p95 = p95LatencyByEndpoint(results as never);
    // 2 valid samples [200, 300] → P95 with linear interpolation at rank 0.95
    // = 200 + 0.95*(300-200) = 295
    expect(p95.get("POST /api/x")).toBeCloseTo(295, 0);
  });
});

describe("diffLatency", () => {
  it("returns no findings when latencies are roughly stable", () => {
    const prev = new Map([["POST /api/diff", 1000]]);
    const curr = new Map([["POST /api/diff", 1100]]); // +10%
    expect(diffLatency(prev, curr)).toEqual([]);
  });

  it("flags an endpoint whose P95 grew >20% by default", () => {
    const prev = new Map([["POST /api/diff", 1000]]);
    const curr = new Map([["POST /api/diff", 1300]]); // +30%
    const findings = diffLatency(prev, curr);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain("P95 latency grew");
    expect(findings[0]).toContain("30.0%");
  });

  it("formats sub-second latencies in ms and longer ones in seconds", () => {
    const findings = diffLatency(
      new Map([["POST /api/fast", 100], ["POST /api/slow", 5000]]),
      new Map([["POST /api/fast", 200], ["POST /api/slow", 8000]]),
    );
    expect(findings.find((f) => f.includes("/api/fast"))).toContain("100 ms");
    expect(findings.find((f) => f.includes("/api/slow"))).toMatch(/5\.00 s/);
  });

  it("flags endpoints that disappeared from the current run", () => {
    const prev = new Map([["POST /api/dropped", 1000]]);
    const curr = new Map<string, number>();
    const findings = diffLatency(prev, curr);
    expect(findings.some((f) => f.includes("dropped from current run"))).toBe(true);
  });

  it("does not flag NEW endpoints (no baseline to compare against)", () => {
    const prev = new Map<string, number>();
    const curr = new Map([["POST /api/new", 9999]]);
    expect(diffLatency(prev, curr)).toEqual([]);
  });

  it("respects a custom growth threshold", () => {
    const prev = new Map([["POST /api/x", 1000]]);
    const curr = new Map([["POST /api/x", 1100]]); // +10%
    expect(diffLatency(prev, curr, 0.05)).toHaveLength(1); // 5% threshold trips
    expect(diffLatency(prev, curr, 0.50)).toHaveLength(0); // 50% threshold doesn't
  });
});
