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
      "- Publication gate: `npm run submission:final-check -- --skip-release-gate` still fails on publication placeholders and required URL validation until the public YouTube URL and Kaggle writeup URL are filled in.",
      "- Public-video script: final local video QA passed for `qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11.mp4` (120.043 seconds, 1920x1080, 30 fps); upload/public YouTube URL still pending.",
      "- **Video:** public YouTube link",
      "- Publish preflight: with Node `v25.8.2` and `.env` exported, `npm run submission:publish-preflight` remains blocked only by the missing public video and Kaggle writeup URLs.",
      "- Live demo deploy: PUBLIC SYNTHETIC DEMO READY. Public video and Kaggle submission URLs are still missing; true cellular-browser smoke is still pending.",
      "13. Run `npm run submission:publish-preflight`; the orchestrator + inference Render services and Vercel `VITE_API_URL` production build now exist, but preflight remains blocked until the public video and Kaggle URLs are real.",
    ].join("\n"),
  );
  await seedFile(
    rootDir,
    "docs/public-demo-operations.md",
    [
      "# Public Demo Operations",
      "- **Not yet complete:** public video URL, Kaggle URL, and true cellular-browser smoke are still pending. Vercel production stores the server-side `PRAIRIE_GEMINI_API_KEY` and `PRAIRIE_ENABLE_GEMINI_RUNS` values as encrypted env vars, but those values are not browser-exposed.",
      "`npm run submission:final-check -- --skip-release-gate` currently remains blocked by the missing public YouTube and Kaggle writeup/submission URLs. The full no-skip submission gate must remain blocked until all final public links are real and reachable.",
      "- In the remaining-work closeout, `source ~/.nvm/nvm.sh && nvm use --silent 25.8.2 && set -a && source .env && set +a && npm run submission:publish-preflight` passed every local, GitHub, Vercel, Render, hosted-Gemma-env, and live-demo check. The only remaining failures were the missing public video URL and missing Kaggle writeup URL.",
      "- With Node `v25.8.2`, `npm run submission:publish-preflight` passes local file checks for `render.yaml`, `apps/web/vercel.json`, final MP4, upstream configuration, Vercel CLI availability, Vercel project link, Render availability, hosted Gemma env checks when `.env` is exported, and public live demo URL. The no-skip publication gate must remain blocked until the public video URL and Kaggle writeup URL are real.",
    ].join("\n"),
  );
}

