/**
 * Lightweight SQLite migration runner for PrairieClassroom OS.
 *
 * Migrations are numbered SQL files in services/memory/migrations/.
 * Each migration runs once per database, tracked in a _migrations table.
 * Migrations run inside a transaction -- if any statement fails, the
 * entire migration is rolled back.
 */
import Database from "better-sqlite3";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const _dirname =
  import.meta.dirname ?? fileURLToPath(new URL(".", import.meta.url));
const MIGRATIONS_DIR = resolve(_dirname, "migrations");

interface MigrationRecord {
  version: number;
  name: string;
  applied_at: string;
}

/** Ensure the _migrations tracking table exists */
function ensureMigrationsTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);
}

/** Get all migration files sorted by version number */
function loadMigrationFiles(): {
  version: number;
  name: string;
  path: string;
}[] {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{3}_.*\.sql$/.test(f))
    .sort();

  return files.map((f) => ({
    version: parseInt(f.slice(0, 3), 10),
    name: f.replace(/\.sql$/, ""),
    path: join(MIGRATIONS_DIR, f),
  }));
}

/** Get the highest applied version for this database */
function getAppliedVersion(db: Database.Database): number {
  const row = db
    .prepare("SELECT MAX(version) as max_version FROM _migrations")
    .get() as { max_version: number | null } | undefined;
  return row?.max_version ?? 0;
}

/** Apply all pending migrations to a database */
export function runMigrations(db: Database.Database): {
  applied: number;
  current: number;
} {
  ensureMigrationsTable(db);

  const migrations = loadMigrationFiles();
  const appliedVersion = getAppliedVersion(db);
  const pending = migrations.filter((m) => m.version > appliedVersion);

  if (pending.length === 0) {
    return { applied: 0, current: appliedVersion };
  }

  let applied = 0;
  for (const migration of pending) {
    const sql = readFileSync(migration.path, "utf-8");

    const runMigration = db.transaction(() => {
      db.exec(sql);
      db.prepare(
        "INSERT INTO _migrations (version, name, applied_at) VALUES (?, ?, ?)",
      ).run(migration.version, migration.name, new Date().toISOString());
    });

    try {
      runMigration();
      applied++;
      console.log(`  Migration ${migration.name} applied`);
    } catch (err) {
      console.error(`Migration ${migration.name} FAILED:`, err);
      throw err; // Propagate -- don't silently skip
    }
  }

  return { applied, current: appliedVersion + applied };
}

// Re-export the interface for consumers that need it
export type { MigrationRecord };
