import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { validatePublicationPlaceholders } from "../submission-final-check.mjs";
import { applySubmissionLinks, validateSubmissionLinks } from "../submission-links.mjs";

async function seedFile(rootDir, relPath, content) {
  const filePath = path.join(rootDir, relPath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

async function seedSubmissionDocs(rootDir) {
  await seedFile(
    rootDir,
    "docs/submission-copy-pack.md",
    [
      "# Submission Copy Pack",
      "- Code: https://github.com/Bwillia13x/prairieclassroom-os",
      "- Live demo: https://prairieclassroom-os.vercel.app/?demo=true",
      "- Kaggle writeup: [add Kaggle writeup URL after submission]",
    ].join("\n"),
  );
  await seedFile(
    rootDir,
    "docs/kaggle-paste-block.md",
    [
      "# Kaggle Paste Block",
      "- Public code repository: https://github.com/Bwillia13x/prairieclassroom-os",
      "- Public live demo: https://prairieclassroom-os.vercel.app/?demo=true",
      "- Public video: add public YouTube URL after upload",
    ].join("\n"),
  );
  await seedFile(
    rootDir,
    "docs/hackathon-submission-checklist.md",
    [
      "# Hackathon Submission Checklist",
      "- Public-video script: final local video QA passed for `qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11.mp4` (120.043 seconds, 1920x1080, 30 fps); upload/public YouTube URL still pending.",
    ].join("\n"),
  );
}

describe("submission link application", () => {
  it("updates every final publication-link line and clears placeholder validation", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "submission-links-"));
    try {
      await seedSubmissionDocs(rootDir);

      const result = await applySubmissionLinks({
        rootDir,
        videoUrl: "https://www.youtube.com/watch?v=example",
        kaggleUrl: "https://www.kaggle.com/competitions/gemma-4-good/discussion/example",
      });

      assert.equal(result.changes.length, 3);
      const copyPack = await readFile(path.join(rootDir, "docs/submission-copy-pack.md"), "utf8");
      const pasteBlock = await readFile(path.join(rootDir, "docs/kaggle-paste-block.md"), "utf8");
      const checklist = await readFile(path.join(rootDir, "docs/hackathon-submission-checklist.md"), "utf8");

      assert.match(copyPack, /Kaggle writeup: https:\/\/www\.kaggle\.com\/competitions\/gemma-4-good\/discussion\/example/);
      assert.match(pasteBlock, /Public video: https:\/\/www\.youtube\.com\/watch\?v=example/);
      assert.match(checklist, /public YouTube URL recorded: https:\/\/www\.youtube\.com\/watch\?v=example\./);

      const validation = validatePublicationPlaceholders({ rootDir });
      assert.equal(validation.ok, true);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("supports dry-run without changing files", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "submission-links-dry-run-"));
    try {
      await seedSubmissionDocs(rootDir);
      const before = await readFile(path.join(rootDir, "docs/kaggle-paste-block.md"), "utf8");

      const result = await applySubmissionLinks({
        rootDir,
        dryRun: true,
        videoUrl: "https://youtu.be/example",
        kaggleUrl: "https://www.kaggle.com/competitions/gemma-4-good/discussion/example",
      });

      const after = await readFile(path.join(rootDir, "docs/kaggle-paste-block.md"), "utf8");
      assert.equal(result.changes.length, 3);
      assert.equal(after, before);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("rejects missing or wrong-domain final links", () => {
    assert.deepEqual(validateSubmissionLinks({}), [
      "Missing --video-url",
      "Missing --kaggle-url",
    ]);
    assert.deepEqual(
      validateSubmissionLinks({
        videoUrl: "https://vimeo.com/example",
        kaggleUrl: "https://example.com/not-kaggle",
      }),
      [
        "--video-url must be a public YouTube/youtu.be URL: https://vimeo.com/example",
        "--kaggle-url must be a public kaggle.com URL: https://example.com/not-kaggle",
      ],
    );
  });
});
