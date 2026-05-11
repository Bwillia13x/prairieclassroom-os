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
 *   --skip-publication-check
 *                         Skip final publication readiness checks for
 *                         local-only validation before external links exist.
 *   --skip-public-link-health
 *                         Skip live HTTP checks for public links after they
 *                         pass placeholder and URL-shape validation.
 *   --skip-public-demo-smoke
 *                         Skip the deployed browser smoke after public links
 *                         pass publication readiness.
 *   --include-ollama      Also run release:gate:ollama (only meaningful on a
 *                         viable host with gemma4:4b + gemma4:27b pulled).
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  validatePublicationPlaceholders,
  validatePublicationReadiness,
} from "./lib/submission-final-check.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const args = new Set(process.argv.slice(2));
const SKIP_RELEASE_GATE = args.has("--skip-release-gate");
const INCLUDE_OLLAMA = args.has("--include-ollama");
const SKIP_PUBLICATION_CHECK = args.has("--skip-publication-check");
const SKIP_PUBLIC_LINK_HEALTH = args.has("--skip-public-link-health");
const SKIP_PUBLIC_DEMO_SMOKE = args.has("--skip-public-demo-smoke");

const STEPS = [
  { id: "claims", name: "claims:check", command: "npm", args: ["run", "claims:check"] },
  { id: "proof", name: "proof:check", command: "npm", args: ["run", "proof:check"] },
  { id: "inventory", name: "system:inventory:check", command: "npm", args: ["run", "system:inventory:check"] },
  { id: "eval-inventory", name: "eval:inventory:check", command: "npm", args: ["run", "eval:inventory:check"] },
  { id: "demo-fixture", name: "demo:fixture:check", command: "npm", args: ["run", "demo:fixture:check"] },
  { id: "contrast", name: "check:contrast", command: "npm", args: ["run", "check:contrast"] },
];

if (!SKIP_PUBLICATION_CHECK) {
  STEPS.push({
    id: "publication-readiness",
    name: "publication readiness check",
    run: checkPublicationReadiness,
  });
  if (!SKIP_PUBLIC_DEMO_SMOKE) {
    STEPS.push({
      id: "public-demo-smoke",
      name: "smoke:public-demo",
      command: "npm",
      args: ["run", "smoke:public-demo"],
    });
  }
}

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

async function runStep(step) {
  const startedAt = Date.now();
  process.stdout.write(`\n▶  ${step.name}\n`);
  if (step.run) {
    try {
      const result = await step.run();
      return {
        id: step.id,
        name: step.name,
        ok: result.ok,
        durationMs: Date.now() - startedAt,
        exitCode: result.ok ? 0 : 1,
        details: result.details,
      };
    } catch (error) {
      return {
        id: step.id,
        name: step.name,
        ok: false,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return new Promise((resolve) => {
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

async function checkPublicationReadiness() {
  const { ok, issues } = SKIP_PUBLIC_LINK_HEALTH
    ? validatePublicationPlaceholders({ rootDir: ROOT })
    : await validatePublicationReadiness({ rootDir: ROOT });

  if (ok) {
    console.log(SKIP_PUBLIC_LINK_HEALTH
      ? "Publication placeholders and URL shapes are clean. Public-link health check skipped."
      : "Publication placeholders, URL shapes, and public-link health checks are clean.");
    return { ok: true, details: [] };
  }

  console.log("Publication readiness still blocks final publishing:");
  for (const issue of issues) {
    console.log(`  - ${issue}`);
  }
  console.log("Use --skip-publication-check only for local-only validation before external links exist.");
  console.log("Use --skip-public-link-health only when public URLs are already separately smoke-tested.");

  return { ok: false, details: issues };
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
  if (SKIP_PUBLICATION_CHECK) console.log("  (publication readiness check skipped via --skip-publication-check)");
  if (SKIP_PUBLIC_LINK_HEALTH) console.log("  (public-link health check skipped via --skip-public-link-health)");
  if (SKIP_PUBLIC_DEMO_SMOKE) console.log("  (public demo browser smoke skipped via --skip-public-demo-smoke)");

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

  console.log("\n" + `✓  All ${SKIP_PUBLICATION_CHECK ? "local " : ""}pre-submit gates passed.`);
  console.log("   Next: complete the external publish steps in docs/hackathon-submission-checklist.md");
  console.log("   (GitHub public, reachable live demo URL, public demo browser smoke, reachable YouTube video, Kaggle attachments).");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
