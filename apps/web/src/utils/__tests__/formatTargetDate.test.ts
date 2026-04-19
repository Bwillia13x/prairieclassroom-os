import { describe, expect, it } from "vitest";
import { formatTargetDate } from "../formatTargetDate";

describe("formatTargetDate", () => {
  it("formats a YYYY-MM-DD date with weekday, month, day, year", () => {
    const out = formatTargetDate("2026-04-21");
    expect(out).toMatch(/2026/);
    // Weekday + month abbreviations are locale-dependent; don't over-specify,
    // but do confirm three commas-separated components survive.
    expect(out.split(/[\s,]+/).filter(Boolean).length).toBeGreaterThanOrEqual(4);
  });

  it("returns an empty string on empty input", () => {
    expect(formatTargetDate("")).toBe("");
  });

  it("returns an empty string on garbage input", () => {
    expect(formatTargetDate("not-a-date")).toBe("");
  });

  it("does not shift the day across timezones", () => {
    // Construct the ISO date and re-format. Regardless of local tz the day
    // of the month must remain 21.
    const out = formatTargetDate("2026-04-21");
    expect(out).toMatch(/\b21\b/);
  });
});
