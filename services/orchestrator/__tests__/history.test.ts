import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getDb, closeAll } from "../../memory/db.js";
import { getRecentMessages, getRecentPatternReports } from "../../memory/retrieve.js";
import { saveFamilyMessage, savePatternReport } from "../../memory/store.js";
import type { FamilyMessageDraft } from "../../../packages/shared/schemas/message.js";
import type { SupportPatternReport } from "../../../packages/shared/schemas/pattern.js";

const TEST_CLASSROOM = "test-history-classroom";

function makeMessage(overrides: Partial<FamilyMessageDraft> = {}): FamilyMessageDraft {
  return {
    draft_id: "msg-001",
    classroom_id: TEST_CLASSROOM,
    student_refs: ["Ari"],
    message_type: "praise",
    target_language: "en",
    plain_language_text: "Ari did great work today!",
    teacher_approved: false,
    schema_version: "0.1.0",
    ...overrides,
  };
}

function makePatternReport(overrides: Partial<SupportPatternReport> = {}): SupportPatternReport {
  return {
    report_id: "pat-001",
    classroom_id: TEST_CLASSROOM,
    student_filter: null,
    time_window: 10,
    recurring_themes: [],
    follow_up_gaps: [],
    positive_trends: [],
    suggested_focus: [],
    generated_at: new Date().toISOString(),
    schema_version: "0.1.0",
    ...overrides,
  };
}

describe("getRecentMessages", () => {
  beforeEach(() => {
    const db = getDb(TEST_CLASSROOM);
    db.exec("DELETE FROM family_messages");
  });

  afterEach(() => {
    closeAll();
  });

  it("returns empty array for new classroom", () => {
    const result = getRecentMessages(TEST_CLASSROOM);
    expect(result).toEqual([]);
  });

  it("returns messages newest-first", () => {
    const msg1 = makeMessage({ draft_id: "msg-001", plain_language_text: "First message" });
    const msg2 = makeMessage({ draft_id: "msg-002", plain_language_text: "Second message" });

    saveFamilyMessage(TEST_CLASSROOM, msg1, "test-model");
    // Small delay to ensure different created_at timestamps
    saveFamilyMessage(TEST_CLASSROOM, msg2, "test-model");

    const result = getRecentMessages(TEST_CLASSROOM);
    expect(result).toHaveLength(2);
    // Newest first
    expect(result[0].draft_id).toBe("msg-002");
    expect(result[1].draft_id).toBe("msg-001");
  });

  it("respects limit parameter", () => {
    for (let i = 0; i < 5; i++) {
      saveFamilyMessage(
        TEST_CLASSROOM,
        makeMessage({ draft_id: `msg-${i}` }),
        "test-model",
      );
    }

    const result = getRecentMessages(TEST_CLASSROOM, 3);
    expect(result).toHaveLength(3);
  });
});

describe("getRecentPatternReports", () => {
  beforeEach(() => {
    const db = getDb(TEST_CLASSROOM);
    db.exec("DELETE FROM pattern_reports");
  });

  afterEach(() => {
    closeAll();
  });

  it("returns empty array for new classroom", () => {
    const result = getRecentPatternReports(TEST_CLASSROOM);
    expect(result).toEqual([]);
  });

  it("returns reports newest-first", () => {
    const report1 = makePatternReport({ report_id: "pat-001" });
    const report2 = makePatternReport({ report_id: "pat-002" });

    savePatternReport(TEST_CLASSROOM, report1, "test-model");
    savePatternReport(TEST_CLASSROOM, report2, "test-model");

    const result = getRecentPatternReports(TEST_CLASSROOM);
    expect(result).toHaveLength(2);
    expect(result[0].report_id).toBe("pat-002");
    expect(result[1].report_id).toBe("pat-001");
  });

  it("respects limit parameter", () => {
    for (let i = 0; i < 5; i++) {
      savePatternReport(
        TEST_CLASSROOM,
        makePatternReport({ report_id: `pat-${i}` }),
        "test-model",
      );
    }

    const result = getRecentPatternReports(TEST_CLASSROOM, 2);
    expect(result).toHaveLength(2);
  });
});
