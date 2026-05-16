import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_GEMINI_MODEL_IDS, GEMINI_RUN_GUARD_ENV_VAR, resolveGeminiConfig } from "./gemini-api-preflight.mjs";

export const PROOF_DOC_PATHS = [
  "docs/eval-baseline.md",
  "docs/live-model-proof-status.md",
  "docs/hackathon-proof-brief.md",
  "docs/hackathon-judge-summary.md",
  "docs/hackathon-hosted-operations.md",
  "docs/hackathon-submission-checklist.md",
  "README.md",
  "docs/kaggle-writeup.md",
  "docs/gemma-integration-followups.md",
];

// Fallback seed only. `validateProofSurfaces` derives the canonical
// artifact at runtime from the "Latest passing hosted gate:" line in
// docs/hackathon-proof-brief.md — that doc is the single source of truth
// for proof surfaces. This constant still backs `readHostedProofSummary`
// callers that don't have a surfaces object, and the `ops-scripts.test.ts`
// fixtures that construct synthetic proof surfaces inline.
export const HOSTED_PROOF_RUN_DIR = "output/release-gate/2026-05-16T19-53-39-742Z-56491";
export const CURRENT_HOSTED_ATTEMPT_RUN_DIR = "output/release-gate/2026-05-16T19-53-39-742Z-56491";
export const TARGETED_HOSTED_SMOKE_COMMAND =
  "PRAIRIE_INFERENCE_PROVIDER=gemini PRAIRIE_SMOKE_CASES=ea-briefing npm run smoke:api";
export const LOCAL_PREP_COMMANDS = [
  "npm run proof:check",
  "npm run gemini:readycheck",
];
export const APPROVED_RERUN_ORDER = [
  ...LOCAL_PREP_COMMANDS,
  "npm run release:gate:gemini",
  "npm run eval:summary",
  "npm run logs:summary",
];
const HOSTED_PROOF_RUN_DIR_PATTERN = /output\/release-gate\/\d{4}-\d{2}-\d{2}T[0-9A-Z-]+-\d+/g;

const FORBIDDEN_OVERCLAIMS = [
  /first approved live rerun step:\s*PRAIRIE_INFERENCE_PROVIDER=gemini PRAIRIE_SMOKE_CASES=ea-briefing npm run smoke:api/i,
  /next approved live rerun step is\s*`?PRAIRIE_INFERENCE_PROVIDER=gemini PRAIRIE_SMOKE_CASES=ea-briefing npm run smoke:api`?/i,
  /Hosted Gemini proof lane:\s*partial/i,
];

function recordIssue(issues, docPath, message) {
  issues.push(`${docPath}: ${message}`);
}

function requireSubstring(issues, docPath, content, needle, label) {
  if (!content.includes(needle)) {
    recordIssue(issues, docPath, `missing ${label}: ${needle}`);
  }
}

function requirePattern(issues, docPath, content, pattern, label) {
  if (!pattern.test(content)) {
    recordIssue(issues, docPath, `missing ${label}`);
  }
}

export async function loadProofSurfaces(rootDir, docPaths = PROOF_DOC_PATHS) {
  const entries = await Promise.all(
    docPaths.map(async (docPath) => [docPath, await readFile(path.join(rootDir, docPath), "utf8")]),
  );
  return Object.fromEntries(entries);
}

