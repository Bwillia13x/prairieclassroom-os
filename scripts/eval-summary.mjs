import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildEvalFailureSummary } from "./lib/eval-summary.mjs";
import { readLatestHostPreflight } from "./lib/ollama-host-preflight.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EVAL_ROOT = path.join(ROOT, "output", "evals");
const HOST_PREFLIGHT_DIR = path.join(ROOT, "output", "host-preflight");

async function findLatestResultsFile() {
  if (!existsSync(EVAL_ROOT)) {
    return null;
  }

  const datedDirs = (await readdir(EVAL_ROOT, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse();

  for (const dir of datedDirs) {
    const dirPath = path.join(EVAL_ROOT, dir);
    const files = (await readdir(dirPath, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith("-results.json"))
      .map((entry) => entry.name)
      .sort()
      .reverse();
    if (files.length > 0) {
      return path.join(dirPath, files[0]);
    }
  }

  return null;
}

function parseArgs(argv) {
  const args = { results: null, hostPreflight: null };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--results" && argv[index + 1]) {
      args.results = argv[index + 1];
      index += 1;
      continue;
    }
    if (token.startsWith("--results=")) {
      args.results = token.slice("--results=".length);
      continue;
    }
    if (token === "--host-preflight" && argv[index + 1]) {
      args.hostPreflight = argv[index + 1];
      index += 1;
      continue;
    }
    if (token.startsWith("--host-preflight=")) {
      args.hostPreflight = token.slice("--host-preflight=".length);
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const explicitResultsFile = args.results ? path.resolve(ROOT, args.results) : null;
  const explicitHostPreflight = args.hostPreflight
    ? JSON.parse(await readFile(path.resolve(ROOT, args.hostPreflight), "utf8"))
    : null;
  const latestResultsFile = explicitResultsFile ?? await findLatestResultsFile();
  const latestHostPreflight = explicitHostPreflight ?? await readLatestHostPreflight(HOST_PREFLIGHT_DIR);

  let resultsFile = explicitResultsFile;
  let hostPreflight = explicitHostPreflight ?? latestHostPreflight;
  let preferHostPreflightOnly = false;

  if (!explicitResultsFile && explicitHostPreflight) {
    preferHostPreflightOnly = true;
  } else if (!explicitResultsFile && !explicitHostPreflight && latestResultsFile && latestHostPreflight) {
    const [resultsStat, hostStat] = await Promise.all([
      stat(latestResultsFile),
      stat(latestHostPreflight.artifact_path),
    ]);
    if (hostStat.mtimeMs > resultsStat.mtimeMs) {
      preferHostPreflightOnly = true;
    } else {
      resultsFile = latestResultsFile;
    }
  } else if (!explicitResultsFile && latestResultsFile) {
    resultsFile = latestResultsFile;
  }

  if (preferHostPreflightOnly) {
    resultsFile = null;
    hostPreflight = explicitHostPreflight ?? latestHostPreflight;
  }

  let results = [];
  let outputFile;

  if (resultsFile) {
    const payload = JSON.parse(await readFile(resultsFile, "utf8"));
    results = payload.results ?? [];
    outputFile = resultsFile.replace(/-results\.json$/, "-failure-summary.json");
  } else if (hostPreflight) {
    await mkdir(HOST_PREFLIGHT_DIR, { recursive: true });
    const stem = path.basename(hostPreflight.artifact_path ?? `host-preflight-${Date.now()}.json`, ".json");
    outputFile = path.join(HOST_PREFLIGHT_DIR, `${stem}-failure-summary.json`);
  } else {
    throw new Error("No eval results or host preflight artifacts were found.");
  }

  const summary = buildEvalFailureSummary(results, hostPreflight);
  await writeFile(outputFile, JSON.stringify(summary, null, 2), "utf8");
  console.log(outputFile);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
