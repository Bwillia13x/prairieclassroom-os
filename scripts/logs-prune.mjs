import path from "node:path";
import { fileURLToPath } from "node:url";
import { pruneRequestLogFiles } from "./lib/request-logs.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const LOG_DIR = path.join(ROOT, "output", "request-logs");

function parseDays(argv) {
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--days" && argv[index + 1]) {
      return Number(argv[index + 1]);
    }
    if (token.startsWith("--days=")) {
      return Number(token.slice("--days=".length));
    }
  }
  return 14;
}

async function main() {
  const days = parseDays(process.argv.slice(2));
  if (!Number.isFinite(days) || days < 0) {
    throw new Error(`Invalid --days value: ${days}`);
  }

  const removed = await pruneRequestLogFiles(LOG_DIR, { days });
  console.log(`Pruned ${removed.length} request log file(s) older than ${days} day(s).`);
  for (const file of removed) {
    console.log(`- ${file}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
