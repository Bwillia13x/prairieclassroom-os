// services/memory/__tests__/retrieve.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import Database from "better-sqlite3";
import type { TomorrowPlan } from "../../../packages/shared/schemas/plan.js";
import type { InterventionRecord } from "../../../packages/shared/schemas/intervention.js";
import { unsafeCastClassroomId } from "../../../packages/shared/schemas/branded.js";

// --- Mock getDb to return in-memory database ---
let testDb: Database.Database;

vi.mock("../db.js", () => ({
  getDb: vi.fn(() => testDb),
}));

import * as retrieve from "../retrieve.js";

const TEST_ROOM = unsafeCastClassroomId("test-room");

// --- DB setup ---

function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE generated_plans (
      plan_id TEXT PRIMARY KEY, classroom_id TEXT NOT NULL,
      teacher_reflection TEXT, plan_json TEXT NOT NULL,
      model_id TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE interventions (
      record_id TEXT PRIMARY KEY, classroom_id TEXT NOT NULL,
      student_refs TEXT NOT NULL, record_json TEXT NOT NULL,
      model_id TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE pattern_reports (
      report_id TEXT PRIMARY KEY, classroom_id TEXT NOT NULL,
      student_filter TEXT, report_json TEXT NOT NULL,
      model_id TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE family_messages (
      draft_id TEXT PRIMARY KEY, classroom_id TEXT NOT NULL,
      student_refs TEXT NOT NULL, message_json TEXT NOT NULL,
      teacher_approved INTEGER DEFAULT 0, approval_timestamp TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE complexity_forecasts (
      forecast_id TEXT PRIMARY KEY, classroom_id TEXT NOT NULL,
      forecast_date TEXT NOT NULL, forecast_json TEXT NOT NULL,
      model_id TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE scaffold_reviews (
      report_id TEXT PRIMARY KEY, classroom_id TEXT NOT NULL,
      student_ref TEXT NOT NULL, report_json TEXT NOT NULL,
      model_id TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE survival_packets (
      packet_id TEXT PRIMARY KEY, classroom_id TEXT NOT NULL,
      generated_for_date TEXT NOT NULL, packet_json TEXT NOT NULL,
      model_id TEXT, created_at TEXT NOT NULL
    );
    CREATE INDEX idx_plans_classroom ON generated_plans(classroom_id, created_at);
    CREATE INDEX idx_interventions_classroom ON interventions(classroom_id, created_at);
    CREATE INDEX idx_patterns_classroom ON pattern_reports(classroom_id, created_at);
  `);
  return db;
}

// --- Test data factories ---

function makePlan(overrides: Partial<TomorrowPlan> = {}): TomorrowPlan {
  return {
    plan_id: "plan-001",
    classroom_id: "test-room",
    source_artifact_ids: [],
    transition_watchpoints: [{
      time_or_activity: "After recess",
      risk_description: "Brody needs visual timer",
      suggested_mitigation: "Set timer before recess ends",
    }],
    support_priorities: [{
      student_ref: "Brody",
      reason: "Transition support needed",
      suggested_action: "Pre-set timer",
    }],
    ea_actions: [{
      description: "Support Amira with reading",
      student_refs: ["Amira"],
      timing: "9:00-9:30",
    }],
    prep_checklist: ["Print worksheets"],
    family_followups: [{
      student_ref: "Amira",
      reason: "Math progress",
      message_type: "praise",
    }],
    schema_version: "0.1.0",
    ...overrides,
  } as TomorrowPlan;
}

function makeIntervention(overrides: Partial<InterventionRecord> = {}): InterventionRecord {
  return {
    record_id: "int-001",
    classroom_id: "test-room",
    student_refs: ["Brody"],
    observation: "Struggled with transition after recess",
    action_taken: "Used visual timer and step checklist",
    outcome: "Settled within 3 minutes",
    follow_up_needed: false,
    created_at: "2026-04-01T00:00:00Z",
    schema_version: "0.1.0",
    ...overrides,
  } as InterventionRecord;
}

function insertPlan(db: Database.Database, plan: TomorrowPlan, createdAt: string) {
  db.prepare(
    `INSERT INTO generated_plans (plan_id, classroom_id, teacher_reflection, plan_json, model_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(plan.plan_id, plan.classroom_id, "reflection", JSON.stringify(plan), "mock", createdAt);
}

function insertIntervention(db: Database.Database, rec: InterventionRecord, createdAt: string) {
  db.prepare(
    `INSERT INTO interventions (record_id, classroom_id, student_refs, record_json, model_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(rec.record_id, rec.classroom_id, JSON.stringify(rec.student_refs), JSON.stringify(rec), "mock", createdAt);
}

// --- Tests ---

beforeEach(() => {
  testDb = createTestDb();
});

describe("summarizeRecentPlans", () => {
  it("returns empty string for empty array", () => {
    expect(retrieve.summarizeRecentPlans([])).toBe("");
  });

  it("formats a single plan with priorities and watchpoints", () => {
    const plan = makePlan();
    const result = retrieve.summarizeRecentPlans([plan]);
    expect(result).toContain("Recent classroom history:");
    expect(result).toContain("Brody");
    expect(result).toContain("Transition support needed");
    expect(result).toContain("After recess");
  });

  it("handles plan with empty family_followups", () => {
    const plan = makePlan({ family_followups: [] });
    const result = retrieve.summarizeRecentPlans([plan]);
    expect(result).toContain("Recent classroom history:");
    expect(result).not.toContain("Family followups");
  });
});

describe("summarizeRecentInterventions", () => {
  it("returns empty string for empty array", () => {
    expect(retrieve.summarizeRecentInterventions([])).toBe("");
  });

  it("formats a single intervention", () => {
    const rec = makeIntervention();
    const result = retrieve.summarizeRecentInterventions([rec]);
    expect(result).toContain("Recent interventions:");
    expect(result).toContain("Brody");
    expect(result).toContain("Struggled with transition");
    expect(result).toContain("Used visual timer");
    expect(result).toContain("Settled within 3 minutes");
  });

  it("handles intervention with no outcome", () => {
    const rec = makeIntervention({ outcome: undefined });
    const result = retrieve.summarizeRecentInterventions([rec]);
    expect(result).toContain("Brody");
    expect(result).not.toContain("outcome:");
  });
});

describe("getRecentPlans (via mock DB)", () => {
  it("returns empty array for empty DB", () => {
    const plans = retrieve.getRecentPlans(TEST_ROOM);
    expect(plans).toEqual([]);
  });

  it("returns plans in descending order by created_at", () => {
    insertPlan(testDb, makePlan({ plan_id: "plan-001" }), "2026-04-01T00:00:00Z");
    insertPlan(testDb, makePlan({ plan_id: "plan-002" }), "2026-04-02T00:00:00Z");
    const plans = retrieve.getRecentPlans(TEST_ROOM);
    expect(plans).toHaveLength(2);
    expect(plans[0].plan_id).toBe("plan-002");
    expect(plans[1].plan_id).toBe("plan-001");
  });

  it("respects limit parameter", () => {
    for (let i = 0; i < 10; i++) {
      insertPlan(testDb, makePlan({ plan_id: `plan-${i}` }),
        `2026-04-${String(i + 1).padStart(2, "0")}T00:00:00Z`);
    }
    const plans = retrieve.getRecentPlans(TEST_ROOM, 3);
    expect(plans).toHaveLength(3);
  });
});

describe("getRecentInterventions (via mock DB)", () => {
  it("returns empty array for empty DB", () => {
    expect(retrieve.getRecentInterventions(TEST_ROOM)).toEqual([]);
  });

  it("returns interventions in descending order", () => {
    insertIntervention(testDb, makeIntervention({ record_id: "int-001" }), "2026-04-01T00:00:00Z");
    insertIntervention(testDb, makeIntervention({ record_id: "int-002" }), "2026-04-02T00:00:00Z");
    const records = retrieve.getRecentInterventions(TEST_ROOM);
    expect(records).toHaveLength(2);
    expect(records[0].record_id).toBe("int-002");
  });
});

describe("getRelevantInterventions (via mock DB)", () => {
  it("ranks an older query-relevant record above a newer irrelevant record", () => {
    insertIntervention(testDb, makeIntervention({
      record_id: "int-transition",
      observation: "Brody had a difficult transition after recess",
      action_taken: "Used visual timer and first-then card",
      created_at: "2026-04-01T00:00:00Z",
    }), "2026-04-01T00:00:00Z");
    insertIntervention(testDb, makeIntervention({
      record_id: "int-newer",
      student_refs: ["Amira"],
      observation: "Amira finished the reading response",
      action_taken: "Shared work with a partner",
      created_at: "2026-04-05T00:00:00Z",
    }), "2026-04-05T00:00:00Z");

    const records = retrieve.getRelevantInterventions(TEST_ROOM, {
      limit: 2,
      query: "transition visual timer",
    });

    expect(records.map((record) => record.record_id)).toEqual([
      "int-transition",
      "int-newer",
    ]);
  });

  it("prioritizes follow-up and requested student aliases", () => {
    insertIntervention(testDb, makeIntervention({
      record_id: "int-mika",
      student_refs: ["Mika"],
      observation: "Mika needs a family follow up about science materials",
      action_taken: "Prepared note for home",
      follow_up_needed: true,
      created_at: "2026-04-01T00:00:00Z",
    }), "2026-04-01T00:00:00Z");
    insertIntervention(testDb, makeIntervention({
      record_id: "int-brody",
      student_refs: ["Brody"],
      observation: "Brody had a newer transition note",
      action_taken: "Used timer",
      follow_up_needed: false,
      created_at: "2026-04-06T00:00:00Z",
    }), "2026-04-06T00:00:00Z");

    const records = retrieve.getRelevantInterventions(TEST_ROOM, {
      limit: 2,
      studentRefs: ["Mika"],
      query: "follow up",
    });

    expect(records).toHaveLength(2);
    expect(records[0].record_id).toBe("int-mika");
    expect(records[1].record_id).toBe("int-brody");
  });
});

describe("getLatestPatternReport (via mock DB)", () => {
  it("returns null for empty DB", () => {
    expect(retrieve.getLatestPatternReport(TEST_ROOM)).toBeNull();
  });

  it("returns the most recent report", () => {
    const r1 = { report_id: "pat-001", classroom_id: "test-room" };
    const r2 = { report_id: "pat-002", classroom_id: "test-room" };
    testDb.prepare(
      `INSERT INTO pattern_reports (report_id, classroom_id, report_json, model_id, created_at) VALUES (?, ?, ?, ?, ?)`,
    ).run("pat-001", "test-room", JSON.stringify(r1), "mock", "2026-04-01T00:00:00Z");
    testDb.prepare(
      `INSERT INTO pattern_reports (report_id, classroom_id, report_json, model_id, created_at) VALUES (?, ?, ?, ?, ?)`,
    ).run("pat-002", "test-room", JSON.stringify(r2), "mock", "2026-04-02T00:00:00Z");
    const result = retrieve.getLatestPatternReport(TEST_ROOM);
    expect(result).not.toBeNull();
    expect(result!.report_id).toBe("pat-002");
  });
});

describe("buildPatternContext (via mock DB)", () => {
  it("returns empty string for empty classroom", () => {
    expect(retrieve.buildPatternContext(TEST_ROOM)).toBe("");
  });

  it("includes intervention records when present", () => {
    insertIntervention(testDb, makeIntervention(), "2026-04-01T00:00:00Z");
    const context = retrieve.buildPatternContext(TEST_ROOM);
    expect(context).toContain("INTERVENTION RECORDS:");
    expect(context).toContain("Brody");
    expect(context).toContain("Struggled with transition");
  });

  it("includes follow-up pending section for flagged interventions", () => {
    insertIntervention(testDb,
      makeIntervention({ record_id: "int-followup", follow_up_needed: true }),
      "2026-04-01T00:00:00Z");
    const context = retrieve.buildPatternContext(TEST_ROOM);
    expect(context).toContain("PENDING FOLLOW-UPS");
  });
});

describe("buildEABriefingContext (via mock DB)", () => {
  it("returns empty string for empty classroom", () => {
    expect(retrieve.buildEABriefingContext(TEST_ROOM)).toBe("");
  });

  it("includes EA actions from most recent plan", () => {
    insertPlan(testDb, makePlan(), "2026-04-01T00:00:00Z");
    const context = retrieve.buildEABriefingContext(TEST_ROOM);
    expect(context).toContain("EA ACTIONS:");
    expect(context).toContain("Amira");
    expect(context).toContain("Support Amira with reading");
  });
});
