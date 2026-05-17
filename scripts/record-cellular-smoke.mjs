import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyCellularSmokeEvidence } from "./lib/submission-cellular-smoke.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const USAGE = [
  "Usage:",
  "  npm run submission:record-cellular-smoke -- --result pass --checked-at '<date/time>' --device '<phone>' --browser '<browser>' --carrier '<carrier/network>'",
  "  npm run submission:record-cellular-smoke -- --dry-run --result pass --checked-at '<date/time>' --device '<phone>' --browser '<browser>' --carrier '<carrier/network>'",
  "",
  "Optional:",
  "  --screenshots '<paths or note>'",
  "  --notes '<brief observation>'",
  "",
  "Use this only after a real phone-on-cellular smoke pass. Desktop HTTP checks, Lighthouse mobile emulation, and Playwright mobile emulation do not close this blocker.",
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

  const result = await applyCellularSmokeEvidence({
    rootDir: ROOT,
    checkedAt: readFlag(args, "--checked-at"),
    device: readFlag(args, "--device"),
    browser: readFlag(args, "--browser"),
    carrier: readFlag(args, "--carrier"),
    screenshots: readFlag(args, "--screenshots"),
    notes: readFlag(args, "--notes"),
    result: readFlag(args, "--result"),
    dryRun: args.includes("--dry-run"),
  });

  if (result.changes.length === 0) {
    console.log("Cellular smoke evidence already matches the provided details.");
    return;
  }

  console.log(result.dryRun ? "Cellular smoke updates to apply:" : "Cellular smoke evidence recorded:");
  for (const change of result.changes) {
    console.log(`- ${change.relPath}`);
    console.log(`  - ${change.previousLine}`);
    console.log(`  + ${change.nextLine}`);
  }
  if (!result.dryRun) {
    console.log("\nNext: run `PRAIRIE_PUBLIC_DEMO_URL=https://prairieclassroom-os.vercel.app npm run smoke:public-demo`, then `npm run submission:final-check` after public links are real.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
