import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isDemoStale, fetchDemoLatestIntervention } from "../demo-freshness.mjs";

describe("isDemoStale", () => {
  it("returns false when latest intervention is within 7 days", () => {
    const now = new Date("2026-04-25T12:00:00Z");
    const fiveDaysAgo = new Date("2026-04-20T12:00:00Z").toISOString();
    assert.equal(isDemoStale({ latestInterventionAt: fiveDaysAgo, now }), false);
  });

  it("returns true when latest intervention is older than 7 days", () => {
    const now = new Date("2026-04-25T12:00:00Z");
    const monthAgo = new Date("2026-03-25T12:00:00Z").toISOString();
    assert.equal(isDemoStale({ latestInterventionAt: monthAgo, now }), true);
  });

  it("returns true when there are no interventions at all", () => {
    const now = new Date("2026-04-25T12:00:00Z");
    assert.equal(isDemoStale({ latestInterventionAt: null, now }), true);
  });

  it("returns true when latestInterventionAt is an invalid date string", () => {
    const now = new Date("2026-04-25T12:00:00Z");
    assert.equal(isDemoStale({ latestInterventionAt: "not-a-date", now }), true);
  });
});

describe("fetchDemoLatestIntervention", () => {
  it("derives ISO timestamp from min last_intervention_days across threads", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        student_threads: [
          { last_intervention_days: 12 },
          { last_intervention_days: 3 },
          { last_intervention_days: null },
          { last_intervention_days: 45 },
        ],
      }),
    });
    try {
      const iso = await fetchDemoLatestIntervention("http://test");
      assert.ok(iso, "expected an ISO timestamp");
      const ageMs = Date.now() - new Date(iso).getTime();
      const ageDays = ageMs / (24 * 60 * 60 * 1000);
      // smallest non-null is 3 → derived ISO should be ~3 days old
      assert.ok(ageDays > 2.9 && ageDays < 3.1, `expected ~3 days, got ${ageDays}`);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns null when fetch throws", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => { throw new Error("network down"); };
    try {
      const result = await fetchDemoLatestIntervention("http://test");
      assert.equal(result, null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns null when no thread has a usable day count", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        student_threads: [
          { last_intervention_days: null },
          { last_intervention_days: -1 },
          { last_intervention_days: "bogus" },
        ],
      }),
    });
    try {
      const result = await fetchDemoLatestIntervention("http://test");
      assert.equal(result, null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
