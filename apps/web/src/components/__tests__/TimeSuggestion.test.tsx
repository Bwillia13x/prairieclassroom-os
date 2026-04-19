import { describe, expect, it } from "vitest";
import { getContextualSuggestion } from "../TimeSuggestion";
import type { TodaySnapshot } from "../../types";

function makeSnapshot(overrides: Partial<TodaySnapshot> = {}): TodaySnapshot {
  return {
    debt_register: {
      register_id: "reg-1",
      classroom_id: "demo",
      items: [],
      item_count_by_category: {},
      generated_at: "2026-04-19T08:00:00.000Z",
      schema_version: "1.0",
    } as TodaySnapshot["debt_register"],
    latest_plan: {
      support_priorities: [],
      prep_checklist: [],
      family_followups: [],
      watchpoints: [],
      ea_actions: [],
      created_at: "2026-04-18T16:00:00.000Z",
    } as unknown as TodaySnapshot["latest_plan"],
    latest_forecast: {
      forecast_id: "fc-1",
      classroom_id: "demo",
      forecast_date: "2026-04-19",
      highest_risk_block: "10:00-10:45",
      overall_summary: "",
      schema_version: "1.0",
      blocks: [],
    } as TodaySnapshot["latest_forecast"],
    student_count: 0,
    last_activity_at: null,
    ...overrides,
  };
}

describe("getContextualSuggestion", () => {
  it("prioritizes debt-backed message approval over missing planning work", () => {
    const suggestion = getContextualSuggestion({
      hour: 8,
      role: "teacher",
      snapshot: makeSnapshot({
        debt_register: {
          ...makeSnapshot().debt_register,
          item_count_by_category: { unapproved_message: 1 },
        },
        latest_plan: null,
        latest_forecast: null,
      }),
    });

    expect(suggestion?.primaryAction.tab).toBe("family-message");
    expect(suggestion?.label).toMatch(/approval/i);
  });

  it("prioritizes stale follow-up debt over time-of-day prep suggestions", () => {
    const suggestion = getContextualSuggestion({
      hour: 8,
      role: "teacher",
      snapshot: makeSnapshot({
        debt_register: {
          ...makeSnapshot().debt_register,
          item_count_by_category: { stale_followup: 2 },
        },
      }),
    });

    expect(suggestion?.primaryAction.tab).toBe("log-intervention");
  });

  it("routes to tomorrow planning when there is no current plan", () => {
    const suggestion = getContextualSuggestion({
      hour: 8,
      role: "teacher",
      snapshot: makeSnapshot({ latest_plan: null }),
    });

    expect(suggestion?.primaryAction.tab).toBe("tomorrow-plan");
    expect(suggestion?.label).toMatch(/plan missing/i);
  });

  it("routes to forecast when a plan exists but forecast is missing", () => {
    const suggestion = getContextualSuggestion({
      hour: 8,
      role: "teacher",
      snapshot: makeSnapshot({ latest_forecast: null }),
    });

    expect(suggestion?.primaryAction.tab).toBe("complexity-forecast");
    expect(suggestion?.label).toMatch(/forecast missing/i);
  });

  it("falls back to the clock suggestion only when classroom state is clear", () => {
    const suggestion = getContextualSuggestion({
      hour: 8,
      role: "teacher",
      snapshot: makeSnapshot(),
    });

    expect(suggestion?.primaryAction.tab).toBe("differentiate");
    expect(suggestion?.label).toMatch(/good morning/i);
  });
});
