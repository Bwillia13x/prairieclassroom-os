// services/memory/db.ts
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// import.meta.dirname is undefined in tsx/CJS mode — derive dirname from URL instead
const _dirname = import.meta.dirname ?? fileURLToPath(new URL(".", import.meta.url));
const MEMORY_DIR = resolve(_dirname, "../../data/memory");
const connections = new Map<string, Database.Database>();

export function getDb(classroomId: string): Database.Database {
  const existing = connections.get(classroomId);
  if (existing) return existing;

  mkdirSync(MEMORY_DIR, { recursive: true });
  const dbPath = join(MEMORY_DIR, `${classroomId}.sqlite`);
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS generated_plans (
      plan_id TEXT PRIMARY KEY,
      classroom_id TEXT NOT NULL,
      teacher_reflection TEXT,
      plan_json TEXT NOT NULL,
      model_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS generated_variants (
      variant_id TEXT PRIMARY KEY,
      artifact_id TEXT NOT NULL,
      classroom_id TEXT NOT NULL,
      variant_json TEXT NOT NULL,
      model_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS family_messages (
      draft_id TEXT PRIMARY KEY,
      classroom_id TEXT NOT NULL,
      student_refs TEXT NOT NULL,
      message_json TEXT NOT NULL,
      teacher_approved INTEGER DEFAULT 0,
      approval_timestamp TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS interventions (
      record_id TEXT PRIMARY KEY,
      classroom_id TEXT NOT NULL,
      student_refs TEXT NOT NULL,
      record_json TEXT NOT NULL,
      model_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pattern_reports (
      report_id TEXT PRIMARY KEY,
      classroom_id TEXT NOT NULL,
      student_filter TEXT,
      report_json TEXT NOT NULL,
      model_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_plans_classroom
      ON generated_plans(classroom_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_variants_classroom
      ON generated_variants(classroom_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_classroom
      ON family_messages(classroom_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_interventions_classroom
      ON interventions(classroom_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_patterns_classroom
      ON pattern_reports(classroom_id, created_at);
  `);

  connections.set(classroomId, db);
  return db;
}

export function checkpointAll(): void {
  for (const [id, db] of connections.entries()) {
    try {
      db.pragma("wal_checkpoint(TRUNCATE)");
    } catch (err) {
      console.warn(`WAL checkpoint failed for ${id}:`, err);
    }
  }
}

export function closeAll(): void {
  checkpointAll();
  for (const db of connections.values()) db.close();
  connections.clear();
}

// Graceful shutdown — checkpoint and close on process exit
let shutdownRegistered = false;
if (!shutdownRegistered) {
  shutdownRegistered = true;
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => {
      console.log(`\nReceived ${signal} — closing databases...`);
      closeAll();
      process.exit(0);
    });
  }
}
