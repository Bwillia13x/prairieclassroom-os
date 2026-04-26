import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const FAN_OUT_FILES = [
  "README.md",
  "docs/demo-script.md",
  "docs/eval-baseline.md",
  "docs/gemma-integration-followups.md",
  "docs/hackathon-hosted-operations.md",
  "docs/hackathon-judge-summary.md",
  "docs/hackathon-proof-brief.md",
  "docs/hackathon-submission-checklist.md",
  "docs/kaggle-writeup.md",
  "docs/live-model-proof-status.md",
  "docs/pilot/claims-ledger.md",
];

const ARTIFACT_ID_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d+Z-\d+$/;

export function isValidArtifactId(id) {
  return typeof id === "string" && ARTIFACT_ID_PATTERN.test(id);
}

export function dateFromArtifactId(id) {
  if (!isValidArtifactId(id)) return null;
  return id.split("T")[0];
}

export async function readCurrentCanonicalArtifactId(rootDir) {
  const proofBriefPath = path.join(rootDir, "docs", "hackathon-proof-brief.md");
  if (!existsSync(proofBriefPath)) return null;
  const content = await readFile(proofBriefPath, "utf8");
  const match = content.match(/Latest passing hosted gate[:*\s]*`output\/release-gate\/([^`]+)`/i);
  return match?.[1] ?? null;
}

export async function bumpCanonicalArtifact({
  rootDir,
  oldArtifactId,
  newArtifactId,
  files = FAN_OUT_FILES,
}) {
  if (!isValidArtifactId(oldArtifactId)) {
    throw new Error(`Invalid old artifact id: ${oldArtifactId}`);
  }
  if (!isValidArtifactId(newArtifactId)) {
    throw new Error(`Invalid new artifact id: ${newArtifactId}`);
  }
  if (oldArtifactId === newArtifactId) {
    return { touched: [], skipped: files.slice() };
  }

  const oldDate = dateFromArtifactId(oldArtifactId);
  const newDate = dateFromArtifactId(newArtifactId);
  const touched = [];
  const skipped = [];

  for (const relPath of files) {
    const filePath = path.join(rootDir, relPath);
    if (!existsSync(filePath)) {
      skipped.push(relPath);
      continue;
    }
    const before = await readFile(filePath, "utf8");
    let after = before.replaceAll(oldArtifactId, newArtifactId);
    if (oldDate !== newDate) {
      after = after.replaceAll(`${oldDate}-gemini`, `${newDate}-gemini`);
    }
    if (after !== before) {
      await writeFile(filePath, after, "utf8");
      touched.push(relPath);
    } else {
      skipped.push(relPath);
    }
  }

  return { touched, skipped };
}

export async function findLatestPassedHostedRunDir(rootDir) {
  const releaseGateDir = path.join(rootDir, "output", "release-gate");
  if (!existsSync(releaseGateDir)) return null;
  const { readdir } = await import("node:fs/promises");
  const entries = (await readdir(releaseGateDir)).sort().reverse();
  for (const entry of entries) {
    const summaryPath = path.join(releaseGateDir, entry, "summary.json");
    if (!existsSync(summaryPath)) continue;
    try {
      const summary = JSON.parse(await readFile(summaryPath, "utf8"));
      if (summary.inference_mode === "gemini" && summary.status === "passed") {
        return entry;
      }
    } catch {
      continue;
    }
  }
  return null;
}
