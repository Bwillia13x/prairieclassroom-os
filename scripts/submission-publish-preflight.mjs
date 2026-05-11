import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectSubmissionPublishPreflight,
  formatSubmissionPublishPreflight,
} from "./lib/submission-publish-preflight.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function main() {
  const results = collectSubmissionPublishPreflight({ rootDir: ROOT });
  console.log(formatSubmissionPublishPreflight(results));
  if (results.some((item) => !item.ok)) {
    process.exitCode = 1;
  }
}

main();
