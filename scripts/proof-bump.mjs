import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FAN_OUT_FILES,
  bumpCanonicalArtifact,
  findLatestPassedHostedRunDir,
  isValidArtifactId,
  readCurrentCanonicalArtifactId,
} from "./lib/proof-bump.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const USAGE = [
  "Usage:",
  "  npm run proof:bump -- <new-artifact-id>     Bump to the given run id",
  "  npm run proof:bump -- --auto                Use latest passing gemini gate",
  "  npm run proof:bump -- --dry-run --auto      Show what would change",
  "",
  "Fans out the canonical hosted Gemini gate reference across editorial",
  `surfaces (${FAN_OUT_FILES.length} files). Run after a successful hosted gate`,
  "and before `npm run proof:check`.",
].join("\n");

async function resolveNewArtifactId(args) {
  if (args.includes("--auto")) {
    const detected = await findLatestPassedHostedRunDir(ROOT);
    if (!detected) {
      throw new Error(
        "Could not auto-detect a passing hosted gate in output/release-gate/. " +
          "Pass an explicit artifact id instead.",
      );
    }
    return detected;
  }
  const positional = args.find((arg) => !arg.startsWith("--"));
  if (!positional) {
    throw new Error("Missing new artifact id. See --help.");
  }
  return positional;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.length === 0) {
    console.log(USAGE);
    return;
  }

  const dryRun = args.includes("--dry-run");
  const newArtifactId = await resolveNewArtifactId(args);

  if (!isValidArtifactId(newArtifactId)) {
    throw new Error(
      `Invalid artifact id: '${newArtifactId}'. ` +
        "Expected format: 'YYYY-MM-DDTHH-MM-SS-mmmZ-NNNNN'.",
    );
  }

  const oldArtifactId = await readCurrentCanonicalArtifactId(ROOT);
  if (!oldArtifactId) {
    throw new Error(
      "Could not read current canonical from docs/hackathon-proof-brief.md. " +
        "Verify the file has a `Latest passing hosted gate: \\`output/release-gate/...\\`` line.",
    );
  }

  if (oldArtifactId === newArtifactId) {
    console.log(`No-op: canonical is already ${newArtifactId}`);
    return;
  }

  console.log(`Canonical bump: ${oldArtifactId} → ${newArtifactId}`);

  if (dryRun) {
    console.log(`[dry-run] Would scan ${FAN_OUT_FILES.length} editorial surfaces.`);
    return;
  }

  const { touched, skipped } = await bumpCanonicalArtifact({
    rootDir: ROOT,
    oldArtifactId,
    newArtifactId,
  });

  for (const relPath of touched) {
    console.log(`  updated  ${relPath}`);
  }
  for (const relPath of skipped) {
    console.log(`  skipped  ${relPath} (no change or missing)`);
  }
  console.log(`\n${touched.length} of ${FAN_OUT_FILES.length} surfaces updated.`);
  console.log("Next: run `npm run proof:check` to verify consistency.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
