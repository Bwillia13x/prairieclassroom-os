// services/memory/__tests__/migrate.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { mkdirSync, writeFileSync, rmSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

import { runMigrations } from "../migrate.js";

const ALL_TABLES = [
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
  "runs",
];

const ALL_INDEXES = [
  "idx_forecasts_classroom",
  "idx_plans_classroom",
  "idx_variants_classroom",
  "idx_messages_classroom",
  "idx_interventions_classroom",
  "idx_patterns_classroom",
  "idx_scaffold_reviews_classroom",
  "idx_survival_packets_classroom",
  "idx_feedback_classroom",
  "idx_feedback_panel",
  "idx_sessions_classroom",
  "idx_runs_classroom_tool",
];

function getTableNames(db: Database.Database): string[] {
  const rows = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '\\_%' ESCAPE '\\' ORDER BY name",
    )
    .all() as { name: string }[];
  return rows.map((r) => r.name);
}

function getIndexNames(db: Database.Database): string[] {
  const rows = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .all() as { name: string }[];
  return rows.map((r) => r.name);
}

function getMigrationRecords(
  db: Database.Database,
): { version: number; name: string; applied_at: string }[] {
  return db.prepare("SELECT * FROM _migrations ORDER BY version").all() as {
    version: number;
    name: string;
    applied_at: string;
  }[];
}

describe("runMigrations (real migration files)", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  it("creates all 10 tables on a fresh database", () => {
    runMigrations(db);
    const tables = getTableNames(db);
    for (const t of ALL_TABLES) {
      expect(tables).toContain(t);
    }
  });

  it("creates all 11 indexes on a fresh database", () => {
    runMigrations(db);
    const indexes = getIndexNames(db);
    for (const idx of ALL_INDEXES) {
      expect(indexes).toContain(idx);
    }
  });

  it("is idempotent -- second run applies 0 migrations", () => {
    const first = runMigrations(db);
    expect(first.applied).toBe(3);
    expect(first.current).toBe(3);

    const second = runMigrations(db);
    expect(second.applied).toBe(0);
    expect(second.current).toBe(3);
  });

  it("records migration versions in _migrations table", () => {
    runMigrations(db);
    const records = getMigrationRecords(db);
    expect(records).toHaveLength(3);
    expect(records[0].version).toBe(1);
    expect(records[0].name).toBe("001_initial_schema");
    expect(records[0].applied_at).toBeTruthy();
    // applied_at should be a valid ISO date string
    expect(new Date(records[0].applied_at).getTime()).not.toBeNaN();
    expect(records[1].version).toBe(2);
    expect(records[1].name).toBe("002_feedback_and_sessions");
    expect(records[2].version).toBe(3);
    expect(records[2].name).toBe("003_runs");
  });

  it("handles a database that already has tables (backward compatibility)", () => {
    // Simulate a pre-migration database that already has the tables
    db.exec("CREATE TABLE generated_plans (plan_id TEXT PRIMARY KEY, classroom_id TEXT NOT NULL, teacher_reflection TEXT, plan_json TEXT NOT NULL, model_id TEXT, created_at TEXT NOT NULL)");
    // Insert a row to prove data survives
    db.prepare(
      "INSERT INTO generated_plans (plan_id, classroom_id, plan_json, created_at) VALUES (?, ?, ?, ?)",
    ).run("plan-existing", "room-1", "{}", "2026-01-01T00:00:00Z");

    // Migrations use IF NOT EXISTS, so they should not fail
    const result = runMigrations(db);
    expect(result.applied).toBe(3);

    // Existing data should survive
    const row = db
      .prepare("SELECT plan_id FROM generated_plans WHERE plan_id = ?")
      .get("plan-existing") as { plan_id: string } | undefined;
    expect(row?.plan_id).toBe("plan-existing");
  });

  it("creates feedback table with correct columns", () => {
    runMigrations(db);
    const info = db.prepare("PRAGMA table_info(feedback)").all() as {
      name: string;
      type: string;
      notnull: number;
    }[];
    const cols = info.map((c) => c.name);
    expect(cols).toEqual([
      "id",
      "classroom_id",
      "panel_id",
      "prompt_class",
      "rating",
      "comment",
      "generation_id",
      "session_id",
      "created_at",
    ]);
    // Verify NOT NULL constraints on key columns
    const notNullCols = info.filter((c) => c.notnull).map((c) => c.name);
    expect(notNullCols).toContain("classroom_id");
    expect(notNullCols).toContain("panel_id");
    expect(notNullCols).toContain("rating");
    expect(notNullCols).toContain("created_at");
  });

  it("creates sessions table with correct columns", () => {
    runMigrations(db);
    const info = db.prepare("PRAGMA table_info(sessions)").all() as {
      name: string;
      type: string;
      notnull: number;
    }[];
    const cols = info.map((c) => c.name);
    expect(cols).toEqual([
      "id",
      "classroom_id",
      "started_at",
      "ended_at",
      "panels_visited",
      "generations_triggered",
      "feedback_count",
      "created_at",
    ]);
    const notNullCols = info.filter((c) => c.notnull).map((c) => c.name);
    expect(notNullCols).toContain("classroom_id");
    expect(notNullCols).toContain("started_at");
    expect(notNullCols).toContain("ended_at");
    expect(notNullCols).toContain("panels_visited");
    expect(notNullCols).toContain("generations_triggered");
    expect(notNullCols).toContain("feedback_count");
  });

  it("enforces rating CHECK constraint on feedback table", () => {
    runMigrations(db);
    // Valid rating should succeed
    db.prepare(
      "INSERT INTO feedback (id, classroom_id, panel_id, rating, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run("fb-ok", "room-1", "today", 3, "2026-04-11T00:00:00Z");

    // Rating 0 should violate CHECK constraint
    expect(() =>
      db.prepare(
        "INSERT INTO feedback (id, classroom_id, panel_id, rating, created_at) VALUES (?, ?, ?, ?, ?)",
      ).run("fb-bad-low", "room-1", "today", 0, "2026-04-11T00:00:00Z"),
    ).toThrow();

    // Rating 6 should violate CHECK constraint
    expect(() =>
      db.prepare(
        "INSERT INTO feedback (id, classroom_id, panel_id, rating, created_at) VALUES (?, ?, ?, ?, ?)",
      ).run("fb-bad-high", "room-1", "today", 6, "2026-04-11T00:00:00Z"),
    ).toThrow();
  });
});

