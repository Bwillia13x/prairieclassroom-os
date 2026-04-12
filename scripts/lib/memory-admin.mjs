import { existsSync, statSync } from "node:fs";
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";

export const DATA_TABLES = [
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

export function assertClassroomId(classroomId) {
  if (!/^[a-z0-9][a-z0-9-]{0,98}[a-z0-9]$/.test(classroomId)) {
    throw new Error(`Invalid classroom id: ${classroomId}`);
  }
}

export function defaultMemoryDir(rootDir) {
  return process.env.PRAIRIE_MEMORY_DIR
    ? path.resolve(process.env.PRAIRIE_MEMORY_DIR)
    : path.join(rootDir, "data", "memory");
}

export function resolveClassroomDbPath({ rootDir, classroomId, memoryDir }) {
  assertClassroomId(classroomId);
  return path.join(memoryDir ? path.resolve(memoryDir) : defaultMemoryDir(rootDir), `${classroomId}.sqlite`);
}

function openDatabase(dbPath, readonly = true) {
  if (!existsSync(dbPath)) {
    throw new Error(`Classroom memory database not found: ${dbPath}`);
  }
  return new Database(dbPath, { readonly, fileMustExist: true });
}

function tableExists(db, tableName) {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName);
  return Boolean(row);
}

function parseJsonColumn(column, value) {
  if (typeof value !== "string") return value;
  const jsonColumns = new Set([
    "plan_json",
    "variant_json",
    "message_json",
    "record_json",
    "report_json",
    "forecast_json",
    "packet_json",
    "student_refs",
    "panels_visited",
    "generations_triggered",
  ]);
  if (!jsonColumns.has(column)) return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeRow(row) {
  return Object.fromEntries(
    Object.entries(row).map(([column, value]) => [column, parseJsonColumn(column, value)]),
  );
}

function readTableRows(db, tableName) {
  if (!tableExists(db, tableName)) return [];
  const orderColumn = tableName === "family_messages" ? "created_at" : "created_at";
  return db
    .prepare(`SELECT * FROM ${tableName} ORDER BY ${orderColumn}`)
    .all()
    .map(normalizeRow);
}

export function summarizeClassroomMemory(dbPath) {
  const db = openDatabase(dbPath, true);
  try {
    const details = statSyncSafe(dbPath);
    const tables = {};
    for (const tableName of DATA_TABLES) {
      if (!tableExists(db, tableName)) {
        tables[tableName] = { exists: false, count: 0 };
        continue;
      }
      const countRow = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
      const latestRow = tableHasColumn(db, tableName, "created_at")
        ? db.prepare(`SELECT MAX(created_at) as latest FROM ${tableName}`).get()
        : { latest: null };
      tables[tableName] = {
        exists: true,
        count: Number(countRow?.count ?? 0),
        latest_created_at: latestRow?.latest ?? null,
      };
    }

    return {
      db_path: dbPath,
      size_bytes: details?.size ?? null,
      tables,
    };
  } finally {
    db.close();
  }
}

function statSyncSafe(filePath) {
  try {
    return existsSync(filePath) ? statSync(filePath) : null;
  } catch {
    return null;
  }
}

function tableHasColumn(db, tableName, columnName) {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return rows.some((row) => row.name === columnName);
}

export function exportClassroomMemory({ dbPath, classroomId, anonymize = false }) {
  const db = openDatabase(dbPath, true);
  try {
    const tables = {};
    const table_counts = {};
    for (const tableName of DATA_TABLES) {
      const rows = readTableRows(db, tableName);
      tables[tableName] = rows;
      table_counts[tableName] = rows.length;
    }

    const exported = {
      generated_at: new Date().toISOString(),
      export_type: anonymize ? "anonymized-classroom-memory" : "classroom-memory",
      classroom_id: classroomId,
      source_db: dbPath,
      table_counts,
      tables,
      notes: anonymize
        ? [
            "Structural anonymization replaces classroom IDs and detected student reference fields.",
            "Operators must still review free-text fields before sharing outside a real pilot boundary.",
          ]
        : [],
    };

    return anonymize ? anonymizeClassroomExport(exported) : exported;
  } finally {
    db.close();
  }
}

function collectStudentRefs(value, refs = new Set(), key = "") {
  if (Array.isArray(value)) {
    for (const item of value) collectStudentRefs(item, refs, key);
    return refs;
  }
  if (value && typeof value === "object") {
    for (const [childKey, childValue] of Object.entries(value)) {
      collectStudentRefs(childValue, refs, childKey);
    }
    return refs;
  }
  if (typeof value === "string" && /student_?refs?|student_filter/i.test(key) && value.trim()) {
    refs.add(value.trim());
  }
  return refs;
}

function replaceKnownRefs(text, refMap) {
  let next = text;
  for (const [rawRef, anonymizedRef] of refMap.entries()) {
    next = next.split(rawRef).join(anonymizedRef);
  }
  return next;
}

function anonymizeValue(value, context) {
  if (Array.isArray(value)) {
    return value.map((item) => anonymizeValue(item, context));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, childValue]) => {
        if (/classroom_id/i.test(key)) return [key, context.classroomId];
        if (key === "source_db") return [key, "redacted-source.sqlite"];
        if (/student_?refs?|student_filter/i.test(key)) {
          return [key, anonymizeStudentRefValue(childValue, context.refMap)];
        }
        return [key, anonymizeValue(childValue, context)];
      }),
    );
  }
  if (typeof value === "string") {
    return replaceKnownRefs(value, context.refMap);
  }
  return value;
}

