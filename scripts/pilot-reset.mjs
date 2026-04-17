#!/usr/bin/env node
/**
 * scripts/pilot-reset.mjs — One-command demo classroom reset for a pilot session.
 *
 * Purges any existing demo classroom memory and re-seeds from the canonical
 * demo seed script so a teacher walks into a known clean state every time.
 *
 * Usage:
 *   npm run pilot:reset
 *   npm run pilot:reset -- --classroom <id>      (default: demo-okafor-grade34)
 *   npm run pilot:reset -- --memory-dir <path>   (default: data/memory)
 *
 * Safety:
 *   - Only resets DEMO classrooms by default (the classroom id must start with "demo-").
 *     Pass --allow-non-demo to override; the script will prompt for confirmation
 *     by requiring an extra --i-mean-it flag in that case.
 *   - Writes a pilot-reset tombstone artifact under output/pilot/ so every reset
 *     leaves an audit trail.
 *
 * What this script DOES NOT do:
 *   - It does not start the inference, orchestrator, or web servers — use
 *     `npm run pilot:start` for that.
 *   - It does not modify request logs, evidence snapshots, or eval artifacts.
 *   - It does not delete the demo classroom JSON profile under
 *     data/synthetic_classrooms/.
 */

import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { purgeClassroomMemory } from "./lib/memory-admin.mjs";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const DEFAULT_CLASSROOM = "demo-okafor-grade34";
const DEFAULT_MEMORY_DIR = path.join(ROOT, "data", "memory");
const DEMO_SEED_SCRIPT = path.join(ROOT, "data", "demo", "seed.ts");

function parseArgs(argv) {
  const opts = {
    classroom: DEFAULT_CLASSROOM,
    memoryDir: DEFAULT_MEMORY_DIR,
    allowNonDemo: false,
    iMeanIt: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--classroom":
        opts.classroom = argv[++i];
        break;
      case "--memory-dir":
        opts.memoryDir = path.resolve(argv[++i]);
        break;
      case "--allow-non-demo":
        opts.allowNonDemo = true;
        break;
      case "--i-mean-it":
        opts.iMeanIt = true;
        break;
      case "--help":
      case "-h":
        printUsage();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return opts;
}

function printUsage() {
  console.log(`
Usage: npm run pilot:reset [-- --classroom <id>] [--memory-dir <path>]

Resets a demo classroom to the canonical seed state in one command. Designed
for the start of a pilot session so the teacher walks into known data.

Options:
  --classroom <id>      Classroom to reset (default: ${DEFAULT_CLASSROOM})
  --memory-dir <path>   Memory directory (default: data/memory)
  --allow-non-demo      Permit reset of a non-demo classroom (requires --i-mean-it)
  --i-mean-it           Required confirmation when --allow-non-demo is used
  --help                Show this message
`.trim());
}

function spawnDemoSeed() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      ["tsx", DEMO_SEED_SCRIPT],
      { cwd: ROOT, stdio: "inherit" },
    );
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`demo seed exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

async function writeTombstone({ classroomId, removedFiles, reSeeded }) {
  const outDir = path.join(ROOT, "output", "pilot");
  await mkdir(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = path.join(outDir, `${stamp}-pilot-reset-${classroomId}.json`);
  const body = {
    generated_at: new Date().toISOString(),
    command: "pilot:reset",
    classroom_id: classroomId,
    removed_files: removedFiles,
    reseeded: reSeeded,
    notes:
      "Demo classroom memory was purged and re-seeded from data/demo/seed.ts so a pilot session starts from known state.",
  };
  await writeFile(outPath, JSON.stringify(body, null, 2) + "\n", "utf8");
  return outPath;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  const isDemoClassroom = opts.classroom.startsWith("demo-");
  if (!isDemoClassroom && !opts.allowNonDemo) {
    throw new Error(
      `Refusing to reset non-demo classroom "${opts.classroom}".\n` +
      `Pass --allow-non-demo --i-mean-it to override.`,
    );
  }
  if (!isDemoClassroom && opts.allowNonDemo && !opts.iMeanIt) {
    throw new Error(
      `--allow-non-demo requires --i-mean-it to confirm. Refusing to reset "${opts.classroom}".`,
    );
  }

  if (!opts.classroom || !opts.classroom.match(/^[a-zA-Z0-9_-]+$/)) {
    throw new Error(`Invalid classroom id: "${opts.classroom}"`);
  }

  if (!existsSync(DEMO_SEED_SCRIPT)) {
    throw new Error(
      `Demo seed script not found at ${path.relative(ROOT, DEMO_SEED_SCRIPT)}.\n` +
      `pilot:reset requires the canonical seed at data/demo/seed.ts.`,
    );
  }

  const dbPath = path.join(opts.memoryDir, `${opts.classroom}.sqlite`);
  console.log(`Pilot reset starting for ${opts.classroom}.`);
  console.log(`  memory:  ${path.relative(ROOT, dbPath)}`);

  let removed = [];
  if (existsSync(dbPath) || existsSync(`${dbPath}-wal`) || existsSync(`${dbPath}-shm`)) {
    console.log("\nPurging existing memory...");
    removed = await purgeClassroomMemory({ dbPath, confirm: true });
    for (const filePath of removed) {
      console.log(`  ✓ removed ${path.relative(ROOT, filePath)}`);
    }
  } else {
    console.log("\nNo existing memory to purge — starting from blank slate.");
  }

  console.log("\nRe-seeding from data/demo/seed.ts...");
  await spawnDemoSeed();

  const tombstonePath = await writeTombstone({
    classroomId: opts.classroom,
    removedFiles: removed,
    reSeeded: true,
  });

  console.log(`\nPilot reset complete.`);
  console.log(`  audit:   ${path.relative(ROOT, tombstonePath)}`);
  console.log(`\nNext: npm run pilot:start`);
}

main().catch((error) => {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
