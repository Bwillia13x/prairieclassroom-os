import fs from "node:fs";
import path from "node:path";

export const PUBLICATION_PLACEHOLDERS = [
  {
    file: "docs/submission-copy-pack.md",
    patterns: [
      /add public deployed URL/i,
      /add Kaggle writeup URL/i,
      /after public clone test/i,
    ],
  },
  {
    file: "docs/kaggle-paste-block.md",
    patterns: [
      /add public deployed URL/i,
      /add public YouTube URL/i,
    ],
  },
  {
    file: "docs/hackathon-submission-checklist.md",
    patterns: [
      /Live demo deploy: NOT YET DEPLOYED/i,
      /external service creation, secret entry, and cellular smoke are still pending/i,
    ],
  },
];

export function findPublicationPlaceholders({
  rootDir = process.cwd(),
  specs = PUBLICATION_PLACEHOLDERS,
} = {}) {
  const issues = new Set();

  for (const entry of specs) {
    const absolutePath = path.join(rootDir, entry.file);
    const content = fs.readFileSync(absolutePath, "utf8");
    const lines = content.split(/\r?\n/);

    for (const pattern of entry.patterns) {
      lines.forEach((line, index) => {
        if (pattern.test(line)) {
          issues.add(`${entry.file}:${index + 1}: ${line.trim()}`);
        }
      });
    }
  }

  return Array.from(issues);
}

export function validatePublicationPlaceholders(options = {}) {
  const issues = findPublicationPlaceholders(options);
  return { ok: issues.length === 0, issues };
}