describe("runMigrations (multi-migration sequence)", () => {
  let db: Database.Database;
  let tempDir: string;

  beforeEach(() => {
    db = new Database(":memory:");
    tempDir = join(
      tmpdir(),
      `prairie-migrate-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("applies a fourth migration file after 001+002+003", () => {
    // First, apply the real migrations (001 + 002 + 003)
    runMigrations(db);
    expect(getMigrationRecords(db)).toHaveLength(3);

    // Copy the real migration files into temp dir
    const real001Path = resolve(
      import.meta.dirname ?? ".",
      "../migrations/001_initial_schema.sql",
    );
    const real002Path = resolve(
      import.meta.dirname ?? ".",
      "../migrations/002_feedback_and_sessions.sql",
    );
    const real003Path = resolve(
      import.meta.dirname ?? ".",
      "../migrations/003_runs.sql",
    );
    writeFileSync(join(tempDir, "001_initial_schema.sql"), readFileSync(real001Path, "utf-8"));
    writeFileSync(join(tempDir, "002_feedback_and_sessions.sql"), readFileSync(real002Path, "utf-8"));
    writeFileSync(join(tempDir, "003_runs.sql"), readFileSync(real003Path, "utf-8"));

    // Create a 004 migration that adds a column
    writeFileSync(
      join(tempDir, "004_add_test_column.sql"),
      "ALTER TABLE generated_plans ADD COLUMN notes TEXT;\n",
    );

    // Replicate the migration logic with the temp directory to test
    // the core sequencing algorithm against our real _migrations table.
    const files = readdirSync(tempDir)
      .filter((f: string) => /^\d{3}_.*\.sql$/.test(f))
      .sort();

    const migrations = files.map((f: string) => ({
      version: parseInt(f.slice(0, 3), 10),
      name: f.replace(/\.sql$/, ""),
      path: join(tempDir, f),
    }));

    // Get current applied version
    const row = db
      .prepare("SELECT MAX(version) as max_version FROM _migrations")
      .get() as { max_version: number | null };
    const appliedVersion = row?.max_version ?? 0;
    expect(appliedVersion).toBe(3);

    // Apply only pending (004)
    const pending = migrations.filter((m) => m.version > appliedVersion);
    expect(pending).toHaveLength(1);
    expect(pending[0].name).toBe("004_add_test_column");

    for (const migration of pending) {
      const sql = readFileSync(migration.path, "utf-8");
      const run = db.transaction(() => {
        db.exec(sql);
        db.prepare(
          "INSERT INTO _migrations (version, name, applied_at) VALUES (?, ?, ?)",
        ).run(migration.version, migration.name, new Date().toISOString());
      });
      run();
    }

    // Verify 004 applied
    const records = getMigrationRecords(db);
    expect(records).toHaveLength(4);
    expect(records[0].version).toBe(1);
    expect(records[1].version).toBe(2);
    expect(records[2].version).toBe(3);
    expect(records[3].version).toBe(4);
    expect(records[3].name).toBe("004_add_test_column");

    // Verify the column was actually added
    const info = db.prepare("PRAGMA table_info(generated_plans)").all() as {
      name: string;
    }[];
    const columnNames = info.map((c) => c.name);
    expect(columnNames).toContain("notes");
  });
});
