// services/memory/__tests__/runs-store.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import Database from "better-sqlite3";
import { unsafeCastClassroomId } from "../../../packages/shared/schemas/branded.js";
import { runMigrations } from "../migrate.js";
import { RUN_RETENTION_LIMIT } from "../../../packages/shared/schemas/run.js";

let testDb: Database.Database;

vi.mock("../db.js", () => ({
  getDb: vi.fn(() => testDb),
}));

import { saveRun } from "../store.js";
import { getRecentRuns } from "../retrieve.js";

const TEST_ROOM = unsafeCastClassroomId("test-room");

function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  runMigrations(db);
  return db;
}

describe("saveRun + getRecentRuns", () => {
  beforeEach(() => {
    testDb = createTestDb();
  });

  it("upserts a run row with metadata", () => {
    saveRun(TEST_ROOM, {
      run_id: "diff-001",
      tool: "differentiate",
      label: "Fractions worksheet",
      created_at: "2026-04-18T10:00:00.000Z",
      metadata: { source: "photo" },
    });

    const rows = getRecentRuns(TEST_ROOM, "differentiate", 10);
    expect(rows.length).toBe(1);
    expect(rows[0].run_id).toBe("diff-001");
    expect(rows[0].label).toBe("Fractions worksheet");
    expect(rows[0].tool).toBe("differentiate");
    expect(rows[0].metadata).toEqual({ source: "photo" });
  });

  it("returns newest-first within a tool", () => {
    saveRun(TEST_ROOM, {
      run_id: "diff-a",
      tool: "differentiate",
      label: "A",
      created_at: "2026-04-17T10:00:00.000Z",
    });
    saveRun(TEST_ROOM, {
      run_id: "diff-b",
      tool: "differentiate",
      label: "B",
      created_at: "2026-04-18T10:00:00.000Z",
    });
    saveRun(TEST_ROOM, {
      run_id: "diff-c",
      tool: "differentiate",
      label: "C",
      created_at: "2026-04-16T10:00:00.000Z",
    });

    const rows = getRecentRuns(TEST_ROOM, "differentiate", 10);
    expect(rows.map((r) => r.run_id)).toEqual(["diff-b", "diff-a", "diff-c"]);
  });

  it("scopes by tool", () => {
    saveRun(TEST_ROOM, {
      run_id: "s-1",
      tool: "simplify",
      label: "simplify",
      created_at: "2026-04-18T10:00:00.000Z",
    });
    saveRun(TEST_ROOM, {
      run_id: "v-1",
      tool: "vocab",
      label: "vocab",
      created_at: "2026-04-18T11:00:00.000Z",
    });

    expect(getRecentRuns(TEST_ROOM, "simplify", 10).map((r) => r.run_id)).toEqual(["s-1"]);
    expect(getRecentRuns(TEST_ROOM, "vocab", 10).map((r) => r.run_id)).toEqual(["v-1"]);
    expect(getRecentRuns(TEST_ROOM, "differentiate", 10)).toEqual([]);
  });

  it("upsert on same run_id does not duplicate", () => {
    saveRun(TEST_ROOM, {
      run_id: "same",
      tool: "simplify",
      label: "first",
      created_at: "2026-04-18T10:00:00.000Z",
    });
    saveRun(TEST_ROOM, {
      run_id: "same",
      tool: "simplify",
      label: "second",
      created_at: "2026-04-18T10:05:00.000Z",
    });

    const rows = getRecentRuns(TEST_ROOM, "simplify", 10);
    expect(rows.length).toBe(1);
    expect(rows[0].label).toBe("second");
  });

  it(`enforces the ${RUN_RETENTION_LIMIT}-row retention per (classroom, tool)`, () => {
    for (let i = 0; i < RUN_RETENTION_LIMIT + 5; i += 1) {
      saveRun(TEST_ROOM, {
        run_id: `diff-${i}`,
        tool: "differentiate",
        label: `run ${i}`,
        // Monotonically increasing timestamp so the NEWEST rows are kept.
        created_at: new Date(2026, 0, 1, 0, i).toISOString(),
      });
    }

    const rows = getRecentRuns(TEST_ROOM, "differentiate", RUN_RETENTION_LIMIT + 20);
    expect(rows.length).toBe(RUN_RETENTION_LIMIT);
    // Oldest retained is RUN_RETENTION_LIMIT+5 - RUN_RETENTION_LIMIT = 5.
    const retainedIds = new Set(rows.map((r) => r.run_id));
    for (let i = 0; i < 5; i += 1) {
      expect(retainedIds.has(`diff-${i}`)).toBe(false);
    }
    for (let i = 5; i < RUN_RETENTION_LIMIT + 5; i += 1) {
      expect(retainedIds.has(`diff-${i}`)).toBe(true);
    }
  });
});
