import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getDb, closeAll } from "../../memory/db.js";
import { getRecentInterventions, getRecentMessages } from "../../memory/retrieve.js";
import { saveIntervention, saveFamilyMessage } from "../../memory/store.js";
import type { InterventionRecord } from "../../../packages/shared/schemas/intervention.js";
import type { FamilyMessageDraft } from "../../../packages/shared/schemas/message.js";
import { unsafeCastClassroomId } from "../../../packages/shared/schemas/branded.js";

const TEST_CLASSROOM = unsafeCastClassroomId("test-history-filter");

function makeIntervention(overrides: Partial<InterventionRecord> = {}): InterventionRecord {
  return {
    record_id: "int-001",
    classroom_id: TEST_CLASSROOM,
    student_refs: ["Amira"],
    observation: "Struggled with fractions",
    action_taken: "Provided manipulatives",
    follow_up_needed: false,
    created_at: new Date().toISOString(),
    schema_version: "0.1.0",
    ...overrides,
  };
}

function makeMessage(overrides: Partial<FamilyMessageDraft> = {}): FamilyMessageDraft {
  return {
    draft_id: "msg-001",
    classroom_id: TEST_CLASSROOM,
    student_refs: ["Amira"],
    message_type: "praise",
    target_language: "en",
    plain_language_text: "Amira did great work today!",
    teacher_approved: false,
    schema_version: "0.1.0",
    ...overrides,
  };
}

describe("history student filter", () => {
  beforeEach(() => {
    const db = getDb(TEST_CLASSROOM);
    db.exec("DELETE FROM interventions");
    db.exec("DELETE FROM family_messages");

    saveIntervention(
      TEST_CLASSROOM,
      makeIntervention({
        record_id: "int-amira",
        student_refs: ["Amira"],
        observation: "Amira struggled with fractions",
      }),
      "test-model",
    );
    saveIntervention(
      TEST_CLASSROOM,
      makeIntervention({
        record_id: "int-brody",
        student_refs: ["Brody"],
        observation: "Brody needed visual timer",
      }),
      "test-model",
    );

    saveFamilyMessage(
      TEST_CLASSROOM,
      makeMessage({
        draft_id: "msg-amira",
        student_refs: ["Amira"],
        plain_language_text: "Amira did great work today!",
      }),
      "test-model",
    );
  });

  afterEach(() => {
    closeAll();
  });

  it("getRecentInterventions returns all records when no student filter", () => {
    const result = getRecentInterventions(TEST_CLASSROOM, 10);
    expect(result).toHaveLength(2);
  });

  it("getRecentInterventions with student filter returns only matching records", () => {
    const result = getRecentInterventions(TEST_CLASSROOM, 10, "Amira");
    expect(result).toHaveLength(1);
    expect(result[0].student_refs).toContain("Amira");
    expect(result[0].observation).toContain("Amira");
  });

  it("getRecentMessages filters by student correctly", () => {
    const allMessages = getRecentMessages(TEST_CLASSROOM, 10);
    expect(allMessages).toHaveLength(1);

    const filtered = getRecentMessages(TEST_CLASSROOM, 10, "Amira");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].student_refs).toContain("Amira");

    const noMatch = getRecentMessages(TEST_CLASSROOM, 10, "Brody");
    expect(noMatch).toHaveLength(0);
  });
});
