import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "output");

const TARGETS = {
  "release-gate": { relativeDir: path.join("release-gate"), keep: 3, entryType: "directory" },
  evals: { relativeDir: path.join("evals"), keep: 3, entryType: "directory" },
  "request-logs": { relativeDir: path.join("request-logs"), keep: 10, entryType: "file" },
  "host-preflight": { relativeDir: path.join("host-preflight"), keep: 5, entryType: "file" },
  "visual-smoke": { relativeDir: path.join("visual-smoke"), keep: 3, entryType: "directory" },
};

function printHelp() {
  console.log("Usage: node scripts/artifacts-prune.mjs [--apply] [--targets=a,b] [--keep=n]");
  console.log("");
  console.log("Dry-run is the default. Use --apply to actually remove candidates.");
  console.log(`Available targets: ${Object.keys(TARGETS).join(", ")}`);
}

function parseArgs(argv) {
  let apply = false;
  let keepOverride = null;
  let targetNames = Object.keys(TARGETS);

  for (const token of argv) {
    if (token === "--apply") {
      apply = true;
      continue;
    }
    if (token === "--help" || token === "-h") {
      printHelp();
      process.exit(0);
    }
    if (token.startsWith("--targets=")) {
      targetNames = token
        .slice("--targets=".length)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      continue;
    }
    if (token.startsWith("--keep=")) {
      keepOverride = Number(token.slice("--keep=".length));
      continue;
    }
  }

  if (targetNames.length === 0) {
    throw new Error("No targets selected. Use --targets=<name1,name2>.");
  }

  for (const targetName of targetNames) {
    if (!(targetName in TARGETS)) {
      throw new Error(`Unknown target: ${targetName}`);
    }
  }

  if (keepOverride !== null && (!Number.isFinite(keepOverride) || keepOverride < 0)) {
    throw new Error(`Invalid --keep value: ${keepOverride}`);
  }

  return { apply, keepOverride, targetNames };
}

async function entryExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function collectCandidates(targetName, config, keepCount) {
  const targetPath = path.join(OUTPUT_DIR, config.relativeDir);
  if (!(await entryExists(targetPath))) {
    return { targetPath, keepCount, retained: [], candidates: [] };
  }

  const dirents = await fs.readdir(targetPath, { withFileTypes: true });
  const entries = [];

  for (const dirent of dirents) {
    const matchesType = config.entryType === "directory" ? dirent.isDirectory() : dirent.isFile();
    if (!matchesType) continue;

    const absolutePath = path.join(targetPath, dirent.name);
    const stats = await fs.stat(absolutePath);
    entries.push({
      name: dirent.name,
      absolutePath,
      mtimeMs: stats.mtimeMs,
    });
  }

  entries.sort((left, right) => right.mtimeMs - left.mtimeMs || left.name.localeCompare(right.name));
  return {
    targetPath,
    keepCount,
    retained: entries.slice(0, keepCount),
    candidates: entries.slice(keepCount),
  };
}

async function removeCandidates(candidates) {
  for (const candidate of candidates) {
    await fs.rm(candidate.absolutePath, { recursive: true, force: true });
  }
}

async function main() {
  const { apply, keepOverride, targetNames } = parseArgs(process.argv.slice(2));
  const modeLabel = apply ? "apply" : "dry-run";
  console.log(`Artifacts prune mode: ${modeLabel}`);

  let totalCandidates = 0;

  for (const targetName of targetNames) {
    const config = TARGETS[targetName];
    const keepCount = keepOverride ?? config.keep;
    const { targetPath, retained, candidates } = await collectCandidates(targetName, config, keepCount);
    totalCandidates += candidates.length;

    console.log("");
    console.log(`${targetName}: keep ${keepCount}`);
    console.log(`- path: ${targetPath}`);
    console.log(`- retained: ${retained.length}`);
    console.log(`- prune candidates: ${candidates.length}`);

    for (const candidate of candidates) {
      console.log(`  - ${path.relative(ROOT, candidate.absolutePath)}`);
    }

    if (apply && candidates.length > 0) {
      await removeCandidates(candidates);
    }
  }

  console.log("");
  console.log(`Total prune candidates: ${totalCandidates}`);
  if (!apply) {
    console.log("Re-run with --apply to remove the listed candidates.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});