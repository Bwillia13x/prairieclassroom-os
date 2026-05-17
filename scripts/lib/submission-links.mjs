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
    pattern: /^-\s*Publication gate:/i,
    buildLine: () => [
      "- Publication gate: final public links are recorded; rerun ",
      "`npm run submission:final-check -- --skip-release-gate` to verify public-link health ",
      "and public demo smoke before publishing.",
    ].join(""),
  },
  {
    relPath: "docs/hackathon-submission-checklist.md",
    pattern: /^-\s*Public-video script:/i,
    buildLine: ({ videoUrl }) => [
      "- Public-video script: final local video QA passed for ",
      "`qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11.mp4` ",
      "(120.043 seconds, 1920x1080, 30 fps; sha256 ",
      "`2fbd0bd1b48ef1aefd7c82f612f9fecdf0dfafd273a80454a26b2bb59b796da6`); ",
      "public YouTube URL recorded: ",
      videoUrl,
      ".",
    ].join(""),
  },
  {
    relPath: "docs/hackathon-submission-checklist.md",
    pattern: /^-\s*\*\*Video:\*\*/i,
    buildLine: ({ videoUrl }) => `- **Video:** ${videoUrl}`,
  },
  {
    relPath: "docs/hackathon-submission-checklist.md",
    pattern: /^-\s*Publish preflight:/i,
    buildLine: ({ videoUrl, kaggleUrl }) => [
      "- Publish preflight: final public links are recorded for ",
      `${videoUrl} and ${kaggleUrl}; run `,
      "`npm run submission:publish-preflight` with Node `v25.8.2` and `.env` exported ",
      "to verify local file checks, git sync, Vercel/Render readiness, hosted Gemma env/guard checks, ",
      "and public URL shape before publishing.",
    ].join(""),
  },
  {
    relPath: "docs/hackathon-submission-checklist.md",
    pattern: /^-\s*Live demo deploy:/i,
    buildLine: ({ previousLine }) => replaceExpectedText(
      previousLine,
      /Public video and Kaggle submission URLs are still missing; true cellular-browser smoke is still pending\./,
      "Public video and Kaggle submission URLs are recorded; true cellular-browser smoke is still pending.",
      "docs/hackathon-submission-checklist.md",
    ),
  },
  {
    relPath: "docs/hackathon-submission-checklist.md",
    pattern: /^13\.\s*Run `npm run submission:publish-preflight`;/i,
    buildLine: () => [
      "13. Run `npm run submission:publish-preflight` after the public video and Kaggle URLs are applied; ",
      "it should pass only when URL shape, branch sync, hosted Gemma env, Vercel, and Render checks are current.",
    ].join(""),
  },
  {
    relPath: "docs/public-demo-operations.md",
    pattern: /^-\s*\*\*Not yet complete:\*\*/i,
    buildLine: ({ videoUrl, kaggleUrl }) => [
      "- **Not yet complete:** true cellular-browser smoke remains pending. ",
      `Public video URL recorded: ${videoUrl}; Kaggle URL recorded: ${kaggleUrl}. `,
      "Vercel production stores the server-side `PRAIRIE_GEMINI_API_KEY` and ",
      "`PRAIRIE_ENABLE_GEMINI_RUNS` values as encrypted env vars, but those values are not browser-exposed.",
    ].join(""),
  },
  {
    relPath: "docs/public-demo-operations.md",
    pattern: /^`npm run submission:final-check -- --skip-release-gate` currently remains blocked/i,
    buildLine: () => [
      "`npm run submission:final-check -- --skip-release-gate` verifies publication placeholders, ",
      "public-link health, and public demo smoke after final public links are applied. ",
      "Run the full no-skip submission gate once the release-gate artifact should also be refreshed.",
    ].join(""),
  },
  {
    relPath: "docs/public-demo-operations.md",
    pattern: /^-\s*In the remaining-work closeout,/i,
    buildLine: () => [
      "- After final links are applied, ",
      "`source ~/.nvm/nvm.sh && nvm use --silent 25.8.2 && set -a && source .env && set +a && npm run submission:publish-preflight` ",
      "is the compact publication preflight for local, GitHub, Vercel, Render, hosted-Gemma-env, live-demo, ",
      "public video, and Kaggle writeup checks.",
    ].join(""),
  },
  {
    relPath: "docs/public-demo-operations.md",
    pattern: /^-\s*With Node `v25\.8\.2`/i,
    buildLine: () => [
      "- With Node `v25.8.2`, `npm run submission:publish-preflight` verifies local file checks for ",
      "`render.yaml`, `apps/web/vercel.json`, final MP4, upstream configuration, Vercel CLI availability, ",
      "Vercel project link, Render availability, hosted Gemma env checks when `.env` is exported, ",
      "public live demo URL, public video URL, and Kaggle writeup URL. The no-skip publication gate ",
      "must be rerun after final links are real.",
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

function replaceMatchingLine({ content, pattern, buildReplacement, relPath }) {
  const lines = content.split(/\r?\n/);
  const matches = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => pattern.test(line));

  if (matches.length !== 1) {
    throw new Error(`${relPath}: expected exactly one matching line, found ${matches.length}`);
  }

  const [{ index, line: previousLine }] = matches;
  const replacement = buildReplacement(previousLine);
  lines[index] = replacement;

  return {
    content: lines.join("\n"),
    previousLine,
    nextLine: replacement,
  };
}

function replaceExpectedText(previousLine, expectedPattern, replacement, relPath) {
  const nextLine = previousLine.replace(expectedPattern, replacement);
  if (nextLine === previousLine) {
    throw new Error(`${relPath}: matching line did not contain expected stale publication text`);
  }
  return nextLine;
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

  const files = new Map();
  const changes = [];

  for (const update of DOC_UPDATES) {
    const absolutePath = path.join(rootDir, update.relPath);
    let file = files.get(update.relPath);
    if (!file) {
      file = {
        relPath: update.relPath,
        absolutePath,
        originalContent: await readFile(absolutePath, "utf8"),
        content: "",
      };
      file.content = file.originalContent;
      files.set(update.relPath, file);
    }

    const result = replaceMatchingLine({
      content: file.content,
      pattern: update.pattern,
      buildReplacement: (previousLine) => update.buildLine({ videoUrl, kaggleUrl, previousLine }),
      relPath: update.relPath,
    });

    file.content = result.content;
    if (result.previousLine !== result.nextLine) {
      changes.push({
        relPath: update.relPath,
        previousLine: result.previousLine,
        nextLine: result.nextLine,
      });
    }
  }

  if (!dryRun) {
    for (const file of files.values()) {
      if (file.content !== file.originalContent) {
        await writeFile(file.absolutePath, file.content, "utf8");
      }
    }
  }

  return { dryRun, changes };
}
