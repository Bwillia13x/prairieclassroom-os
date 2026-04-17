// services/memory/__tests__/family-message-store.test.ts
// F12.5: round-trip test for the edited_text persistence path through the
// approve endpoint's store layer.
import { describe, it, expect, beforeEach, vi } from "vitest";
import Database from "better-sqlite3";
import { unsafeCastClassroomId } from "../../../packages/shared/schemas/branded.js";
import { runMigrations } from "../migrate.js";

let testDb: Database.Database;

vi.mock("../db.js", () => ({
  getDb: vi.fn(() => testDb),
}));

import {
  saveFamilyMessage,
  approveFamilyMessage,
  getLowRatedFeedback,
  saveFeedback,
} from "../store.js";
import { getRecentMessages } from "../retrieve.js";

import type { FamilyMessageDraft } from "../../../packages/shared/schemas/message.js";

const TEST_ROOM = unsafeCastClassroomId("test-room");

function makeDb(): Database.Database {
  const db = new Database(":memory:");
  runMigrations(db);
  return db;
}

function makeDraft(overrides: Partial<FamilyMessageDraft> = {}): FamilyMessageDraft {
  return {
    draft_id: "draft-001",
    classroom_id: "test-room",
    student_refs: ["Amira"],
    message_type: "routine_update",
    target_language: "English",
    plain_language_text: "Original AI draft text.",
    teacher_approved: false,
    schema_version: "0.1.0",
    ...overrides,
  };
}

describe("approveFamilyMessage — F12.5 edited_text persistence", () => {
  beforeEach(() => {
    testDb = makeDb();
  });

  it("verbatim approval (no edited_text) leaves the draft body unchanged", () => {
    saveFamilyMessage(TEST_ROOM, makeDraft(), "mock");
    approveFamilyMessage(TEST_ROOM, "draft-001"); // no editedText arg

    const messages = getRecentMessages(TEST_ROOM);
    expect(messages).toHaveLength(1);
    expect(messages[0].plain_language_text).toBe("Original AI draft text.");
    expect(messages[0].edited_text).toBeUndefined();
  });

  it("edited approval persists edited_text alongside plain_language_text", () => {
    saveFamilyMessage(TEST_ROOM, makeDraft(), "mock");
    approveFamilyMessage(
      TEST_ROOM,
      "draft-001",
      "Teacher's reworked version of the message.",
    );

    const messages = getRecentMessages(TEST_ROOM);
    expect(messages).toHaveLength(1);
    // Original AI draft is preserved (immutable audit trail).
    expect(messages[0].plain_language_text).toBe("Original AI draft text.");
    // Teacher's edits are written into the same row's JSON blob.
    expect(messages[0].edited_text).toBe("Teacher's reworked version of the message.");
  });

  it("flips teacher_approved to true and records approval_timestamp", () => {
    saveFamilyMessage(TEST_ROOM, makeDraft(), "mock");
    const before = testDb.prepare("SELECT teacher_approved, approval_timestamp FROM family_messages WHERE draft_id = ?").get("draft-001") as Record<string, unknown>;
    expect(before.teacher_approved).toBe(0);
    expect(before.approval_timestamp).toBeNull();

    approveFamilyMessage(TEST_ROOM, "draft-001", "edits");

    const after = testDb.prepare("SELECT teacher_approved, approval_timestamp FROM family_messages WHERE draft_id = ?").get("draft-001") as Record<string, unknown>;
    expect(after.teacher_approved).toBe(1);
    expect(after.approval_timestamp).toBeTruthy();
  });

  it("does not corrupt the draft JSON when edited_text contains quotes/newlines/JSON specials", () => {
    saveFamilyMessage(TEST_ROOM, makeDraft(), "mock");
    const tricky = `Line 1 with "quotes"\nLine 2 with {"json": "ish"}\\backslash`;
    approveFamilyMessage(TEST_ROOM, "draft-001", tricky);

    const messages = getRecentMessages(TEST_ROOM);
    expect(messages[0].edited_text).toBe(tricky);
  });

  it("a second approval can overwrite a prior edited_text (re-edit flow)", () => {
    saveFamilyMessage(TEST_ROOM, makeDraft(), "mock");
    approveFamilyMessage(TEST_ROOM, "draft-001", "first edit");
    approveFamilyMessage(TEST_ROOM, "draft-001", "second edit, more thoughtful");

    const messages = getRecentMessages(TEST_ROOM);
    expect(messages[0].edited_text).toBe("second edit, more thoughtful");
  });
});

// ---------------------------------------------------------------------------
// F14: getLowRatedFeedback (the helper that backs the harvest script)
// ---------------------------------------------------------------------------

describe("getLowRatedFeedback — F14 query helper", () => {
  beforeEach(() => {
    testDb = makeDb();
  });

  it("returns rows at or below the rating cap, newest first", () => {
    saveFeedback(TEST_ROOM, { id: "fb-1", classroom_id: "test-room", panel_id: "family-message", rating: 5 });
    saveFeedback(TEST_ROOM, { id: "fb-2", classroom_id: "test-room", panel_id: "family-message", rating: 1 });
    saveFeedback(TEST_ROOM, { id: "fb-3", classroom_id: "test-room", panel_id: "family-message", rating: 2 });

    const rows = getLowRatedFeedback(TEST_ROOM, 2);
    expect(rows.map((r) => r.id).sort()).toEqual(["fb-2", "fb-3"]);
  });

  it("respects the sinceIso cutoff", () => {
    saveFeedback(TEST_ROOM, { id: "fb-old", classroom_id: "test-room", panel_id: "family-message", rating: 1 });
    // sqlite created_at uses datetime('now'). For this test we backdate the
    // row by direct UPDATE so we can prove the cutoff filter works.
    testDb.prepare("UPDATE feedback SET created_at = ? WHERE id = ?").run(
      "2020-01-01T00:00:00Z",
      "fb-old",
    );
    saveFeedback(TEST_ROOM, { id: "fb-new", classroom_id: "test-room", panel_id: "family-message", rating: 1 });

    const recentOnly = getLowRatedFeedback(TEST_ROOM, 2, "2026-01-01T00:00:00Z");
    expect(recentOnly.map((r) => r.id)).toEqual(["fb-new"]);
  });

  it("returns an empty array when no rows match", () => {
    saveFeedback(TEST_ROOM, { id: "only-good", classroom_id: "test-room", panel_id: "family-message", rating: 5 });
    expect(getLowRatedFeedback(TEST_ROOM, 2)).toEqual([]);
  });
});
