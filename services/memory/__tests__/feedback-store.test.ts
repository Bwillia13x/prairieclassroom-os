// services/memory/__tests__/feedback-store.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import Database from "better-sqlite3";
import { unsafeCastClassroomId } from "../../../packages/shared/schemas/branded.js";
import { runMigrations } from "../migrate.js";

// --- Mock getDb to return in-memory database ---
let testDb: Database.Database;

vi.mock("../db.js", () => ({
  getDb: vi.fn(() => testDb),
}));

import {
  saveFeedback,
  saveSession,
  getFeedbackSummary,
  getSessionSummary,
} from "../store.js";

const TEST_ROOM = unsafeCastClassroomId("test-room");

function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  runMigrations(db);
  return db;
}

function getUtcWeekStart(base = new Date()): Date {
  const day = base.getUTCDay() || 7;
  const monday = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - day + 1);
  monday.setUTCHours(8, 0, 0, 0);
  return monday;
}

function isoInWeek(weekOffset: number, dayOffset: number, hour = 8): string {
  const date = getUtcWeekStart();
  date.setUTCDate(date.getUTCDate() + (weekOffset * 7) + dayOffset);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
}

// ---------------------------------------------------------------------------
// saveFeedback / getFeedbackSummary
// ---------------------------------------------------------------------------

describe("saveFeedback", () => {
  beforeEach(() => {
    testDb = createTestDb();
  });

  it("inserts a feedback record", () => {
    saveFeedback(TEST_ROOM, {
      id: "fb-001",
      classroom_id: "test-room",
      panel_id: "today",
      rating: 4,
    });

    const row = testDb
      .prepare("SELECT * FROM feedback WHERE id = ?")
      .get("fb-001") as Record<string, unknown>;
    expect(row).toBeTruthy();
    expect(row.classroom_id).toBe("test-room");
    expect(row.panel_id).toBe("today");
    expect(row.rating).toBe(4);
    expect(row.created_at).toBeTruthy();
  });

  it("inserts a feedback record with all optional fields", () => {
    saveFeedback(TEST_ROOM, {
      id: "fb-002",
      classroom_id: "test-room",
      panel_id: "differentiate",
      prompt_class: "differentiate_material",
      rating: 5,
      comment: "Very helpful",
      generation_id: "gen-abc",
      session_id: "sess-xyz",
    });

    const row = testDb
      .prepare("SELECT * FROM feedback WHERE id = ?")
      .get("fb-002") as Record<string, unknown>;
    expect(row.prompt_class).toBe("differentiate_material");
    expect(row.comment).toBe("Very helpful");
    expect(row.generation_id).toBe("gen-abc");
    expect(row.session_id).toBe("sess-xyz");
  });

  it("replaces on duplicate id", () => {
    saveFeedback(TEST_ROOM, {
      id: "fb-dup",
      classroom_id: "test-room",
      panel_id: "today",
      rating: 3,
    });
    saveFeedback(TEST_ROOM, {
      id: "fb-dup",
      classroom_id: "test-room",
      panel_id: "today",
      rating: 5,
    });

    const rows = testDb
      .prepare("SELECT * FROM feedback WHERE id = ?")
      .all("fb-dup");
    expect(rows).toHaveLength(1);
    expect((rows[0] as Record<string, unknown>).rating).toBe(5);
  });
});

