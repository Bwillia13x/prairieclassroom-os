import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  applyCellularSmokeEvidence,
  validateCellularSmokeEvidence,
} from "../submission-cellular-smoke.mjs";
import { validatePublicationPlaceholders } from "../submission-final-check.mjs";
import { applySubmissionLinks } from "../submission-links.mjs";

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
      "- Publish preflight: with Node `v25.8.2` and `.env` exported, `npm run submission:publish-preflight` remains blocked by the missing public video and Kaggle writeup URLs.",
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
      "`npm run submission:final-check -- --skip-release-gate` currently remains blocked by the missing public YouTube URL, missing Kaggle writeup/submission URL, and missing true cellular-browser smoke evidence.",
      "- In the remaining-work closeout, `source ~/.nvm/nvm.sh && nvm use --silent 25.8.2 && set -a && source .env && set +a && npm run submission:publish-preflight` passed every local, GitHub, Vercel, Render, hosted-Gemma-env, and live-demo check.",
      "- With Node `v25.8.2`, `npm run submission:publish-preflight` passes local file checks for `render.yaml`, `apps/web/vercel.json`, final MP4, upstream configuration, Vercel CLI availability, Vercel project link, Render availability, hosted Gemma env checks when `.env` is exported, and public live demo URL.",
    ].join("\n"),
  );
}

function cellularEvidence() {
  return {
    checkedAt: "2026-05-17 10:45 MDT",
    device: "iPhone 14",
    browser: "Safari",
    carrier: "TELUS LTE",
    screenshots: "qa/cellular/2026-05-17/",
    notes: "Today, Prep, Review, reload, and static generation passed",
    result: "pass",
  };
}

describe("cellular smoke evidence application", () => {
  it("rejects missing or failed cellular evidence", () => {
    assert.deepEqual(validateCellularSmokeEvidence({}), [
      "Missing --checked-at",
      "Missing --device",
      "Missing --browser",
      "Missing --carrier",
      "Missing --result",
    ]);
    assert.deepEqual(
      validateCellularSmokeEvidence({
        checkedAt: "2026-05-17 10:45 MDT",
        device: "iPhone",
        browser: "Safari",
        carrier: "TELUS LTE",
        result: "fail",
      }),
      ["--result must be pass/passed to close cellular smoke evidence: fail"],
    );
  });

  it("records cellular proof without clearing missing public links", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "submission-cellular-"));
    try {
      await seedSubmissionDocs(rootDir);

      const result = await applyCellularSmokeEvidence({
        rootDir,
        ...cellularEvidence(),
      });

      assert.equal(result.changes.length, 2);
      const checklist = await readFile(path.join(rootDir, "docs/hackathon-submission-checklist.md"), "utf8");
      const operations = await readFile(path.join(rootDir, "docs/public-demo-operations.md"), "utf8");
      assert.match(checklist, /True cellular-browser smoke verified on iPhone 14; via TELUS LTE; using Safari; at 2026-05-17 10:45 MDT/);
      assert.match(operations, /public video URL and Kaggle URL remain pending/);
      assert.doesNotMatch(operations, /true cellular-browser smoke (is still|remains) pending/i);

      const validation = validatePublicationPlaceholders({ rootDir });
      assert.equal(validation.ok, false);
      assert.doesNotMatch(validation.issues.join("\n"), /Cellular browser smoke evidence is missing/);
      assert.match(validation.issues.join("\n"), /Public video must include public YouTube video URL/);
      assert.match(validation.issues.join("\n"), /Kaggle writeup must include public Kaggle writeup URL/);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("supports either order with final public link application", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "submission-cellular-links-"));
    try {
      await seedSubmissionDocs(rootDir);
      await applyCellularSmokeEvidence({
        rootDir,
        ...cellularEvidence(),
      });
      await applySubmissionLinks({
        rootDir,
        videoUrl: "https://www.youtube.com/watch?v=example",
        kaggleUrl: "https://www.kaggle.com/competitions/gemma-4-good/discussion/example",
      });

      assert.deepEqual(validatePublicationPlaceholders({ rootDir }), { ok: true, issues: [] });

      await applyCellularSmokeEvidence({
        rootDir,
        ...cellularEvidence(),
        checkedAt: "2026-05-17 11:10 MDT",
      });

      const operations = await readFile(path.join(rootDir, "docs/public-demo-operations.md"), "utf8");
      assert.match(operations, /\*\*Verified:\*\* public video URL, Kaggle URL, and true cellular-browser smoke are recorded/);
      assert.match(operations, /at 2026-05-17 11:10 MDT/);
      assert.deepEqual(validatePublicationPlaceholders({ rootDir }), { ok: true, issues: [] });
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("keeps cellular evidence when public links are applied first", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "submission-links-cellular-"));
    try {
      await seedSubmissionDocs(rootDir);
      await applySubmissionLinks({
        rootDir,
        videoUrl: "https://youtu.be/example",
        kaggleUrl: "https://www.kaggle.com/competitions/gemma-4-good/discussion/example",
      });
      await applyCellularSmokeEvidence({
        rootDir,
        ...cellularEvidence(),
      });

      assert.deepEqual(validatePublicationPlaceholders({ rootDir }), { ok: true, issues: [] });
      const checklist = await readFile(path.join(rootDir, "docs/hackathon-submission-checklist.md"), "utf8");
      assert.match(checklist, /Public video and Kaggle submission URLs are recorded; True cellular-browser smoke verified/);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
