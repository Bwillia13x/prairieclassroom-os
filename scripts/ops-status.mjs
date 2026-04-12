import { existsSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSystemInventory, validateCanonicalInventoryClaims } from "./lib/system-inventory.mjs";
import { listHostPreflightArtifacts, listReleaseGateRunSummaries } from "./lib/proof-status.mjs";
import { findLatestRequestLogFile, readRequestLogRecords, summarizeRequestLogs } from "./lib/request-logs.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function statusLabel(ok) {
  return ok ? "ok" : "attention";
}

function relative(targetPath) {
  return targetPath ? path.relative(ROOT, targetPath) : "none";
}

function newestBy(items, pickDate) {
  return [...items].sort((left, right) => {
    const leftDate = pickDate(left) ?? "";
    const rightDate = pickDate(right) ?? "";
    return String(rightDate).localeCompare(String(leftDate));
  })[0] ?? null;
}

async function latestEvidenceDoc() {
  const dir = path.join(ROOT, "docs", "evidence");
  if (!existsSync(dir)) return null;
  const entries = await readdir(dir, { withFileTypes: true });
  const docs = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map(async (entry) => {
        const filePath = path.join(dir, entry.name);
        const details = await stat(filePath);
        return { filePath, mtime: details.mtime.toISOString() };
      }),
  );
  return newestBy(docs, (doc) => doc.mtime);
}

function printRunLine(label, run) {
  if (!run) {
    console.log(`- ${label}: none recorded`);
    return;
  }
  const timestamp = run.completed_at ?? run.failed_at ?? run.generated_at ?? "unknown";
  console.log(`- ${label}: ${run.status ?? "unknown"} at ${timestamp} (${run.run_dir ?? relative(run.summary_path)})`);
}

async function summarizeLogs() {
  const logDir = path.join(ROOT, "output", "request-logs");
  try {
    const latestLog = await findLatestRequestLogFile(logDir);
    if (!latestLog) return "none recorded";
    const records = await readRequestLogRecords(latestLog);
    const summary = summarizeRequestLogs(records);
    return `${summary.total_records} records in ${relative(latestLog)}, non-200=${summary.recent_non_200.length}, injection-suspected=${summary.injection_suspected}`;
  } catch {
    return "none recorded";
  }
}

async function main() {
  const [inventory, runSummaries, preflights, evidenceDoc, logSummary] = await Promise.all([
    buildSystemInventory(ROOT),
    listReleaseGateRunSummaries(path.join(ROOT, "output", "release-gate")),
    listHostPreflightArtifacts(path.join(ROOT, "output", "host-preflight")),
    latestEvidenceDoc(),
    summarizeLogs(),
  ]);
  const claimValidation = await validateCanonicalInventoryClaims(ROOT, inventory);

  console.log("PrairieClassroom OS Status");
  console.log("");
  console.log(`Inventory claims: ${statusLabel(claimValidation.ok)}`);
  console.log(`- panels=${inventory.ui.panel_count}, prompt_classes=${inventory.prompts.prompt_class_count}, api_endpoints=${inventory.api.endpoint_count}, eval_cases=${inventory.evals.case_count}`);
  for (const issue of claimValidation.issues) {
    console.log(`- drift: ${issue}`);
  }

  console.log("");
  console.log("Release gates");
  printRunLine("mock", newestBy(runSummaries.filter((run) => run.inference_mode === "mock"), (run) => run.completed_at ?? run.failed_at ?? run.generated_at));
  printRunLine("ollama", newestBy(runSummaries.filter((run) => run.inference_mode === "ollama"), (run) => run.completed_at ?? run.failed_at ?? run.generated_at));
  printRunLine("gemini", newestBy(runSummaries.filter((run) => run.inference_mode === "gemini"), (run) => run.completed_at ?? run.failed_at ?? run.generated_at));
  printRunLine("api", newestBy(runSummaries.filter((run) => run.inference_mode === "api"), (run) => run.completed_at ?? run.failed_at ?? run.generated_at));

  console.log("");
  console.log("Host preflight");
  const latestPreflight = preflights[0] ?? null;
  if (latestPreflight) {
    console.log(`- latest: ${latestPreflight.status} at ${latestPreflight.generated_at ?? "unknown"} (${relative(latestPreflight.artifact_path)})`);
    console.log(`- summary: ${latestPreflight.summary ?? "none"}`);
  } else {
    console.log("- latest: none recorded");
  }

  console.log("");
  console.log("Request logs");
  console.log(`- ${logSummary}`);

  console.log("");
  console.log("Evidence docs");
  if (evidenceDoc) {
    console.log(`- latest touched: ${relative(evidenceDoc.filePath)} at ${evidenceDoc.mtime}`);
  } else {
    console.log("- latest touched: none recorded");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
