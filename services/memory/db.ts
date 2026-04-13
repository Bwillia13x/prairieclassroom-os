// services/memory/db.ts
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isValidClassroomId } from "../orchestrator/validate.js";
import type { ClassroomId } from "../../packages/shared/schemas/branded.js";
import { runMigrations } from "./migrate.js";

// import.meta.dirname is undefined in tsx/CJS mode — derive dirname from URL instead
const _dirname = import.meta.dirname ?? fileURLToPath(new URL(".", import.meta.url));
const DEFAULT_MEMORY_DIR = resolve(_dirname, "../../data/memory");
const MEMORY_DIR = process.env.PRAIRIE_MEMORY_DIR
  ? resolve(process.env.PRAIRIE_MEMORY_DIR)
  : DEFAULT_MEMORY_DIR;
const connections = new Map<string, Database.Database>();

export function getDb(classroomId: ClassroomId): Database.Database {
  if (!isValidClassroomId(classroomId)) {
    throw new Error(`Invalid classroomId: ${classroomId}`);
  }

  const existing = connections.get(classroomId);
  if (existing) return existing;

  mkdirSync(MEMORY_DIR, { recursive: true });
  const dbPath = join(MEMORY_DIR, `${classroomId}.sqlite`);
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  runMigrations(db);

  connections.set(classroomId, db);
  return db;
}

export function assertMemoryBackendReady(): void {
  const db = new Database(":memory:");
  try {
    db.prepare("SELECT 1 AS ok").get();
  } finally {
    db.close();
  }
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
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    console.log(`\nReceived ${signal} — closing databases...`);
    closeAll();
    process.exit(0);
  });
}
