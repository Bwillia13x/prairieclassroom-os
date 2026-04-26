export function extractMarkdownSection(content, heading) {
  if (typeof content !== "string" || typeof heading !== "string") {
    return null;
  }
  const headingLine = `## ${heading}`;
  const lines = content.split("\n");
  const startIdx = lines.findIndex((line) => line === headingLine);
  if (startIdx === -1) {
    return null;
  }
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) {
      endIdx = i;
      break;
    }
  }
  return lines.slice(startIdx, endIdx).join("\n").replace(/\n+$/, "");
}

export function isBlockedHostedSection(sectionMd) {
  if (typeof sectionMd !== "string") {
    return false;
  }
  return /\*\*Status:\*\*\s+Blocked/i.test(sectionMd);
}

const HOSTED_ARTIFACT_PATTERN = /Latest passed hosted Gemini gate:\s*`([^`]+)`/i;
const HOSTED_TABLE_ROW_PATTERN = /^\|\s*Gemini API\s*\|\s*([^|]+)\|/im;
const BACKTICK_TOKEN_PATTERN = /`([^`]+)`/g;

export function parseHostedPassFromProofStatusDoc(content) {
  if (typeof content !== "string") {
    return null;
  }
  const artifactMatch = content.match(HOSTED_ARTIFACT_PATTERN);
  const tableMatch = content.match(HOSTED_TABLE_ROW_PATTERN);
  if (!artifactMatch || !tableMatch) {
    return null;
  }
  const runDir = artifactMatch[1].trim();
  const tokens = [...tableMatch[1].matchAll(BACKTICK_TOKEN_PATTERN)].map((m) => m[1].trim());
  if (tokens.length < 2 || !runDir) {
    return null;
  }
  return {
    inference_mode: "gemini",
    status: "passed",
    run_dir: runDir,
    gemini_model_ids: { live: tokens[0], planning: tokens[1] },
    completed_at: null,
    generated_at: null,
    host: null,
  };
}
