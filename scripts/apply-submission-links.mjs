import path from "node:path";
import { fileURLToPath } from "node:url";
import { applySubmissionLinks } from "./lib/submission-links.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const USAGE = [
  "Usage:",
  "  npm run submission:apply-links -- --video-url <youtube-url> --kaggle-url <kaggle-url>",
  "  npm run submission:apply-links -- --dry-run --video-url <youtube-url> --kaggle-url <kaggle-url>",
  "",
  "Updates the submission-facing docs that gate final publication readiness.",
  "The video URL must be YouTube/youtu.be and the writeup URL must be kaggle.com.",
].join("\n");

function readFlag(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return "";
  return args[index + 1] ?? "";
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.length === 0) {
    console.log(USAGE);
    return;
  }

  const result = await applySubmissionLinks({
    rootDir: ROOT,
    videoUrl: readFlag(args, "--video-url"),
    kaggleUrl: readFlag(args, "--kaggle-url"),
    dryRun: args.includes("--dry-run"),
  });

  if (result.changes.length === 0) {
    console.log("Submission links already match the provided URLs.");
    return;
  }

  console.log(result.dryRun ? "Submission link updates to apply:" : "Submission links updated:");
  for (const change of result.changes) {
    console.log(`- ${change.relPath}`);
    console.log(`  - ${change.previousLine}`);
    console.log(`  + ${change.nextLine}`);
  }
  if (!result.dryRun) {
    console.log("\nNext: run `npm run submission:final-check` without skips.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