const CANONICAL_HOSTED_GATE_PATTERN = /Latest passing hosted gate[:*\s]*`(output\/release-gate\/[^`]+)`/i;
const CURRENT_HOSTED_ATTEMPT_PATTERN = /Latest attempted hosted gate[:*\s]*`(output\/release-gate\/[^`]+)`/i;

function extractCanonicalHostedArtifact(surfaces) {
  const proofBrief = surfaces["docs/hackathon-proof-brief.md"];
  if (typeof proofBrief !== "string") {
    return null;
  }
  const match = proofBrief.match(CANONICAL_HOSTED_GATE_PATTERN)?.[1];
  return match?.startsWith("output/release-gate/") ? match : null;
}

function extractCurrentHostedAttemptArtifact(surfaces) {
  const proofBrief = surfaces["docs/hackathon-proof-brief.md"];
  if (typeof proofBrief !== "string") {
    return null;
  }
  const match = proofBrief.match(CURRENT_HOSTED_ATTEMPT_PATTERN)?.[1];
  return match?.startsWith("output/release-gate/") ? match : null;
}

export function validateProofSurfaces(surfaces) {
  const issues = [];

  const canonicalArtifact = extractCanonicalHostedArtifact(surfaces);
  if (!canonicalArtifact) {
    recordIssue(
      issues,
      "docs/hackathon-proof-brief.md",
      "could not extract canonical hosted artifact — expected a line like `Latest passing hosted gate: `output/release-gate/...``",
    );
    return { ok: false, issues };
  }
  const currentAttemptArtifact = extractCurrentHostedAttemptArtifact(surfaces);
  const currentAttemptIsPassing = currentAttemptArtifact === canonicalArtifact;

  for (const docPath of PROOF_DOC_PATHS) {
    if (!(docPath in surfaces)) {
      recordIssue(issues, docPath, "missing proof surface");
      continue;
    }

    const content = surfaces[docPath];
    requireSubstring(issues, docPath, content, canonicalArtifact, "hosted proof artifact path");
    if (currentAttemptArtifact) {
      requireSubstring(issues, docPath, content, currentAttemptArtifact, "current hosted attempt artifact path");
      requirePattern(
        issues,
        docPath,
        content,
        /(latest attempted hosted gate|current hosted refresh|May (8|16) hosted refresh|current hosted attempt)/i,
        "current hosted attempt language",
      );
      if (currentAttemptIsPassing) {
        requirePattern(
          issues,
          docPath,
          content,
          /(current hosted refresh.*pass|latest attempted hosted gate.*pass|full hosted release gate completed|current clean full hosted gate|passing baseline)/i,
          "current hosted passing language",
        );
      } else {
        requirePattern(
          issues,
          docPath,
          content,
          /(failed|blocked|did not produce a passing|not a passing baseline|no current clean full hosted gate)/i,
          "current hosted blocker language",
        );
      }
    }
    requireSubstring(issues, docPath, content, DEFAULT_GEMINI_MODEL_IDS.live, "hosted live model id");
    requireSubstring(issues, docPath, content, DEFAULT_GEMINI_MODEL_IDS.planning, "hosted planning model id");
    requireSubstring(issues, docPath, content, "npm run release:gate:gemini", "hosted release gate command");
    requirePattern(issues, docPath, content, /synthetic\/demo/i, "synthetic/demo scope language");
    requirePattern(
      issues,
      docPath,
      content,
      /((privacy-first|privacy-preserving).*(Ollama|school deployment|self-hosted))|((Ollama|school deployment|self-hosted).*(privacy-first|privacy-preserving))/i,
      "privacy-first Ollama lane language",
    );
    requirePattern(
      issues,
      docPath,
      content,
      /(passing baseline|full hosted release gate completed|full hosted release gate passed|Hosted Gemini proof lane:\*{0,2}\s*passing)/i,
      "passing hosted-proof language",
    );

    for (const pattern of FORBIDDEN_OVERCLAIMS) {
      if (pattern.test(content)) {
        recordIssue(issues, docPath, `contains stale hosted-proof language: ${pattern}`);
      }
    }
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

export function extractHostedProofRunDir(surfaces) {
  // Character class `[:*\s]*` after each label tolerates the real docs'
  // markdown emphasis (e.g., `**Latest attempted hosted gate:**`) between the
  // label and the backticked path. The attempted-gate entries are intentionally
  // first so readycheck reports the current proof state, while proof validation
  // still derives the last passing baseline from the proof-brief line.
  const preferredExtractions = [
    ["docs/hackathon-proof-brief.md", /Latest attempted hosted gate[:*\s]*`([^`]+)`/i],
    ["docs/live-model-proof-status.md", /Latest attempted hosted Gemini gate[:*\s]*`([^`]+)`/i],
    ["docs/hackathon-hosted-operations.md", /Latest attempted gate artifact[:*\s]*`([^`]+)`/i],
    ["docs/hackathon-proof-brief.md", /Latest passing hosted gate[:*\s]*`([^`]+)`/i],
    ["docs/hackathon-hosted-operations.md", /Latest passing gate artifact[:*\s]*`([^`]+)`/i],
    ["README.md", /last passing hosted (?:artifact|baseline).*`([^`]+)`/i],
  ];

  for (const [docPath, pattern] of preferredExtractions) {
    const content = surfaces[docPath];
    const match = typeof content === "string" ? content.match(pattern)?.[1] : null;
    if (match?.startsWith("output/release-gate/")) {
      return match;
    }
  }

  for (const docPath of PROOF_DOC_PATHS) {
    const content = surfaces[docPath];
    const match = typeof content === "string" ? content.match(HOSTED_PROOF_RUN_DIR_PATTERN)?.[0] : null;
    if (match) {
      return match;
    }
  }
  return HOSTED_PROOF_RUN_DIR;
}

export async function readHostedProofSummary(rootDir, runDir = HOSTED_PROOF_RUN_DIR) {
  const summaryPath = path.join(rootDir, runDir, "summary.json");
  if (!existsSync(summaryPath)) {
    return null;
  }

  return JSON.parse(await readFile(summaryPath, "utf8"));
}

export function buildGeminiReadycheck({ env = process.env, surfaces = {}, hostedProofSummary = null } = {}) {
  const config = resolveGeminiConfig(env);
  const issues = [];
  const latestArtifactPath = extractHostedProofRunDir(surfaces);

  if (!config.authPresent) {
    issues.push("Gemini API key is missing.");
  }
  if (!config.runGuardEnabled) {
    issues.push("Hosted Gemini runs are disabled.");
  }

  return {
    ok: issues.length === 0,
    exitCode: issues.length === 0 ? 0 : 1,
    apiKeyPresent: config.authPresent,
    apiKeyEnvVar: config.apiKeyEnvVar,
    runGuardEnabled: config.runGuardEnabled,
    runGuardEnvVar: GEMINI_RUN_GUARD_ENV_VAR,
    latestArtifactPath,
    latestArtifactExists: Boolean(hostedProofSummary),
    latestStatus: hostedProofSummary?.status ?? null,
    proofSurfaceCount: Object.keys(surfaces).length,
    rerunOrder: APPROVED_RERUN_ORDER,
    issues,
  };
}

export function formatGeminiReadycheckReport(report) {
  const lines = [
    "Gemini Hosted Readycheck",
    `API key: ${report.apiKeyPresent ? `present (${report.apiKeyEnvVar})` : "missing"}`,
    `Hosted run guard: ${report.runGuardEnabled ? "enabled" : "disabled"}`,
    `Latest hosted artifact: ${report.latestArtifactPath}`,
  ];

  if (report.latestStatus) {
    lines.push(`Latest hosted status: ${report.latestStatus}`);
  }

  lines.push("");
  lines.push("Next approved rerun order");

  report.rerunOrder.forEach((step, index) => {
    lines.push(`${index + 1}. ${step}`);
  });

  if (report.issues.length > 0) {
    lines.push("");
    lines.push("Readycheck status");
    report.issues.forEach((issue) => lines.push(`- ${issue}`));
  }

  return lines.join("\n");
}