describe("submission link application", () => {
  it("updates every final publication-link line without clearing pending cellular smoke", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "submission-links-"));
    try {
      await seedSubmissionDocs(rootDir);

      const result = await applySubmissionLinks({
        rootDir,
        videoUrl: "https://www.youtube.com/watch?v=example",
        kaggleUrl: "https://www.kaggle.com/competitions/gemma-4-good/discussion/example",
      });

      assert.equal(result.changes.length, 12);
      const copyPack = await readFile(path.join(rootDir, "docs/submission-copy-pack.md"), "utf8");
      const pasteBlock = await readFile(path.join(rootDir, "docs/kaggle-paste-block.md"), "utf8");
      const checklist = await readFile(path.join(rootDir, "docs/hackathon-submission-checklist.md"), "utf8");
      const operations = await readFile(path.join(rootDir, "docs/public-demo-operations.md"), "utf8");

      assert.match(copyPack, /Kaggle writeup: https:\/\/www\.kaggle\.com\/competitions\/gemma-4-good\/discussion\/example/);
      assert.match(pasteBlock, /Public video: https:\/\/www\.youtube\.com\/watch\?v=example/);
      assert.match(checklist, /sha256 `2fbd0bd1b48ef1aefd7c82f612f9fecdf0dfafd273a80454a26b2bb59b796da6`/);
      assert.match(checklist, /public YouTube URL recorded: https:\/\/www\.youtube\.com\/watch\?v=example\./);
      assert.match(checklist, /\*\*Video:\*\* https:\/\/www\.youtube\.com\/watch\?v=example/);
      assert.match(checklist, /final public links are recorded/);
      assert.match(checklist, /Public video and Kaggle submission URLs are recorded/);
      assert.match(checklist, /true cellular-browser smoke is still pending/);
      assert.match(operations, /Public video URL recorded: https:\/\/www\.youtube\.com\/watch\?v=example/);
      assert.match(operations, /Kaggle URL recorded: https:\/\/www\.kaggle\.com\/competitions\/gemma-4-good\/discussion\/example/);
      assert.match(operations, /true cellular-browser smoke remains pending/);
      assert.match(operations, /verifies publication placeholders, public-link health, and public demo smoke/);

      const validation = validatePublicationPlaceholders({ rootDir });
      assert.equal(validation.ok, false);
      assert.match(validation.issues.join("\n"), /cellular-browser smoke/i);
      assert.match(validation.issues.join("\n"), /Cellular browser smoke evidence is missing/);
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
      assert.equal(result.changes.length, 12);
      assert.equal(after, before);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("can rerun after links are already applied to correct a URL", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "submission-links-rerun-"));
    try {
      await seedSubmissionDocs(rootDir);
      await applySubmissionLinks({
        rootDir,
        videoUrl: "https://www.youtube.com/watch?v=first",
        kaggleUrl: "https://www.kaggle.com/competitions/gemma-4-good/discussion/example",
      });

      const result = await applySubmissionLinks({
        rootDir,
        videoUrl: "https://youtu.be/corrected",
        kaggleUrl: "https://www.kaggle.com/competitions/gemma-4-good/discussion/example",
      });

      const pasteBlock = await readFile(path.join(rootDir, "docs/kaggle-paste-block.md"), "utf8");
      const checklist = await readFile(path.join(rootDir, "docs/hackathon-submission-checklist.md"), "utf8");
      const operations = await readFile(path.join(rootDir, "docs/public-demo-operations.md"), "utf8");

      assert.ok(result.changes.length > 0);
      assert.match(pasteBlock, /Public video: https:\/\/youtu\.be\/corrected/);
      assert.match(checklist, /\*\*Video:\*\* https:\/\/youtu\.be\/corrected/);
      assert.match(operations, /Public video URL recorded: https:\/\/youtu\.be\/corrected/);
      const validation = validatePublicationPlaceholders({ rootDir });
      assert.equal(validation.ok, false);
      assert.match(validation.issues.join("\n"), /cellular-browser smoke/i);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("does not partially update docs when a later required line is missing", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "submission-links-no-partial-"));
    try {
      await seedSubmissionDocs(rootDir);
      await seedFile(
        rootDir,
        "docs/hackathon-submission-checklist.md",
        [
          "# Hackathon Submission Checklist",
          "- Different line: missing the public-video script marker",
        ].join("\n"),
      );
      const copyPackPath = path.join(rootDir, "docs/submission-copy-pack.md");
      const pasteBlockPath = path.join(rootDir, "docs/kaggle-paste-block.md");
      const operationsPath = path.join(rootDir, "docs/public-demo-operations.md");
      const copyPackBefore = await readFile(copyPackPath, "utf8");
      const pasteBlockBefore = await readFile(pasteBlockPath, "utf8");
      const operationsBefore = await readFile(operationsPath, "utf8");

      await assert.rejects(
        () => applySubmissionLinks({
          rootDir,
          videoUrl: "https://youtu.be/example",
          kaggleUrl: "https://www.kaggle.com/competitions/gemma-4-good/discussion/example",
        }),
        /docs\/hackathon-submission-checklist\.md: expected exactly one matching line, found 0/,
      );

      assert.equal(await readFile(copyPackPath, "utf8"), copyPackBefore);
      assert.equal(await readFile(pasteBlockPath, "utf8"), pasteBlockBefore);
      assert.equal(await readFile(operationsPath, "utf8"), operationsBefore);
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
