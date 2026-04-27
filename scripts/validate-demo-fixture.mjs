#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CLASSROOM = "demo-okafor-grade34";
const DEMO_FILE = path.join(ROOT, "data", "synthetic_classrooms", "classroom_demo.json");
const SEED_FILE = path.join(ROOT, "data", "demo", "seed.ts");
const SYNTHETIC_CLASSROOM_DIR = path.join(ROOT, "data", "synthetic_classrooms");
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_DEMO_RECORD_AGE_DAYS = 45;

const EXPECTED_COUNTS = {
  interventions: 36,
  generated_plans: 3,
  pattern_reports: 1,
  family_messages: 1,
  sessions: 5,
  feedback: 0,
  complexity_forecasts: 0,
  scaffold_reviews: 0,
  survival_packets: 0,
  generated_variants: 0,
  runs: 0,
};

const ACTIVE_ALIASES = new Set([
  "Amira",
  "Brody",
  "Chantal",
  "Daniyal",
  "Elena",
  "Farid",
  "Gabriel",
  "Hannah",
]);
const WATCHLIST_ALIASES = new Set([
  "Imani",
  "Marco",
  "Jasper",
  "Kiana",
  "Nadia",
  "Oliver",
  "Quinn",
]);
const ORDINARY_ALIASES = new Set([
  "Maya",
  "Wesley",
  "Anaya",
  "Violet",
  "Xavier",
  "Sebastián",
  "Navpreet",
  "Rania",
  "Uyen",
  "Liam",
  "Zayn",
]);
const EMPTY_SUPPORT_ALIASES = new Set(["Liam", "Violet", "Zayn"]);

const PINNED_CORE_ALIASES = new Map([
  ["D1", "Amira"],
  ["D2", "Brody"],
  ["D3", "Chantal"],
  ["D4", "Daniyal"],
  ["D5", "Elena"],
  ["D6", "Farid"],
]);

const FORBIDDEN_LANGUAGE = [
  /\bdiagnos(?:is|ed)\b/i,
  /\badhd\b/i,
  /\bautism\b/i,
  /\basd\b/i,
  /\boppositional\b/i,
  /\bconduct disorder\b/i,
  /\brisk score\b/i,
  /\bat-risk\b/i,
  /\bpathological\b/i,
  /\breal student\b/i,
  /\bactual student\b/i,
];