describe("getFeedbackSummary", () => {
  beforeEach(() => {
    testDb = createTestDb();
  });

  it("returns empty summary when no feedback exists", () => {
    const summary = getFeedbackSummary(TEST_ROOM);
    expect(summary.total).toBe(0);
    expect(summary.by_panel).toEqual({});
    expect(summary.by_week).toEqual([]);
    expect(summary.top_comments).toEqual([]);
  });

  it("aggregates feedback by panel correctly", () => {
    saveFeedback(TEST_ROOM, {
      id: "fb-a1",
      classroom_id: "test-room",
      panel_id: "today",
      rating: 4,
      comment: "Good",
    });
    saveFeedback(TEST_ROOM, {
      id: "fb-a2",
      classroom_id: "test-room",
      panel_id: "today",
      rating: 2,
    });
    saveFeedback(TEST_ROOM, {
      id: "fb-b1",
      classroom_id: "test-room",
      panel_id: "differentiate",
      rating: 5,
      comment: "Excellent",
    });

    const summary = getFeedbackSummary(TEST_ROOM);
    expect(summary.total).toBe(3);
    expect(summary.by_panel["today"].count).toBe(2);
    expect(summary.by_panel["today"].avg_rating).toBe(3);
    expect(summary.by_panel["today"].recent_comments).toEqual(["Good"]);
    expect(summary.by_panel["differentiate"].count).toBe(1);
    expect(summary.by_panel["differentiate"].avg_rating).toBe(5);
  });

  it("returns top comments ordered by recency", () => {
    saveFeedback(TEST_ROOM, {
      id: "fb-c1",
      classroom_id: "test-room",
      panel_id: "today",
      rating: 4,
      comment: "First comment",
    });
    saveFeedback(TEST_ROOM, {
      id: "fb-c2",
      classroom_id: "test-room",
      panel_id: "today",
      rating: 5,
      comment: "Second comment",
    });

    const summary = getFeedbackSummary(TEST_ROOM);
    expect(summary.top_comments).toHaveLength(2);
    // Both should have text, panel_id, rating, created_at
    for (const c of summary.top_comments) {
      expect(c.text).toBeTruthy();
      expect(c.panel_id).toBe("today");
      expect(c.rating).toBeGreaterThanOrEqual(1);
      expect(c.created_at).toBeTruthy();
    }
  });

  it("excludes feedback from other classrooms", () => {
    // Insert feedback for a different classroom directly
    testDb.prepare(`
      INSERT INTO feedback (id, classroom_id, panel_id, rating, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run("fb-other", "other-room", "today", 5, new Date().toISOString());

    saveFeedback(TEST_ROOM, {
      id: "fb-mine",
      classroom_id: "test-room",
      panel_id: "today",
      rating: 3,
    });

    const summary = getFeedbackSummary(TEST_ROOM);
    expect(summary.total).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// saveSession / getSessionSummary
// ---------------------------------------------------------------------------

describe("saveSession", () => {
  beforeEach(() => {
    testDb = createTestDb();
  });

  it("inserts a session record with JSON-stringified arrays", () => {
    saveSession(TEST_ROOM, {
      id: "sess-001",
      classroom_id: "test-room",
      session_id: "sess-001",
      started_at: "2026-04-11T09:00:00Z",
      ended_at: "2026-04-11T09:30:00Z",
      panels_visited: ["today", "tomorrow-plan"],
      generations_triggered: [
        {
          panel_id: "tomorrow-plan",
          prompt_class: "prepare_tomorrow_plan",
          timestamp: "2026-04-11T09:10:00Z",
        },
      ],
      feedback_count: 2,
    });

    const row = testDb
      .prepare("SELECT * FROM sessions WHERE id = ?")
      .get("sess-001") as Record<string, unknown>;
    expect(row).toBeTruthy();
    expect(row.classroom_id).toBe("test-room");
    expect(JSON.parse(row.panels_visited as string)).toEqual([
      "today",
      "tomorrow-plan",
    ]);
    expect(JSON.parse(row.generations_triggered as string)).toHaveLength(1);
    expect(row.feedback_count).toBe(2);
  });

  it("replaces on duplicate id", () => {
    const base = {
      id: "sess-dup",
      classroom_id: "test-room",
      session_id: "sess-dup",
      started_at: "2026-04-11T09:00:00Z",
      ended_at: "2026-04-11T09:30:00Z",
      panels_visited: ["today"],
      generations_triggered: [] as { panel_id: string; prompt_class: string; timestamp: string }[],
      feedback_count: 0,
    };
    saveSession(TEST_ROOM, base);
    saveSession(TEST_ROOM, { ...base, feedback_count: 5 });

    const rows = testDb
      .prepare("SELECT * FROM sessions WHERE id = ?")
      .all("sess-dup");
    expect(rows).toHaveLength(1);
    expect((rows[0] as Record<string, unknown>).feedback_count).toBe(5);
  });
});

describe("getSessionSummary", () => {
  beforeEach(() => {
    testDb = createTestDb();
  });

  it("returns empty summary when no sessions exist", () => {
    const summary = getSessionSummary(TEST_ROOM);
    expect(summary.total_sessions).toBe(0);
    expect(summary.avg_duration_minutes).toBe(0);
    expect(summary.common_flows).toEqual([]);
    expect(summary.transition_counts).toEqual([]);
    expect(summary.terminal_counts).toEqual([]);
    expect(summary.panel_time_distribution).toEqual({});
    expect(summary.generations_per_session).toBe(0);
    expect(summary.today_workflow_nudge).toBeNull();
  });

  it("computes average duration in minutes", () => {
    // 30-minute session
    saveSession(TEST_ROOM, {
      id: "sess-d1",
      classroom_id: "test-room",
      session_id: "sess-d1",
      started_at: "2026-04-11T09:00:00Z",
      ended_at: "2026-04-11T09:30:00Z",
      panels_visited: ["today"],
      generations_triggered: [],
      feedback_count: 0,
    });
    // 60-minute session
    saveSession(TEST_ROOM, {
      id: "sess-d2",
      classroom_id: "test-room",
      session_id: "sess-d2",
      started_at: "2026-04-11T10:00:00Z",
      ended_at: "2026-04-11T11:00:00Z",
      panels_visited: ["today"],
      generations_triggered: [],
      feedback_count: 0,
    });

    const summary = getSessionSummary(TEST_ROOM);
    expect(summary.total_sessions).toBe(2);
    expect(summary.avg_duration_minutes).toBe(45);
  });

  it("tracks common flows", () => {
    const makeSession = (id: string, panels: string[]) => ({
      id,
      classroom_id: "test-room",
      session_id: id,
      started_at: "2026-04-11T09:00:00Z",
      ended_at: "2026-04-11T09:30:00Z",
      panels_visited: panels,
      generations_triggered: [] as { panel_id: string; prompt_class: string; timestamp: string }[],
      feedback_count: 0,
    });

    saveSession(TEST_ROOM, makeSession("s1", ["today", "tomorrow-plan"]));
    saveSession(TEST_ROOM, makeSession("s2", ["today", "tomorrow-plan"]));
    saveSession(TEST_ROOM, makeSession("s3", ["today", "differentiate"]));

    const summary = getSessionSummary(TEST_ROOM);
    expect(summary.common_flows).toHaveLength(2);
    expect(summary.common_flows[0].count).toBe(2);
    expect(summary.common_flows[0].sequence).toEqual([
      "today",
      "tomorrow-plan",
    ]);
    expect(summary.transition_counts).toEqual([
      { from_panel: "today", to_panel: "tomorrow-plan", count: 2 },
      { from_panel: "today", to_panel: "differentiate", count: 1 },
    ]);
    expect(summary.terminal_counts).toEqual([
      { panel_id: "tomorrow-plan", count: 2 },
      { panel_id: "differentiate", count: 1 },
    ]);
  });

  it("computes panel time distribution as proportions", () => {
    const makeSession = (id: string, panels: string[]) => ({
      id,
      classroom_id: "test-room",
      session_id: id,
      started_at: "2026-04-11T09:00:00Z",
      ended_at: "2026-04-11T09:30:00Z",
      panels_visited: panels,
      generations_triggered: [] as { panel_id: string; prompt_class: string; timestamp: string }[],
      feedback_count: 0,
    });

    // 3 visits to "today", 1 to "differentiate" = 4 total visits
    saveSession(TEST_ROOM, makeSession("s1", ["today"]));
    saveSession(TEST_ROOM, makeSession("s2", ["today"]));
    saveSession(TEST_ROOM, makeSession("s3", ["today", "differentiate"]));

    const summary = getSessionSummary(TEST_ROOM);
    expect(summary.panel_time_distribution["today"]).toBe(0.75);
    expect(summary.panel_time_distribution["differentiate"]).toBe(0.25);
  });

  it("computes generations per session", () => {
    saveSession(TEST_ROOM, {
      id: "sess-g1",
      classroom_id: "test-room",
      session_id: "sess-g1",
      started_at: "2026-04-11T09:00:00Z",
      ended_at: "2026-04-11T09:30:00Z",
      panels_visited: ["today"],
      generations_triggered: [
        { panel_id: "today", prompt_class: "prepare_tomorrow_plan", timestamp: "2026-04-11T09:05:00Z" },
        { panel_id: "today", prompt_class: "prepare_tomorrow_plan", timestamp: "2026-04-11T09:10:00Z" },
      ],
      feedback_count: 0,
    });
    saveSession(TEST_ROOM, {
      id: "sess-g2",
      classroom_id: "test-room",
      session_id: "sess-g2",
      started_at: "2026-04-11T10:00:00Z",
      ended_at: "2026-04-11T10:30:00Z",
      panels_visited: ["differentiate"],
      generations_triggered: [
        { panel_id: "differentiate", prompt_class: "differentiate_material", timestamp: "2026-04-11T10:05:00Z" },
      ],
      feedback_count: 0,
    });

    const summary = getSessionSummary(TEST_ROOM);
    // 3 total generations / 2 sessions = 1.5
    expect(summary.generations_per_session).toBe(1.5);
  });

  it("returns the repeated Today-starting workflow for the current week", () => {
    const makeSession = (id: string, startedAt: string, panels: string[]) => ({
      id,
      classroom_id: "test-room",
      session_id: id,
      started_at: startedAt,
      ended_at: new Date(new Date(startedAt).getTime() + (30 * 60 * 1000)).toISOString(),
      panels_visited: panels,
      generations_triggered: [] as { panel_id: string; prompt_class: string; timestamp: string }[],
      feedback_count: 0,
    });

    saveSession(TEST_ROOM, makeSession("sess-w1", isoInWeek(0, 0), ["today", "log-intervention", "tomorrow-plan"]));
    saveSession(TEST_ROOM, makeSession("sess-w2", isoInWeek(0, 1), ["today", "log-intervention", "tomorrow-plan"]));
    saveSession(TEST_ROOM, makeSession("sess-w3", isoInWeek(0, 2), ["today", "support-patterns", "family-message"]));

    const summary = getSessionSummary(TEST_ROOM);
    expect(summary.today_workflow_nudge).toEqual({
      week: expect.any(String),
      is_current_week: true,
      sequence: ["today", "log-intervention", "tomorrow-plan"],
      count: 2,
    });
  });

  it("truncates the Today workflow nudge before repeated navigation loops", () => {
    const makeSession = (id: string, startedAt: string, panels: string[]) => ({
      id,
      classroom_id: "test-room",
      session_id: id,
      started_at: startedAt,
      ended_at: new Date(new Date(startedAt).getTime() + (35 * 60 * 1000)).toISOString(),
      panels_visited: panels,
      generations_triggered: [] as { panel_id: string; prompt_class: string; timestamp: string }[],
      feedback_count: 0,
    });

    const loopedFlow = [
      "today",
      "differentiate",
      "today",
      "differentiate",
      "log-intervention",
      "family-message",
    ];

    saveSession(TEST_ROOM, makeSession("sess-loop-1", isoInWeek(0, 0), loopedFlow));
    saveSession(TEST_ROOM, makeSession("sess-loop-2", isoInWeek(0, 1), loopedFlow));
    saveSession(TEST_ROOM, makeSession("sess-other", isoInWeek(0, 2), ["today", "log-intervention", "tomorrow-plan"]));

    const summary = getSessionSummary(TEST_ROOM);
    expect(summary.today_workflow_nudge).toEqual({
      week: expect.any(String),
      is_current_week: true,
      sequence: ["today", "differentiate"],
      count: 2,
    });
  });

  it("falls back to the latest recorded Today-starting workflow when the current week is empty", () => {
    const makeSession = (id: string, startedAt: string, panels: string[]) => ({
      id,
      classroom_id: "test-room",
      session_id: id,
      started_at: startedAt,
      ended_at: new Date(new Date(startedAt).getTime() + (25 * 60 * 1000)).toISOString(),
      panels_visited: panels,
      generations_triggered: [] as { panel_id: string; prompt_class: string; timestamp: string }[],
      feedback_count: 0,
    });

    saveSession(TEST_ROOM, makeSession("sess-old-1", isoInWeek(-2, 0), ["today", "support-patterns", "family-message"]));
    saveSession(TEST_ROOM, makeSession("sess-old-2", isoInWeek(-2, 1), ["today", "support-patterns", "family-message"]));

    const summary = getSessionSummary(TEST_ROOM);
    expect(summary.today_workflow_nudge).toEqual({
      week: expect.any(String),
      is_current_week: false,
      sequence: ["today", "support-patterns", "family-message"],
      count: 2,
    });
  });
});
