import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_GEMINI_MODEL_IDS, GEMINI_RUN_GUARD_ENV_VAR, resolveGeminiConfig } from "./gemini-api-preflight.mjs";

export const PROOF_DOC_PATHS = [
  "docs/eval-baseline.md",
  "docs/hackathon-proof-brief.md",
  "docs/hackathon-hosted-operations.md",
  "README.md",
  "docs/kaggle-writeup.md",
];

// Fallback seed only. `validateProofSurfaces` derives the canonical
// artifact at runtime from the "Latest passing hosted gate:" line in
// docs/hackathon-proof-brief.md — that doc is the single source of truth
// for proof surfaces. This constant still backs `readHostedProofSummary`
// callers that don't have a surfaces object, and the `ops-scripts.test.ts`
// fixtures that construct synthetic proof surfaces inline.
export const HOSTED_PROOF_RUN_DIR = "output/release-gate/2026-04-25T17-52-51-834Z-9428";
export const TARGETED_HOSTED_SMOKE_COMMAND = "PRAIRIE_INFERENCE_PROVIDER=gemini PRAIRIE_SMOKE_CASES=ea-briefing npm run smoke:api";
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
  /latest failed hosted gate/i,
  /latest blocked hosted artifact/i,
  /current blocked hosted artifact/i,
  /still blocked at API smoke/i,
  /full hosted gate still blocked/i,
  /what is still blocked/i,
  /exact blocked step/i,
  /current blocker detail/i,
  /first approved live rerun step:\s*PRAIRIE_INFERENCE_PROVIDER=gemini PRAIRIE_SMOKE_CASES=ea-briefing npm run smoke:api/i,
  /next approved live rerun step is\s*`?PRAIRIE_INFERENCE_PROVIDER=gemini PRAIRIE_SMOKE_CASES=ea-briefing npm run smoke:api`?/i,
  /this proof is partial/i,
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

function extractCanonicalHostedArtifact(surfaces) {
  const proofBrief = surfaces["docs/hackathon-proof-brief.md"];
  if (typeof proofBrief !== "string") {
    return null;
  }
  const match = proofBrief.match(CANONICAL_HOSTED_GATE_PATTERN)?.[1];
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

  for (const docPath of PROOF_DOC_PATHS) {
    if (!(docPath in surfaces)) {
      recordIssue(issues, docPath, "missing proof surface");
      continue;
    }

    const content = surfaces[docPath];
    requireSubstring(issues, docPath, content, canonicalArtifact, "hosted proof artifact path");
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
  // markdown emphasis (e.g., `**Latest passing hosted gate:**`) between the
  // label and the backticked path. The proof-brief entry is intentionally
  // first so the validator's canonical source wins over alternatives.
  const preferredExtractions = [
    ["docs/hackathon-proof-brief.md", /Latest passing hosted gate[:*\s]*`([^`]+)`/i],
    ["docs/hackathon-hosted-operations.md", /Latest passing gate artifact[:*\s]*`([^`]+)`/i],
    ["README.md", /latest passing hosted artifact is\s*`([^`]+)`/i],
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