function anonymizeStudentRefValue(value, refMap) {
  if (Array.isArray(value)) {
    return value.map((item) => anonymizeStudentRefValue(item, refMap));
  }
  if (typeof value === "string") {
    const direct = refMap.get(value);
    return direct ?? replaceKnownRefs(value, refMap);
  }
  return anonymizeValue(value, { classroomId: "classroom-001", refMap });
}

export function anonymizeClassroomExport(exported) {
  const refs = collectStudentRefs(exported);
  const refMap = new Map(
    [...refs]
      .sort((left, right) => left.localeCompare(right))
      .map((ref, index) => [ref, `student-${String(index + 1).padStart(3, "0")}`]),
  );
  const anonymized = anonymizeValue(exported, {
    classroomId: "classroom-001",
    refMap,
  });
  anonymized.generated_at = exported.generated_at;
  anonymized.export_type = "anonymized-classroom-memory";
  anonymized.anonymization = {
    classroom_id: "classroom-001",
    student_ref_count: refMap.size,
    free_text_review_required: true,
  };
  return anonymized;
}

export async function writeJsonArtifact(filePath, payload) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return filePath;
}

export async function backupClassroomMemory({ dbPath, outPath }) {
  await mkdir(path.dirname(outPath), { recursive: true });
  const db = openDatabase(dbPath, true);
  try {
    await db.backup(outPath);
  } finally {
    db.close();
  }
  return outPath;
}

export async function purgeClassroomMemory({ dbPath, confirm = false }) {
  if (!confirm) {
    throw new Error("Refusing to purge classroom memory without --confirm.");
  }
  const removed = [];
  for (const suffix of ["", "-wal", "-shm"]) {
    const filePath = `${dbPath}${suffix}`;
    if (!existsSync(filePath)) continue;
    await rm(filePath, { force: true });
    removed.push(filePath);
  }
  return removed;
}

export async function restoreClassroomMemory({ dbPath, fromPath, confirm = false, backupPath }) {
  if (!confirm) {
    throw new Error("Refusing to restore classroom memory without --confirm.");
  }
  if (!existsSync(fromPath)) {
    throw new Error(`Restore source not found: ${fromPath}`);
  }
  await mkdir(path.dirname(dbPath), { recursive: true });
  let replaced_backup = null;
  if (existsSync(dbPath) && backupPath) {
    replaced_backup = await backupClassroomMemory({ dbPath, outPath: backupPath });
  }
  for (const suffix of ["-wal", "-shm"]) {
    await rm(`${dbPath}${suffix}`, { force: true });
  }
  await copyFile(fromPath, dbPath);
  return { restored: dbPath, replaced_backup };
}

// Resolve the retention-days window for a single table, preferring a per-table
// override over default_days. Returns null when no pruning should occur.
function resolveRetentionDays(policy, tableName) {
  if (!policy) return null;
  const override = policy.overrides?.[tableName];
  if (typeof override === "number" && override > 0) return override;
  const fallback = policy.default_days;
  if (typeof fallback === "number" && fallback > 0) return fallback;
  return null;
}

/**
 * Delete rows older than the configured retention window from every
 * retention-eligible table for a single classroom database.
 *
 * Governance notes:
 * - Pruning is never automatic — callers must pass `confirm: true`.
 * - Null / missing / zero retention means "keep indefinitely" and the
 *   affected table is skipped entirely (never partially pruned).
 * - Overrides take precedence over default_days on a per-table basis.
 * - The return payload is structured so the CLI can emit a tombstone
 *   artifact suitable for pilot audit evidence.
 */
export async function pruneClassroomMemory({
  dbPath,
  policy,
  confirm = false,
  now = new Date(),
}) {
  if (!confirm) {
    throw new Error("Refusing to prune classroom memory without --confirm.");
  }
  const db = openDatabase(dbPath, false);
  try {
    const byTable = {};
    let totalPruned = 0;

    const applyPrune = db.transaction(() => {
      for (const tableName of DATA_TABLES) {
        const retentionDays = resolveRetentionDays(policy, tableName);
        if (retentionDays === null) {
          byTable[tableName] = {
            retention_days: null,
            pruned: 0,
            skipped: true,
          };
          continue;
        }
        if (!tableExists(db, tableName) || !tableHasColumn(db, tableName, "created_at")) {
          byTable[tableName] = {
            retention_days: retentionDays,
            pruned: 0,
            reason: "missing_table_or_created_at",
          };
          continue;
        }
        const cutoffMs = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
        const cutoff = new Date(cutoffMs).toISOString();
        const info = db
          .prepare(`DELETE FROM ${tableName} WHERE created_at < ?`)
          .run(cutoff);
        byTable[tableName] = {
          retention_days: retentionDays,
          pruned: info.changes,
          cutoff,
        };
        totalPruned += info.changes;
      }
    });
    applyPrune();

    try {
      db.pragma("wal_checkpoint(TRUNCATE)");
    } catch {
      // non-fatal: WAL checkpoint is an optimization, not a correctness
      // requirement. Leaving the WAL in place is safe.
    }

    return { total_pruned: totalPruned, by_table: byTable };
  } finally {
    db.close();
  }
}
