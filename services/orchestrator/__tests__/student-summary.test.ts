import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getDb, closeAll } from "../../memory/db.js";
import { getStudentSummaries } from "../../memory/student-summary.js";
import { unsafeCastClassroomId } from "../../../packages/shared/schemas/branded.js";

const TEST_CLASSROOM = unsafeCastClassroomId("test-student-summary");

const STUDENTS = [
  { alias: "Amira" },
  { alias: "Brody" },
];

function dayOffset(daysAgo: number): string {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString();
}

describe("getStudentSummaries", () => {
  beforeEach(() => {
    const db = getDb(TEST_CLASSROOM);
    db.exec("DELETE FROM interventions");
    db.exec("DELETE FROM family_messages");
    db.exec("DELETE FROM pattern_reports");
    db.exec("DELETE FROM generated_plans");
  });

  afterEach(() => {
    closeAll();
  });

  it("returns one summary per student with zero counts when no data", () => {
    const summaries = getStudentSummaries(TEST_CLASSROOM, STUDENTS);

    expect(summaries).toHaveLength(2);

    const amira = summaries.find((s) => s.alias === "Amira");
    const brody = summaries.find((s) => s.alias === "Brody");

    expect(amira).toBeDefined();
    expect(amira!.pending_action_count).toBe(0);
    expect(amira!.last_intervention_days).toBeNull();
    expect(amira!.active_pattern_count).toBe(0);
    expect(amira!.pending_message_count).toBe(0);
    expect(amira!.latest_priority_reason).toBeNull();

    expect(brody).toBeDefined();
    expect(brody!.pending_action_count).toBe(0);
    expect(brody!.last_intervention_days).toBeNull();
    expect(brody!.active_pattern_count).toBe(0);
    expect(brody!.pending_message_count).toBe(0);
    expect(brody!.latest_priority_reason).toBeNull();
  });

  it("counts pending messages for each student", () => {
    const db = getDb(TEST_CLASSROOM);

    // Insert 1 unapproved message referencing Amira only
    db.prepare(`
      INSERT INTO family_messages (draft_id, classroom_id, student_refs, message_json, teacher_approved, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      "msg-001",
      TEST_CLASSROOM,
      JSON.stringify(["Amira"]),
      JSON.stringify({ draft_id: "msg-001", body: "Hello Amira's family" }),
      0,
      dayOffset(0),
    );

    const summaries = getStudentSummaries(TEST_CLASSROOM, STUDENTS);

    const amira = summaries.find((s) => s.alias === "Amira")!;
    const brody = summaries.find((s) => s.alias === "Brody")!;

    expect(amira.pending_message_count).toBe(1);
    expect(brody.pending_message_count).toBe(0);

    // pending_action_count should reflect the pending message
    expect(amira.pending_action_count).toBeGreaterThanOrEqual(1);
    expect(brody.pending_action_count).toBe(0);
  });

  it("computes last_intervention_days", () => {
    const db = getDb(TEST_CLASSROOM);

    // Insert intervention for Amira 3 days ago
    const createdAt = dayOffset(3);
    const record = {
      record_id: "int-amira-001",
      classroom_id: TEST_CLASSROOM,
      student_refs: ["Amira"],
      observation: "Needed extra support during math",
      action_taken: "Provided manipulatives",
      follow_up_needed: false,
      created_at: createdAt,
      schema_version: "0.1.0",
    };
    db.prepare(`
      INSERT INTO interventions (record_id, classroom_id, student_refs, record_json, model_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      record.record_id,
      TEST_CLASSROOM,
      JSON.stringify(record.student_refs),
      JSON.stringify(record),
      "test-model",
      createdAt,
    );

    const summaries = getStudentSummaries(TEST_CLASSROOM, STUDENTS);

    const amira = summaries.find((s) => s.alias === "Amira")!;
    const brody = summaries.find((s) => s.alias === "Brody")!;

    expect(amira.last_intervention_days).toBe(3);
    expect(brody.last_intervention_days).toBeNull();
  });

  it("picks latest_priority_reason from most recent plan", () => {
    const db = getDb(TEST_CLASSROOM);

    const plan = {
      plan_id: "plan-summary-001",
      classroom_id: TEST_CLASSROOM,
      source_artifact_ids: [],
      transition_watchpoints: [],
      support_priorities: [
        {
          student_ref: "Amira",
          reason: "transition difficulty",
          suggested_action: "Use visual timer",
        },
      ],
      ea_actions: [],
      prep_checklist: [],
      family_followups: [],
      schema_version: "0.1.0",
    };

    db.prepare(`
      INSERT INTO generated_plans (plan_id, classroom_id, plan_json, teacher_reflection, model_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      plan.plan_id,
      TEST_CLASSROOM,
      JSON.stringify(plan),
      null,
      "test-model",
      dayOffset(0),
    );

    const summaries = getStudentSummaries(TEST_CLASSROOM, STUDENTS);

    const amira = summaries.find((s) => s.alias === "Amira")!;
    const brody = summaries.find((s) => s.alias === "Brody")!;

    expect(amira.latest_priority_reason).toBe("transition difficulty");
    expect(brody.latest_priority_reason).toBeNull();
  });
});
