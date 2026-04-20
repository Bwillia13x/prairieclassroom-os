import { describe, it, expect } from "vitest";
import {
  DEBT_CATEGORY_PRIORITY,
  getTodayPrimaryAction,
  getTodayContextualSuggestion,
  getStudentsToCheckFirst,
  getPeakBlock,
} from "../todayWorkflow";
import type { TodaySnapshot, ComplexityForecast } from "../../types";

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
      blocks: [
        {
          time_slot: "09:00-09:45",
          activity: "Literacy",
          level: "medium",
          contributing_factors: [],
          suggested_mitigation: "",
        },
        {
          time_slot: "10:00-10:45",
          activity: "Math",
          level: "high",
          contributing_factors: [],
          suggested_mitigation: "",
        },
      ],
    } as TodaySnapshot["latest_forecast"],
    student_count: 0,
    last_activity_at: null,
    ...overrides,
  };
}

describe("DEBT_CATEGORY_PRIORITY", () => {
  it("ranks unapproved_message highest (lowest number)", () => {
    expect(DEBT_CATEGORY_PRIORITY.unapproved_message).toBe(0);
    expect(DEBT_CATEGORY_PRIORITY.stale_followup).toBe(1);
    expect(DEBT_CATEGORY_PRIORITY.unaddressed_pattern).toBe(2);
    expect(DEBT_CATEGORY_PRIORITY.approaching_review).toBe(3);
  });
});

describe("getTodayPrimaryAction", () => {
  it("returns family-message when unapproved messages exist", () => {
    const action = getTodayPrimaryAction(
      makeSnapshot({
        debt_register: {
          ...makeSnapshot().debt_register,
          item_count_by_category: { unapproved_message: 2 },
        },
      }),
    );
    expect(action.tab).toBe("family-message");
    expect(action.label).toMatch(/approval/i);
  });

  it("returns log-intervention for stale follow-ups", () => {
    const action = getTodayPrimaryAction(
      makeSnapshot({
        debt_register: {
          ...makeSnapshot().debt_register,
          item_count_by_category: { stale_followup: 1 },
        },
      }),
    );
    expect(action.tab).toBe("log-intervention");
  });

  it("returns tomorrow-plan when no plan exists", () => {
    const action = getTodayPrimaryAction(
      makeSnapshot({ latest_plan: null }),
    );
    expect(action.tab).toBe("tomorrow-plan");
    expect(action.label).toMatch(/plan missing/i);
  });

  it("returns forecast when plan exists but forecast is missing", () => {
    const action = getTodayPrimaryAction(
      makeSnapshot({ latest_forecast: null }),
    );
    expect(action.tab).toBe("complexity-forecast");
  });

  it("returns differentiate when everything is complete", () => {
    const action = getTodayPrimaryAction(makeSnapshot());
    expect(action.tab).toBe("differentiate");
    expect(action.tone).toBe("success");
  });
});

describe("getTodayContextualSuggestion", () => {
  it("uses identical precedence as getTodayPrimaryAction for debt items", () => {
    const snapshot = makeSnapshot({
      debt_register: {
        ...makeSnapshot().debt_register,
        item_count_by_category: { unapproved_message: 1 },
      },
      latest_plan: null,
    });

    const primary = getTodayPrimaryAction(snapshot);
    const suggestion = getTodayContextualSuggestion({
      hour: 8,
      snapshot,
      role: "teacher",
    });

    // Both should target family-message when unapproved messages exist
    expect(primary.tab).toBe("family-message");
    expect(suggestion?.primaryAction.tab).toBe("family-message");
  });

  it("falls back to clock-based suggestion when state is clear", () => {
    const suggestion = getTodayContextualSuggestion({
      hour: 8,
      snapshot: makeSnapshot(),
      role: "teacher",
    });
    expect(suggestion?.primaryAction.tab).toBe("differentiate");
  });
});

