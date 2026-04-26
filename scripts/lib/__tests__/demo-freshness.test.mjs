import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isDemoStale } from "../demo-freshness.mjs";

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
});
