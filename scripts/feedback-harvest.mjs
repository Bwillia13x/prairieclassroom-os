#!/usr/bin/env node
/**
 * feedback-harvest.mjs — Walk per-classroom SQLite memory DBs, find low-rated
 * teacher feedback rows, and materialize them as draft eval candidate files in
 * `evals/cases/_pending/`. Closes the F14 gap: thumbs-down generations now
 * round-trip into the eval suite as regression-candidate skeletons.
 *
 * Idempotent — re-running won't overwrite existing pending files (so an
 * operator who has already started enriching a case won't lose work).
 *
 * Usage:
 *   node scripts/feedback-harvest.mjs                     # all classrooms, last 30 days, rating <= 2
 *   node scripts/feedback-harvest.mjs --since 2026-04-01
 *   node scripts/feedback-harvest.mjs --rating-max 3
 *   node scripts/feedback-harvest.mjs --classroom demo-okafor-grade34
 *   node scripts/feedback-harvest.mjs --dry-run           # print summary, write nothing
 *
 * Output:
 *   - one JSON file per harvested feedback row, in evals/cases/_pending/
 *   - exit code 0 (success), 2 (IO error)
 */
import Database from "better-sqlite3";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDraftCase, draftFilename } from "./lib/feedback-harvest.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
const MEMORY_DIR = process.env.PRAIRIE_MEMORY_DIR
  ? resolve(process.env.PRAIRIE_MEMORY_DIR)
  : join(ROOT, "data", "memory");
const PENDING_DIR = join(ROOT, "evals", "cases", "_pending");

const args = parseArgs(process.argv.slice(2));
const ratingMax = Number.isFinite(args.ratingMax) ? args.ratingMax : 2;
const sinceIso = args.since
  ? toIsoDate(args.since)
  : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
const onlyClassroom = args.classroom?.trim() || null;
const dryRun = !!args.dryRun;

if (!existsSync(MEMORY_DIR)) {
  console.log(`feedback-harvest: memory dir not found at ${MEMORY_DIR} — nothing to harvest.`);
  process.exit(0);
}

const dbFiles = readdirSync(MEMORY_DIR)
  .filter((name) => name.endsWith(".db"))
  .filter((name) => !onlyClassroom || name === `${onlyClassroom}.db`);

if (dbFiles.length === 0) {
  const filterMsg = onlyClassroom ? ` matching --classroom ${onlyClassroom}` : "";
  console.log(`feedback-harvest: no .db files in ${MEMORY_DIR}${filterMsg} — nothing to harvest.`);
  process.exit(0);
}

let totalHarvested = 0;
let totalSkipped = 0;
let totalRows = 0;

if (!dryRun) {
  mkdirSync(PENDING_DIR, { recursive: true });
}

for (const dbFile of dbFiles) {
  const classroomId = dbFile.replace(/\.db$/, "");
  const dbPath = join(MEMORY_DIR, dbFile);
  let rows;
  try {
    rows = queryLowRated(dbPath, classroomId, ratingMax, sinceIso);
  } catch (err) {
    console.error(`feedback-harvest: failed to query ${dbFile}: ${err.message}`);
    continue;
  }

  totalRows += rows.length;
  for (const row of rows) {
    const filename = draftFilename(row);
    const target = join(PENDING_DIR, filename);
    if (existsSync(target)) {
      totalSkipped++;
      continue;
    }
    if (dryRun) {
      totalHarvested++;
      console.log(`  [dry-run] would write ${filename}`);
      continue;
    }
    const draft = buildDraftCase(row);
    writeFileSync(target, `${JSON.stringify(draft, null, 2)}\n`, "utf8");
    totalHarvested++;
  }
}

const writeNote = dryRun ? " (dry-run — no files written)" : "";
console.log(
  `feedback-harvest: scanned ${dbFiles.length} classroom DB(s), ` +
    `found ${totalRows} low-rated row(s) (rating<=${ratingMax}, since ${sinceIso}). ` +
    `Wrote ${totalHarvested} draft case(s), skipped ${totalSkipped} pre-existing${writeNote}.`,
);
process.exit(0);

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--since" && argv[i + 1]) { out.since = argv[++i]; }
    else if (argv[i] === "--rating-max" && argv[i + 1]) { out.ratingMax = Number.parseInt(argv[++i], 10); }
    else if (argv[i] === "--classroom" && argv[i + 1]) { out.classroom = argv[++i]; }
    else if (argv[i] === "--dry-run") { out.dryRun = true; }
  }
  return out;
}

function toIsoDate(input) {
  // Accept YYYY-MM-DD shorthand or full ISO; always emit a normalized ISO.
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return `${input}T00:00:00.000Z`;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) {
    console.error(`feedback-harvest: --since "${input}" is not a recognizable date.`);
    process.exit(2);
  }
  return d.toISOString();
}

function queryLowRated(dbPath, classroomId, ratingMax, sinceIso) {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    return db
      .prepare(
        `SELECT id, classroom_id, panel_id, prompt_class, rating, comment,
                generation_id, session_id, created_at
         FROM feedback
         WHERE classroom_id = ? AND rating <= ? AND created_at >= ?
         ORDER BY created_at DESC`,
      )
      .all(classroomId, ratingMax, sinceIso);
  } finally {
    db.close();
  }
}
