import path from "node:path";
import { fileURLToPath } from "node:url";
import { findLatestRequestLogFile, readRequestLogRecords, summarizeRequestLogs } from "./lib/request-logs.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const LOG_DIR = path.join(ROOT, "output", "request-logs");

function printCounts(label, counts) {
  console.log(label);
  const entries = Object.entries(counts).sort((left, right) => right[1] - left[1]);
  if (entries.length === 0) {
    console.log("- none");
    return;
  }
  for (const [key, value] of entries) {
    console.log(`- ${key}: ${value}`);
  }
}

async function main() {
  const file = await findLatestRequestLogFile(LOG_DIR);
  if (!file) {
    throw new Error(`No request log files found in ${LOG_DIR}`);
  }

  const records = await readRequestLogRecords(file);
  const summary = summarizeRequestLogs(records);

  console.log(`Latest log file: ${file}`);
  console.log(`Total records: ${summary.total_records}`);
  console.log("");
  printCounts("Counts by route", summary.counts_by_route);
  console.log("");
  printCounts("Counts by category", summary.counts_by_category);
  console.log("");
  console.log(`Retryable responses: ${summary.retryable}`);
  console.log(`Non-retryable responses: ${summary.non_retryable}`);
  console.log(`Injection-suspected responses: ${summary.injection_suspected}`);
  console.log("");
  console.log("Last 10 non-200 responses");
  if (summary.recent_non_200.length === 0) {
    console.log("- none");
    return;
  }
  for (const entry of summary.recent_non_200) {
    console.log(`- ${entry.timestamp} ${entry.status_code} ${entry.route} request_id=${entry.request_id} category=${entry.category ?? "none"} detail_code=${entry.detail_code ?? "none"} retryable=${entry.retryable}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
