// services/memory/db.ts
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const MEMORY_DIR = resolve(import.meta.dirname ?? ".", "../../data/memory");
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
  `);

  connections.set(classroomId, db);
  return db;
}

export function closeAll(): void {
  for (const db of connections.values()) db.close();
  connections.clear();
}