function fail(message) {
  throw new Error(message);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function aliasesEqual(left, right) {
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
}

function assertNoDuplicateAliases() {
  const aliases = new Map();
  for (const file of readdirSync(SYNTHETIC_CLASSROOM_DIR).filter((name) => /^classroom_.*\.json$/.test(name))) {
    const classroom = readJson(path.join(SYNTHETIC_CLASSROOM_DIR, file));
    for (const student of classroom.students ?? []) {
      const prior = aliases.get(student.alias);
      if (prior) {
        fail(`Duplicate synthetic alias "${student.alias}" found in ${prior} and ${file}.`);
      }
      aliases.set(student.alias, file);
    }
  }
}

function assertDemoRosterContract(demo) {
  if (demo.classroom_id !== CLASSROOM) {
    fail(`Expected demo classroom_id ${CLASSROOM}, got ${demo.classroom_id}.`);
  }
  if (demo.is_demo !== true) {
    fail("Demo classroom must be marked is_demo=true.");
  }
  if ((demo.students ?? []).length !== 26) {
    fail(`Expected 26 demo students, got ${(demo.students ?? []).length}.`);
  }

  const byId = new Map(demo.students.map((student) => [student.student_id, student]));
  for (const [studentId, alias] of PINNED_CORE_ALIASES) {
    if (byId.get(studentId)?.alias !== alias) {
      fail(`Pinned core alias ${studentId} must remain ${alias}.`);
    }
  }

  const aliases = new Set(demo.students.map((student) => student.alias));
  const tierAliases = new Set([...ACTIVE_ALIASES, ...WATCHLIST_ALIASES, ...ORDINARY_ALIASES]);
  if (!aliasesEqual(aliases, tierAliases)) {
    const missing = [...tierAliases].filter((alias) => !aliases.has(alias));
    const extra = [...aliases].filter((alias) => !tierAliases.has(alias));
    fail(`Demo tier aliases drifted. Missing: ${missing.join(", ") || "none"}. Extra: ${extra.join(", ") || "none"}.`);
  }

  const ealStudents = demo.students.filter((student) => student.eal_flag === true);
  if (ealStudents.length !== 8) {
    fail(`Expected 8 EAL demo students, got ${ealStudents.length}.`);
  }

  for (const student of demo.students) {
    const tags = student.support_tags ?? [];
    const ealTags = tags.filter((tag) => /^eal_level_[123]$/.test(tag));
    if (student.eal_flag) {
      if (ealTags.length !== 1) {
        fail(`${student.alias} is EAL and must have exactly one eal_level_1/2/3 tag.`);
      }
      if (!student.family_language) {
        fail(`${student.alias} is EAL and must include family_language.`);
      }
    } else if (ealTags.length > 0) {
      fail(`${student.alias} is not EAL but has EAL level tags.`);
    }

    if (EMPTY_SUPPORT_ALIASES.has(student.alias)) {
      if (tags.length !== 0 || (student.known_successful_scaffolds ?? []).length !== 0) {
        fail(`${student.alias} should be an ordinary baseline student with empty support tags and scaffolds.`);
      }
    }

    if (ORDINARY_ALIASES.has(student.alias)) {
      if (tags.length > 2) {
        fail(`${student.alias} is ordinary/light-touch tier and should not carry more than 2 support tags.`);
      }
      if ((student.known_successful_scaffolds ?? []).length > 1) {
        fail(`${student.alias} is ordinary/light-touch tier and should not carry more than 1 scaffold.`);
      }
    }
  }
}

function assertNoForbiddenLanguage() {
  const text = `${readFileSync(DEMO_FILE, "utf8")}\n${readFileSync(SEED_FILE, "utf8")}`;
  for (const pattern of FORBIDDEN_LANGUAGE) {
    const match = text.match(pattern);
    if (match) {
      fail(`Forbidden demo-data language found: "${match[0]}".`);
    }
  }
}

function countRows(db, table) {
  const row = db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE classroom_id = ?`).get(CLASSROOM);
  return Number(row?.count ?? 0);
}

function assertNoFutureRows(db) {
  const nowIso = new Date(Date.now() + 60_000).toISOString();
  const createdAtTables = [
    "interventions",
    "generated_plans",
    "pattern_reports",
    "family_messages",
    "sessions",
  ];

  for (const table of createdAtTables) {
    const row = db
      .prepare(`SELECT created_at FROM ${table} WHERE classroom_id = ? AND created_at > ? ORDER BY created_at DESC LIMIT 1`)
      .get(CLASSROOM, nowIso);
    if (row) {
      fail(`${table} contains a future created_at timestamp: ${row.created_at}.`);
    }
  }

  const futureSession = db
    .prepare(`
      SELECT id, started_at, ended_at
      FROM sessions
      WHERE classroom_id = ?
        AND (started_at > ? OR ended_at > ?)
      ORDER BY started_at DESC
      LIMIT 1
    `)
    .get(CLASSROOM, nowIso, nowIso);
  if (futureSession) {
    fail(`Session ${futureSession.id} is future-dated: ${futureSession.started_at} / ${futureSession.ended_at}.`);
  }
}

function assertNoStaleSeedRows(db) {
  const cutoffIso = new Date(Date.now() - MAX_DEMO_RECORD_AGE_DAYS * MS_PER_DAY).toISOString();
  const createdAtTables = [
    "interventions",
    "generated_plans",
    "pattern_reports",
    "family_messages",
    "sessions",
  ];

  for (const table of createdAtTables) {
    const row = db
      .prepare(`SELECT created_at FROM ${table} WHERE classroom_id = ? AND created_at < ? ORDER BY created_at ASC LIMIT 1`)
      .get(CLASSROOM, cutoffIso);
    if (row) {
      fail(`${table} contains stale demo timestamp older than ${MAX_DEMO_RECORD_AGE_DAYS} days: ${row.created_at}.`);
    }
  }

  const staleSession = db
    .prepare(`
      SELECT id, started_at, ended_at
      FROM sessions
      WHERE classroom_id = ?
        AND (started_at < ? OR ended_at < ?)
      ORDER BY started_at ASC
      LIMIT 1
    `)
    .get(CLASSROOM, cutoffIso, cutoffIso);
  if (staleSession) {
    fail(`Session ${staleSession.id} is stale-dated: ${staleSession.started_at} / ${staleSession.ended_at}.`);
  }
}

function assertCleanSeedCounts() {
  const tempDir = mkdtempSync(path.join(tmpdir(), "prairie-demo-fixture-"));
  try {
    const npx = process.platform === "win32" ? "npx.cmd" : "npx";
    const seed = spawnSync(npx, ["tsx", "data/demo/seed.ts"], {
      cwd: ROOT,
      env: { ...process.env, PRAIRIE_MEMORY_DIR: tempDir },
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 10,
    });

    if (seed.status !== 0) {
      fail(`Clean seed failed.\nSTDOUT:\n${seed.stdout}\nSTDERR:\n${seed.stderr}`);
    }

    const dbPath = path.join(tempDir, `${CLASSROOM}.sqlite`);
    const db = new Database(dbPath);
    try {
      for (const [table, expected] of Object.entries(EXPECTED_COUNTS)) {
        const actual = countRows(db, table);
        if (actual !== expected) {
          fail(`Expected ${table} count ${expected}, got ${actual}.`);
        }
      }

      const latestPlan = db
        .prepare(`
          SELECT plan_id, created_at
          FROM generated_plans
          WHERE classroom_id = ?
          ORDER BY created_at DESC
          LIMIT 1
        `)
        .get(CLASSROOM);
      if (latestPlan?.plan_id !== "plan-demo-003") {
        fail(`Latest generated plan must be plan-demo-003, got ${latestPlan?.plan_id ?? "none"}.`);
      }

      const distinctPlanTimestamps = db
        .prepare("SELECT COUNT(DISTINCT created_at) AS count FROM generated_plans WHERE classroom_id = ?")
        .get(CLASSROOM);
      if (Number(distinctPlanTimestamps?.count ?? 0) !== 3) {
        fail("Seeded generated plans must have 3 distinct created_at timestamps.");
      }

      const pattern = db
        .prepare("SELECT report_id, created_at FROM pattern_reports WHERE classroom_id = ? ORDER BY created_at DESC LIMIT 1")
        .get(CLASSROOM);
      if (pattern?.report_id !== "pat-demo-001") {
        fail(`Latest pattern report must be pat-demo-001, got ${pattern?.report_id ?? "none"}.`);
      }
      if (!(new Date(latestPlan.created_at).getTime() > new Date(pattern.created_at).getTime())) {
        fail("Latest generated plan should be timestamped after the pattern report it responds to.");
      }

      assertNoFutureRows(db);
      assertNoStaleSeedRows(db);

      const approvedMessages = db
        .prepare("SELECT COUNT(*) AS count FROM family_messages WHERE classroom_id = ? AND teacher_approved = 1")
        .get(CLASSROOM);
      if (Number(approvedMessages?.count ?? 0) !== 1) {
        fail("Clean seed must contain exactly 1 approved family message.");
      }
    } finally {
      db.close();
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function main() {
  const demo = readJson(DEMO_FILE);
  assertNoDuplicateAliases();
  assertDemoRosterContract(demo);
  assertNoForbiddenLanguage();
  assertCleanSeedCounts();

  console.log("Demo fixture validation passed.");
  console.log(`  Classroom: ${CLASSROOM}`);
  for (const [table, expected] of Object.entries(EXPECTED_COUNTS)) {
    console.log(`  ${table}: ${expected}`);
  }
}

main();
