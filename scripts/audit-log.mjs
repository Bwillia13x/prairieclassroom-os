#!/usr/bin/env node
// scripts/audit-log.mjs
//
// Query the orchestrator request-log JSONL files as an access audit log.
// Answers the pilot-governance question: "Who accessed which classroom
// records, when, under what role, and was it allowed?"
//
// This CLI is deliberately read-only. It does not modify logs. It can emit
// a point-in-time audit artifact to output/access-audit/ when asked via
// --out or --artifact.
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  filterAccessAuditRecords,
  listRequestLogFiles,
  summarizeAccessAudit,
} from "./lib/request-logs.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const LOG_DIR = path.join(ROOT, "output", "request-logs");
const ARTIFACT_DIR = path.join(ROOT, "output", "access-audit");

function usage() {
  return [
    "Usage:",
    "  node scripts/audit-log.mjs [options]",
    "",
    "Options:",
    "  --classroom <id>        Restrict to one classroom id",
    "  --role <role>           Restrict to one classroom role (teacher|ea|substitute|reviewer)",
    "  --outcome <code>        Restrict to allowed | denied | demo_bypass | all | <explicit detail code>",
    "  --from <YYYY-MM-DD>     Earliest log date to include (inclusive)",
    "  --to <YYYY-MM-DD>       Latest log date to include (inclusive)",
    "  --only-classroom        Drop non-classroom routes (health, classrooms list)",
    "  --artifact              Write a tombstone audit artifact to output/access-audit/",
    "  --out <file>            Custom artifact output path (implies --artifact)",
    "  --limit <n>             Cap the records section of the artifact (default 200)",
    "  --help                  Print this message",
  ].join("\n");
}

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      opts.help = true;
      continue;
    }
    if (arg === "--artifact") {
      opts.artifact = true;
      continue;
    }
    if (arg === "--only-classroom") {
      opts.onlyClassroomContext = true;
      continue;
    }
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected positional argument: ${arg}`);
    }
    const key = arg.slice(2).replace(/-([a-z])/g, (_m, c) => c.toUpperCase());
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for ${arg}`);
    }
    opts[key] = value;
    i += 1;
  }
  return opts;
}

async function readAllRecords(logDir, { from, to }) {
  const files = await listRequestLogFiles(logDir);
  const inRange = files.filter((file) => {
    const basename = path.basename(file, ".jsonl");
    if (from && basename < from) return false;
    if (to && basename > to) return false;
    return true;
  });

  const all = [];
  for (const file of inRange) {
    const raw = await readFile(file, "utf8");
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      try {
        all.push(JSON.parse(line));
      } catch {
        // skip malformed lines
      }
    }
  }
  return all;
}

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function printTopCounts(label, counts, take = 10) {
  console.log(label);
  const entries = Object.entries(counts).sort((l, r) => r[1] - l[1]).slice(0, take);
  if (entries.length === 0) {
    console.log("  (none)");
    return;
  }
  for (const [key, value] of entries) {
    console.log(`  ${key}: ${value}`);
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(usage());
    return;
  }

  const filters = {
    classroomId: opts.classroom,
    role: opts.role,
    outcome: opts.outcome,
    from: opts.from,
    to: opts.to,
    onlyClassroomContext: opts.onlyClassroomContext === true,
  };

  const all = await readAllRecords(LOG_DIR, { from: opts.from, to: opts.to });
  const filtered = filterAccessAuditRecords(all, filters);
  const summary = summarizeAccessAudit(filtered);

  console.log(`Access audit — ${filtered.length} / ${all.length} records match`);
  console.log(`  Denials: ${summary.denial_count}`);
  console.log(`  Demo bypasses: ${summary.demo_bypass_count}`);
  console.log("");
  printTopCounts("Top classrooms", Object.fromEntries(
    Object.entries(summary.by_classroom).map(([k, v]) => [k, v.total]),
  ));
  console.log("");
  printTopCounts("By role", summary.by_role);
  console.log("");
  printTopCounts("By outcome", summary.by_outcome);

  const wantsArtifact = opts.artifact === true || opts.out !== undefined;
  if (wantsArtifact) {
    const limit = Number.parseInt(opts.limit ?? "200", 10);
    const artifactPath = opts.out
      ? path.resolve(opts.out)
      : path.join(ARTIFACT_DIR, `${timestampSlug()}-access-audit.json`);
    await mkdir(path.dirname(artifactPath), { recursive: true });
    const payload = {
      generated_at: new Date().toISOString(),
      log_dir: path.relative(ROOT, LOG_DIR),
      filters,
      summary,
      record_limit: limit,
      records: filtered.slice(-limit),
    };
    await writeFile(artifactPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.log("");
    console.log(`Wrote ${path.relative(ROOT, artifactPath)}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
