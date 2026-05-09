import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { findPublicationPlaceholders, validatePublicationPlaceholders } from "../submission-final-check.mjs";

async function seedFile(rootDir, relPath, content) {
  const filePath = path.join(rootDir, relPath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

async function seedSubmissionDocs(rootDir, overrides = {}) {
  await seedFile(
    rootDir,
    "docs/submission-copy-pack.md",
    overrides.copyPack ?? [
      "# Submission Copy Pack",
      "- Code: PrairieClassroom OS source code after public clone test",
      "- Live demo: [add public deployed URL after deployment]",
      "- Kaggle writeup: [add Kaggle writeup URL after submission]",
    ].join("\n"),
  );
  await seedFile(
    rootDir,
    "docs/kaggle-paste-block.md",
    overrides.pasteBlock ?? [
      "# Kaggle Paste Block",
      "- Public live demo: add public deployed URL after deployment",
      "- Public video: add public YouTube URL after upload",
    ].join("\n"),
  );
  await seedFile(
    rootDir,
    "docs/hackathon-submission-checklist.md",
    overrides.checklist ?? [
      "# Hackathon Submission Checklist",
      "- Live demo deploy: NOT YET DEPLOYED — external service creation, secret entry, and cellular smoke are still pending.",
    ].join("\n"),
  );
}

describe("findPublicationPlaceholders", () => {
  it("reports unresolved public-link and clone-test placeholders", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "submission-final-check-"));
    try {
      await seedSubmissionDocs(rootDir);

      const issues = findPublicationPlaceholders({ rootDir });

      assert.equal(issues.length, 6);
      assert.match(issues.join("\n"), /docs\/submission-copy-pack\.md:2/);
      assert.match(issues.join("\n"), /docs\/submission-copy-pack\.md:3/);
      assert.match(issues.join("\n"), /docs\/submission-copy-pack\.md:4/);
      assert.match(issues.join("\n"), /docs\/kaggle-paste-block\.md:2/);
      assert.match(issues.join("\n"), /docs\/kaggle-paste-block\.md:3/);
      assert.match(issues.join("\n"), /docs\/hackathon-submission-checklist\.md:2/);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("deduplicates a line that matches multiple placeholder patterns", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "submission-final-check-dedupe-"));
    try {
      await seedSubmissionDocs(rootDir, {
        copyPack: "# Submission Copy Pack\nAll links verified.",
        pasteBlock: "# Kaggle Paste Block\nAll links verified.",
        checklist: [
          "# Hackathon Submission Checklist",
          "- Live demo deploy: NOT YET DEPLOYED — external service creation, secret entry, and cellular smoke are still pending.",
        ].join("\n"),
      });

      const issues = findPublicationPlaceholders({ rootDir });

      assert.deepEqual(issues, [
        "docs/hackathon-submission-checklist.md:2: - Live demo deploy: NOT YET DEPLOYED — external service creation, secret entry, and cellular smoke are still pending.",
      ]);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});

describe("validatePublicationPlaceholders", () => {
  it("passes once submission-facing docs contain final public links and verification text", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "submission-final-check-clean-"));
    try {
      await seedSubmissionDocs(rootDir, {
        copyPack: [
          "# Submission Copy Pack",
          "- Code: https://github.com/Bwillia13x/prairieclassroom-os (public clone verified)",
          "- Live demo: https://prairieclassroom.example.com",
          "- Kaggle writeup: https://www.kaggle.com/competitions/gemma-4-good/discussion/example",
        ].join("\n"),
        pasteBlock: [
          "# Kaggle Paste Block",
          "- Public live demo: https://prairieclassroom.example.com",
          "- Public video: https://www.youtube.com/watch?v=example",
        ].join("\n"),
        checklist: [
          "# Hackathon Submission Checklist",
          "- Live demo deploy: deployed and smoked from external network and cellular.",
        ].join("\n"),
      });

      const result = validatePublicationPlaceholders({ rootDir });

      assert.deepEqual(result, { ok: true, issues: [] });
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
