import path from "node:path";
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  backupClassroomMemory,
  exportClassroomMemory,
  pruneClassroomMemory,
  purgeClassroomMemory,
  resolveClassroomDbPath,
  restoreClassroomMemory,
  summarizeClassroomMemory,
  writeJsonArtifact,
} from "./lib/memory-admin.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUTPUT_ROOT = path.join(ROOT, "output", "memory-admin");

function usage() {
  return [
    "Usage:",
    "  node scripts/memory-admin.mjs summary --classroom <id> [--memory-dir <dir>]",
    "  node scripts/memory-admin.mjs export --classroom <id> [--out <file>] [--memory-dir <dir>]",
    "  node scripts/memory-admin.mjs anonymize --classroom <id> [--out <file>] [--memory-dir <dir>]",
    "  node scripts/memory-admin.mjs backup --classroom <id> [--out <file>] [--memory-dir <dir>]",
    "  node scripts/memory-admin.mjs prune --classroom <id> --confirm [--default-days <n>] [--profile <file>] [--memory-dir <dir>]",
    "  node scripts/memory-admin.mjs purge --classroom <id> --confirm [--memory-dir <dir>]",
    "  node scripts/memory-admin.mjs restore --classroom <id> --from <file> --confirm [--memory-dir <dir>]",
  ].join("\n");
}

// Classroom profiles live in data/synthetic_classrooms/ and are addressed
// by the `classroom_id` field inside the JSON, not by filename. Resolve the
// profile by scanning the directory and matching the id field.
async function resolveProfilePathForClassroom(classroomId) {
  const dir = path.join(ROOT, "data", "synthetic_classrooms");
  if (!existsSync(dir)) return null;
  const files = (await readdir(dir)).filter(
    (f) => f.startsWith("classroom_") && f.endsWith(".json"),
  );
  for (const file of files) {
    const full = path.join(dir, file);
    try {
      const raw = await readFile(full, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed?.classroom_id === classroomId) return full;
    } catch {
      // skip malformed profiles silently
    }
  }
  return null;
}

async function loadRetentionPolicyFromProfile(profilePath) {
  if (!profilePath || !existsSync(profilePath)) return null;
  const raw = await readFile(profilePath, "utf8");
  const parsed = JSON.parse(raw);
  return parsed?.retention_policy ?? null;
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const opts = { command, confirm: false };
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--confirm") {
      opts.confirm = true;
      continue;
    }
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }
    const key = arg.slice(2).replace(/-([a-z])/g, (_match, char) => char.toUpperCase());
    const value = rest[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${arg}`);
    }
    opts[key] = value;
    index += 1;
  }
  return opts;
}

function requireOption(opts, key) {
  const value = opts[key];
  if (!value) throw new Error(`Missing required --${key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}`);
  return value;
}

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function defaultOutPath(command, classroomId, extension) {
  return path.join(OUTPUT_ROOT, `${timestampSlug()}-${classroomId}-${command}.${extension}`);
}

function resolveDb(opts) {
  const classroomId = requireOption(opts, "classroom");
  return {
    classroomId,
    dbPath: resolveClassroomDbPath({
      rootDir: ROOT,
      classroomId,
      memoryDir: opts.memoryDir,
    }),
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.command || opts.command === "help" || opts.command === "--help") {
    console.log(usage());
    return;
  }

  const { classroomId, dbPath } = resolveDb(opts);

  if (opts.command === "summary") {
    console.log(JSON.stringify(summarizeClassroomMemory(dbPath), null, 2));
    return;
  }

  if (opts.command === "export" || opts.command === "anonymize") {
    const anonymize = opts.command === "anonymize";
    const outPath = path.resolve(opts.out ?? defaultOutPath(opts.command, classroomId, "json"));
    const payload = exportClassroomMemory({ dbPath, classroomId, anonymize });
    await writeJsonArtifact(outPath, payload);
    console.log(`Wrote ${path.relative(ROOT, outPath)}`);
    if (anonymize) {
      console.log("Free-text review is still required before external sharing.");
    }
    return;
  }

  if (opts.command === "backup") {
    const outPath = path.resolve(opts.out ?? defaultOutPath("backup", classroomId, "sqlite"));
    await backupClassroomMemory({ dbPath, outPath });
    console.log(`Backed up ${classroomId} to ${path.relative(ROOT, outPath)}`);
    return;
  }

  if (opts.command === "prune") {
    const cliOverride =
      opts.defaultDays !== undefined ? Number(opts.defaultDays) : undefined;
    if (cliOverride !== undefined && (!Number.isFinite(cliOverride) || cliOverride <= 0)) {
      throw new Error("--default-days must be a positive integer.");
    }

    let policy;
    let policySource;
    if (cliOverride !== undefined) {
      policy = { default_days: cliOverride };
      policySource = "--default-days flag";
    } else {
      const profilePath = opts.profile
        ? path.resolve(opts.profile)
        : await resolveProfilePathForClassroom(classroomId);
      policy = await loadRetentionPolicyFromProfile(profilePath);
      policySource = policy && profilePath ? path.relative(ROOT, profilePath) : null;
    }

    if (!policy) {
      throw new Error(
        "No retention policy found. Provide --default-days <n> or add `retention_policy` to the classroom profile JSON.",
      );
    }

    const result = await pruneClassroomMemory({
      dbPath,
      policy,
      confirm: opts.confirm,
    });

    const tombstonePath = defaultOutPath("prune-tombstone", classroomId, "json");
    await writeJsonArtifact(tombstonePath, {
      generated_at: new Date().toISOString(),
      command: "prune",
      classroom_id: classroomId,
      policy,
      policy_source: policySource,
      result,
    });
    console.log(
      `Pruned ${result.total_pruned} row(s) across ${Object.keys(result.by_table).length} tables for ${classroomId}.`,
    );
    console.log(`Wrote ${path.relative(ROOT, tombstonePath)}`);
    return;
  }

  if (opts.command === "purge") {
    const removed = await purgeClassroomMemory({ dbPath, confirm: opts.confirm });
    const tombstonePath = defaultOutPath("purge-tombstone", classroomId, "json");
    await writeJsonArtifact(tombstonePath, {
      generated_at: new Date().toISOString(),
      command: "purge",
      classroom_id: classroomId,
      removed,
    });
    console.log(`Purged ${removed.length} file(s) for ${classroomId}.`);
    console.log(`Wrote ${path.relative(ROOT, tombstonePath)}`);
    return;
  }

  if (opts.command === "restore") {
    const fromPath = path.resolve(requireOption(opts, "from"));
    const backupPath = defaultOutPath("pre-restore-backup", classroomId, "sqlite");
    const result = await restoreClassroomMemory({
      dbPath,
      fromPath,
      confirm: opts.confirm,
      backupPath,
    });
    console.log(`Restored ${classroomId} from ${path.relative(ROOT, fromPath)}`);
    if (result.replaced_backup) {
      console.log(`Previous database backed up to ${path.relative(ROOT, result.replaced_backup)}`);
    }
    return;
  }

  throw new Error(`Unknown memory-admin command: ${opts.command}\n\n${usage()}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
