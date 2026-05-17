import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isKaggleUrl, isYouTubeUrl } from "./submission-publish-preflight.mjs";

const DOC_UPDATES = [
  {
    relPath: "docs/submission-copy-pack.md",
    pattern: /^-\s*Kaggle writeup:/i,
    buildLine: ({ kaggleUrl }) => `- Kaggle writeup: ${kaggleUrl}`,
  },
  {
    relPath: "docs/kaggle-paste-block.md",
    pattern: /^-\s*Public video:/i,
    buildLine: ({ videoUrl }) => `- Public video: ${videoUrl}`,
  },
  {
    relPath: "docs/hackathon-submission-checklist.md",
    pattern: /^-\s*Public-video script:/i,
    buildLine: ({ videoUrl }) => [
      "- Public-video script: final local video QA passed for ",
      "`qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11.mp4` ",
      "(120.043 seconds, 1920x1080, 30 fps); public YouTube URL recorded: ",
      videoUrl,
      ".",
    ].join(""),
  },
];

export function validateSubmissionLinks({ videoUrl, kaggleUrl } = {}) {
  const issues = [];
  if (!videoUrl) {
    issues.push("Missing --video-url");
  } else if (!isYouTubeUrl(videoUrl)) {
    issues.push(`--video-url must be a public YouTube/youtu.be URL: ${videoUrl}`);
  }

  if (!kaggleUrl) {
    issues.push("Missing --kaggle-url");
  } else if (!isKaggleUrl(kaggleUrl)) {
    issues.push(`--kaggle-url must be a public kaggle.com URL: ${kaggleUrl}`);
  }

  return issues;
}

function replaceMatchingLine({ content, pattern, replacement, relPath }) {
  const lines = content.split(/\r?\n/);
  const matches = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => pattern.test(line));

  if (matches.length !== 1) {
    throw new Error(`${relPath}: expected exactly one matching line, found ${matches.length}`);
  }

  const [{ index, line: previousLine }] = matches;
  lines[index] = replacement;

  return {
    content: lines.join("\n"),
    previousLine,
    nextLine: replacement,
  };
}

export async function applySubmissionLinks({
  rootDir = process.cwd(),
  videoUrl,
  kaggleUrl,
  dryRun = false,
} = {}) {
  const issues = validateSubmissionLinks({ videoUrl, kaggleUrl });
  if (issues.length > 0) {
    throw new Error(issues.join("\n"));
  }

  const changes = [];
  for (const update of DOC_UPDATES) {
    const absolutePath = path.join(rootDir, update.relPath);
    const content = await readFile(absolutePath, "utf8");
    const replacement = update.buildLine({ videoUrl, kaggleUrl });
    const result = replaceMatchingLine({
      content,
      pattern: update.pattern,
      replacement,
      relPath: update.relPath,
    });

    if (result.previousLine !== result.nextLine) {
      changes.push({
        relPath: update.relPath,
        previousLine: result.previousLine,
        nextLine: result.nextLine,
      });
      if (!dryRun) {
        await writeFile(absolutePath, result.content, "utf8");
      }
    }
  }

  return { dryRun, changes };
}