describe("getStudentsToCheckFirst", () => {
  it("returns students ordered by debt category priority", () => {
    const snapshot = makeSnapshot({
      debt_register: {
        ...makeSnapshot().debt_register,
        items: [
          { category: "stale_followup", student_refs: ["Brody"], description: "", source_record_id: "1", age_days: 5, suggested_action: "" },
          { category: "unapproved_message", student_refs: ["Amira"], description: "", source_record_id: "2", age_days: 1, suggested_action: "" },
          { category: "unaddressed_pattern", student_refs: ["Farid"], description: "", source_record_id: "3", age_days: 3, suggested_action: "" },
        ],
        item_count_by_category: { unapproved_message: 1, stale_followup: 1, unaddressed_pattern: 1 },
      },
    });

    const result = getStudentsToCheckFirst(snapshot);
    expect(result).toEqual(["Amira", "Brody", "Farid"]);
  });

  it("limits results to the specified count", () => {
    const snapshot = makeSnapshot({
      debt_register: {
        ...makeSnapshot().debt_register,
        items: [
          { category: "stale_followup", student_refs: ["A", "B", "C", "D", "E", "F"], description: "", source_record_id: "1", age_days: 1, suggested_action: "" },
        ],
        item_count_by_category: { stale_followup: 1 },
      },
    });

    expect(getStudentsToCheckFirst(snapshot, 3)).toEqual(["A", "B", "C"]);
    expect(getStudentsToCheckFirst(snapshot)).toHaveLength(5); // default limit
  });

  it("deduplicates students across items", () => {
    const snapshot = makeSnapshot({
      debt_register: {
        ...makeSnapshot().debt_register,
        items: [
          { category: "unapproved_message", student_refs: ["Amira"], description: "", source_record_id: "1", age_days: 1, suggested_action: "" },
          { category: "stale_followup", student_refs: ["Amira", "Brody"], description: "", source_record_id: "2", age_days: 5, suggested_action: "" },
        ],
        item_count_by_category: { unapproved_message: 1, stale_followup: 1 },
      },
    });

    const result = getStudentsToCheckFirst(snapshot);
    expect(result).toEqual(["Amira", "Brody"]);
  });

  it("returns empty array for null snapshot", () => {
    expect(getStudentsToCheckFirst(null)).toEqual([]);
  });
});

describe("getPeakBlock", () => {
  it("returns the declared highest_risk_block when it exists", () => {
    const forecast: ComplexityForecast = {
      forecast_id: "fc-1",
      classroom_id: "demo",
      forecast_date: "2026-04-19",
      highest_risk_block: "10:00-10:45",
      overall_summary: "",
      schema_version: "1.0",
      blocks: [
        { time_slot: "09:00-09:45", activity: "Literacy", level: "medium", contributing_factors: [], suggested_mitigation: "" },
        { time_slot: "10:00-10:45", activity: "Math", level: "high", contributing_factors: [], suggested_mitigation: "" },
      ],
    };

    const peak = getPeakBlock(forecast);
    expect(peak?.time_slot).toBe("10:00-10:45");
    expect(peak?.activity).toBe("Math");
  });

  it("falls back to the highest-ranked block when declared peak is missing", () => {
    const forecast: ComplexityForecast = {
      forecast_id: "fc-1",
      classroom_id: "demo",
      forecast_date: "2026-04-19",
      highest_risk_block: "nonexistent",
      overall_summary: "",
      schema_version: "1.0",
      blocks: [
        { time_slot: "09:00-09:45", activity: "Literacy", level: "low", contributing_factors: [], suggested_mitigation: "" },
        { time_slot: "10:00-10:45", activity: "Math", level: "medium", contributing_factors: [], suggested_mitigation: "" },
      ],
    };

    const peak = getPeakBlock(forecast);
    expect(peak?.time_slot).toBe("10:00-10:45");
  });

  it("returns null for null or undefined forecast", () => {
    expect(getPeakBlock(null)).toBeNull();
    expect(getPeakBlock(undefined)).toBeNull();
  });
});
