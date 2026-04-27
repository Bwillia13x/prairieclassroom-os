/**
 * Submission final check
 *
 * Chains the pre-submit gates listed in docs/hackathon-submission-checklist.md
 * "Final pre-submit checks" into a single sequenced run. Each step runs to
 * completion (success or failure) and the summary at the end shows which
 * gates passed and which need attention before publishing the Kaggle entry.
 *
 * Excludes any paid path (release:gate:gemini, release:gate:real). Run those
 * separately when you have explicitly opted into hosted spend.
 *
 * Usage:
 *   npm run submission:final-check
 *
 * Optional flags:
 *   --skip-release-gate   Skip the long mock release-gate step (faster, but
 *                         loses the structural-integrity signal).
 *   --include-ollama      Also run release:gate:ollama (only meaningful on a
 *                         viable host with gemma4:4b + gemma4:27b pulled).
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const args = new Set(process.argv.slice(2));
const SKIP_RELEASE_GATE = args.has("--skip-release-gate");
const INCLUDE_OLLAMA = args.has("--include-ollama");

const STEPS = [
  { id: "claims", name: "claims:check", command: "npm", args: ["run", "claims:check"] },
  { id: "proof", name: "proof:check", command: "npm", args: ["run", "proof:check"] },
  { id: "inventory", name: "system:inventory:check", command: "npm", args: ["run", "system:inventory:check"] },
  { id: "demo-fixture", name: "demo:fixture:check", command: "npm", args: ["run", "demo:fixture:check"] },
  { id: "contrast", name: "check:contrast", command: "npm", args: ["run", "check:contrast"] },
];

if (!SKIP_RELEASE_GATE) {
  STEPS.push({
    id: "release-gate",
    name: "release:gate (mock)",
    command: "npm",
    args: ["run", "release:gate"],
  });
}

if (INCLUDE_OLLAMA) {
  STEPS.push({
    id: "release-gate-ollama",
    name: "release:gate:ollama",
    command: "npm",
    args: ["run", "release:gate:ollama"],
  });
}

function runStep(step) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    process.stdout.write(`\n▶  ${step.name}\n`);
    const child = spawn(step.command, step.args, {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
    });
    child.on("error", (error) => {
      resolve({ id: step.id, name: step.name, ok: false, durationMs: Date.now() - startedAt, error: error.message });
    });
    child.on("exit", (code) => {
      resolve({ id: step.id, name: step.name, ok: code === 0, durationMs: Date.now() - startedAt, exitCode: code });
    });
  });
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes}m${seconds.toString().padStart(2, "0")}s`;
}

async function main() {
  const overallStart = Date.now();
  console.log(`Submission final check — ${STEPS.length} step${STEPS.length === 1 ? "" : "s"}`);
  if (SKIP_RELEASE_GATE) console.log("  (release:gate skipped via --skip-release-gate)");
  if (INCLUDE_OLLAMA) console.log("  (release:gate:ollama included via --include-ollama)");

  const results = [];
  for (const step of STEPS) {
    const result = await runStep(step);
    results.push(result);
  }

  const totalMs = Date.now() - overallStart;
  const passed = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  console.log("\n" + "═".repeat(60));
  console.log("Submission Final Check — Summary");
  console.log("═".repeat(60));
  for (const r of results) {
    const status = r.ok ? "✓" : "✗";
    const detail = r.ok ? "" : `  (exit ${r.exitCode ?? "?"}${r.error ? `, ${r.error}` : ""})`;
    console.log(`  ${status}  ${r.name.padEnd(28)} ${formatDuration(r.durationMs).padStart(8)}${detail}`);
  }
  console.log("─".repeat(60));
  console.log(`  Passed: ${passed.length}/${results.length}    Total: ${formatDuration(totalMs)}`);

  if (failed.length > 0) {
    console.log("\n" + "✗  Submission is NOT ready to publish. Fix the failed steps above and re-run.");
    process.exitCode = 1;
    return;
  }

  console.log("\n" + "✓  All pre-submit gates passed.");
  console.log("   Next: complete the external publish steps in docs/hackathon-submission-checklist.md");
  console.log("   (GitHub public, live demo URL, YouTube video, Kaggle attachments).");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
