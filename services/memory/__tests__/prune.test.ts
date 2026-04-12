// services/memory/__tests__/prune.test.ts
//
// Tests the retention-window pruner that ships as part of the memory-admin
// lifecycle toolkit. The pruner operates directly on SQLite (it's an admin
// operation, not a request-path operation) so we exercise it the same way
// memory-admin itself does: build a real database with migrations applied,
// insert rows with controlled created_at timestamps, run the pruner, then
// assert on row counts and tombstone metadata.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { runMigrations } from "../migrate.js";
// @ts-expect-error - .mjs import without types; the module is plain JS
import { pruneClassroomMemory } from "../../../scripts/lib/memory-admin.mjs";

type PruneResult = {
  total_pruned: number;
  by_table: Record<
    string,
    {
      retention_days: number | null;
      pruned?: number;
      cutoff?: string;
      skipped?: boolean;
      reason?: string;
    }
  >;
};

function daysAgoIso(days: number, now: Date): string {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function insertIntervention(
  db: Database.Database,
  recordId: string,
  createdAt: string,
): void {
  db.prepare(
    `INSERT INTO interventions
       (record_id, classroom_id, student_refs, record_json, model_id, created_at)
     VALUES (?, 'cls-test', '[]', '{}', 'mock', ?)`,
  ).run(recordId, createdAt);
}

function insertFamilyMessage(
  db: Database.Database,
  draftId: string,
  createdAt: string,
): void {
  db.prepare(
    `INSERT INTO family_messages
       (draft_id, classroom_id, student_refs, message_json, created_at)
     VALUES (?, 'cls-test', '[]', '{}', ?)`,
  ).run(draftId, createdAt);
}

function countRows(db: Database.Database, table: string): number {
  const row = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as {
    c: number;
  };
  return row.c;
}

describe("pruneClassroomMemory", () => {
  let tmpDir: string;
  let dbPath: string;
  let db: Database.Database;
  const NOW = new Date("2026-04-11T12:00:00.000Z");

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "prairie-prune-"));
    dbPath = join(tmpDir, "cls-test.sqlite");
    db = new Database(dbPath);
    runMigrations(db);

    // Seed rows at known ages
    insertIntervention(db, "i-365", daysAgoIso(365, NOW)); // 1 year old
    insertIntervention(db, "i-200", daysAgoIso(200, NOW));
    insertIntervention(db, "i-30", daysAgoIso(30, NOW));
    insertIntervention(db, "i-today", NOW.toISOString());

    insertFamilyMessage(db, "m-365", daysAgoIso(365, NOW));
    insertFamilyMessage(db, "m-100", daysAgoIso(100, NOW));
    insertFamilyMessage(db, "m-30", daysAgoIso(30, NOW));

    db.close();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("requires --confirm; refuses by default", async () => {
    await expect(
      pruneClassroomMemory({
        dbPath,
        policy: { default_days: 60 },
        now: NOW,
      }),
    ).rejects.toThrow(/confirm/i);
  });

  it("prunes rows older than default_days across every retention-eligible table", async () => {
    const result: PruneResult = await pruneClassroomMemory({
      dbPath,
      policy: { default_days: 60 },
      confirm: true,
      now: NOW,
    });

    // interventions: 365, 200, 30, today → default_days=60 → prunes i-365 and i-200
    expect(result.by_table.interventions.retention_days).toBe(60);
    expect(result.by_table.interventions.pruned).toBe(2);
    // family_messages: 365, 100, 30 → default_days=60 → prunes m-365 and m-100
    expect(result.by_table.family_messages.pruned).toBe(2);
    expect(result.total_pruned).toBeGreaterThanOrEqual(4);

    const readback = new Database(dbPath, { readonly: true });
    try {
      expect(countRows(readback, "interventions")).toBe(2);
      expect(countRows(readback, "family_messages")).toBe(1);
    } finally {
      readback.close();
    }
  });

  it("applies per-table overrides in preference to default_days", async () => {
    const result: PruneResult = await pruneClassroomMemory({
      dbPath,
      policy: {
        default_days: 60,
        overrides: { interventions: 400 }, // keep interventions longer than default
      },
      confirm: true,
      now: NOW,
    });

    // interventions: override 400 → only i-365 is NOT pruned (barely), so 0 pruned
    // Wait: 365 < 400 so i-365 stays. All interventions stay. pruned = 0.
    expect(result.by_table.interventions.retention_days).toBe(400);
    expect(result.by_table.interventions.pruned).toBe(0);
    // family_messages: falls back to default 60 → prunes m-365 and m-100
    expect(result.by_table.family_messages.retention_days).toBe(60);
    expect(result.by_table.family_messages.pruned).toBe(2);
  });

  it("skips tables when retention is missing, null, or non-positive", async () => {
    const result: PruneResult = await pruneClassroomMemory({
      dbPath,
      policy: { default_days: null },
      confirm: true,
      now: NOW,
    });

    // With null default_days and no overrides, every table is skipped.
    expect(result.total_pruned).toBe(0);
    for (const tableResult of Object.values(result.by_table)) {
      expect(tableResult.skipped).toBe(true);
    }

    const readback = new Database(dbPath, { readonly: true });
    try {
      expect(countRows(readback, "interventions")).toBe(4);
      expect(countRows(readback, "family_messages")).toBe(3);
    } finally {
      readback.close();
    }
  });

  it("skips tables with an override of only a missing table (partial policy)", async () => {
    const result: PruneResult = await pruneClassroomMemory({
      dbPath,
      policy: { overrides: { family_messages: 60 } },
      confirm: true,
      now: NOW,
    });

    expect(result.by_table.interventions.skipped).toBe(true);
    expect(result.by_table.family_messages.skipped).toBeFalsy();
    expect(result.by_table.family_messages.pruned).toBe(2);
  });

  it("reports every retention-eligible table in by_table output", async () => {
    const result: PruneResult = await pruneClassroomMemory({
      dbPath,
      policy: { default_days: 30 },
      confirm: true,
      now: NOW,
    });

    const expectedTables = [
      "generated_plans",
      "generated_variants",
      "family_messages",
      "interventions",
      "pattern_reports",
      "complexity_forecasts",
      "scaffold_reviews",
      "survival_packets",
      "feedback",
      "sessions",
    ];
    for (const table of expectedTables) {
      expect(result.by_table[table]).toBeDefined();
    }
  });
});
