import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getDb, closeAll } from "../../memory/db.js";
import { getLatestPlan, getLatestForecast } from "../../memory/retrieve.js";
import { savePlan } from "../../memory/store.js";
import { unsafeCastClassroomId } from "../../../packages/shared/schemas/branded.js";

const TEST_CLASSROOM = unsafeCastClassroomId("test-today-classroom");

describe("getLatestPlan", () => {
  beforeEach(() => {
    const db = getDb(TEST_CLASSROOM);
    db.exec("DELETE FROM generated_plans");
  });

  afterEach(() => {
    closeAll();
  });

  it("returns null when no plans exist", () => {
    const result = getLatestPlan(TEST_CLASSROOM);
    expect(result).toBeNull();
  });

  it("returns the most recent plan", () => {
    const plan1 = {
      plan_id: "plan-1",
      classroom_id: TEST_CLASSROOM,
      source_artifact_ids: [],
      transition_watchpoints: [],
      support_priorities: [{ student_ref: "Ari", reason: "test", suggested_action: "test" }],
      ea_actions: [],
      prep_checklist: ["Item 1"],
      family_followups: [],
      schema_version: "0.1.0",
    };
    const plan2 = { ...plan1, plan_id: "plan-2", prep_checklist: ["Item 2"] };

    savePlan(TEST_CLASSROOM, plan1, "reflection-1", "test-model");
    savePlan(TEST_CLASSROOM, plan2, "reflection-2", "test-model");

    const result = getLatestPlan(TEST_CLASSROOM);
    expect(result).not.toBeNull();
    expect(result!.plan_id).toBe("plan-2");
    expect(result!.prep_checklist).toEqual(["Item 2"]);
  });
});

describe("today snapshot composition", () => {
  beforeEach(() => {
    const db = getDb(TEST_CLASSROOM);
    db.exec("DELETE FROM generated_plans");
    db.exec("DELETE FROM complexity_forecasts");
  });

  afterEach(() => {
    closeAll();
  });

  it("composes latest plan and latest forecast (both nullable)", () => {
    savePlan(TEST_CLASSROOM, {
      plan_id: "today-plan",
      classroom_id: TEST_CLASSROOM,
      source_artifact_ids: [],
      transition_watchpoints: [],
      support_priorities: [{ student_ref: "Ari", reason: "needs focus", suggested_action: "seat near teacher" }],
      ea_actions: [],
      prep_checklist: ["Print worksheets"],
      family_followups: [],
      schema_version: "0.1.0",
    }, "test reflection", "test-model");

    const latestPlan = getLatestPlan(TEST_CLASSROOM);
    expect(latestPlan).not.toBeNull();
    expect(latestPlan!.support_priorities).toHaveLength(1);

    const latestForecast = getLatestForecast(TEST_CLASSROOM);
    expect(latestForecast).toBeNull();
  });
});
