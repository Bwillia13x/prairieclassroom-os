import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  findPublicationLinkHealthIssues,
  findPublicationLinkIssues,
  findPublicationPlaceholders,
  validatePublicationPlaceholders,
  validatePublicationReadiness,
} from "../submission-final-check.mjs";

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
  await seedFile(
    rootDir,
    "docs/public-demo-operations.md",
    overrides.publicDemo ?? [
      "# Public Demo Operations",
      "- **Not yet complete:** public video URL, Kaggle URL, and true cellular-browser smoke are still pending.",
      "`npm run submission:final-check -- --skip-release-gate` currently remains blocked by the missing public YouTube and Kaggle writeup/submission URLs.",
    ].join("\n"),
  );
}

async function seedCleanSubmissionDocs(rootDir) {
  await seedSubmissionDocs(rootDir, {
    copyPack: [
      "# Submission Copy Pack",
      "- Code: https://github.com/Bwillia13x/prairieclassroom-os (public clone verified)",
      "- Live demo: https://prairieclassroom.example.com",
      "- Kaggle writeup: https://www.kaggle.com/competitions/gemma-4-good/discussion/example",
    ].join("\n"),
    pasteBlock: [
      "# Kaggle Paste Block",
      "- Public code repository: https://github.com/Bwillia13x/prairieclassroom-os",
      "- Public live demo: https://prairieclassroom.example.com",
      "- Public video: https://www.youtube.com/watch?v=example",
    ].join("\n"),
    checklist: [
      "# Hackathon Submission Checklist",
      "- Live demo deploy: True cellular-browser smoke verified on iPhone 14; via TELUS LTE; using Safari; at 2026-05-17 10:45 MDT; screenshots: qa/cellular/2026-05-17/; notes: Today, Prep, Review, reload, and static generation passed.",
    ].join("\n"),
    publicDemo: [
      "# Public Demo Operations",
      "- **Verified:** public video, Kaggle writeup, and public demo checks are recorded.",
    ].join("\n"),
  });
}

describe("findPublicationPlaceholders", () => {
  it("reports unresolved public-link and clone-test placeholders", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "submission-final-check-"));
    try {
      await seedSubmissionDocs(rootDir);

      const issues = findPublicationPlaceholders({ rootDir });

      assert.equal(issues.length, 8);
      assert.match(issues.join("\n"), /docs\/submission-copy-pack\.md:2/);
      assert.match(issues.join("\n"), /docs\/submission-copy-pack\.md:3/);
      assert.match(issues.join("\n"), /docs\/submission-copy-pack\.md:4/);
      assert.match(issues.join("\n"), /docs\/kaggle-paste-block\.md:2/);
      assert.match(issues.join("\n"), /docs\/kaggle-paste-block\.md:3/);
      assert.match(issues.join("\n"), /docs\/hackathon-submission-checklist\.md:2/);
      assert.match(issues.join("\n"), /docs\/public-demo-operations\.md:2/);
      assert.match(issues.join("\n"), /docs\/public-demo-operations\.md:3/);
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
        publicDemo: "# Public Demo Operations\nAll links verified.",
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
  it("fails when placeholder text is gone but required public URLs are weak or missing", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "submission-final-check-links-"));
    try {
      await seedSubmissionDocs(rootDir, {
        copyPack: [
          "# Submission Copy Pack",
          "- Code: https://github.com/Bwillia13x/prairieclassroom-os",
          "- Live demo: ready after deploy",
          "- Kaggle writeup: https://example.com/writeup",
        ].join("\n"),
        pasteBlock: [
          "# Kaggle Paste Block",
          "- Public code repository: https://github.com/Bwillia13x/prairieclassroom-os",
          "- Public live demo: http://localhost:5173/?demo=true",
          "- Public video: https://github.com/Bwillia13x/prairieclassroom-os/releases/tag/submission-video",
        ].join("\n"),
        checklist: [
          "# Hackathon Submission Checklist",
          "- Live demo deploy: True cellular-browser smoke verified on iPhone 14; via TELUS LTE; using Safari; at 2026-05-17 10:45 MDT; screenshots: qa/cellular/2026-05-17/; notes: Today, Prep, Review, reload, and static generation passed.",
        ].join("\n"),
      });

      const issues = findPublicationLinkIssues({ rootDir });

      assert.equal(issues.length, 4);
      assert.match(issues.join("\n"), /Live demo must include public non-local live demo URL/);
      assert.match(issues.join("\n"), /Kaggle writeup must include public Kaggle writeup URL/);
      assert.match(issues.join("\n"), /Public live demo must include public non-local live demo URL/);
      assert.match(issues.join("\n"), /Public video must include public YouTube video URL/);
      assert.equal(validatePublicationPlaceholders({ rootDir }).ok, false);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("passes once submission-facing docs contain final public links and verification text", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "submission-final-check-clean-"));
    try {
      await seedCleanSubmissionDocs(rootDir);

      const result = validatePublicationPlaceholders({ rootDir });

      assert.deepEqual(result, { ok: true, issues: [] });
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("fails when public links are present but cellular smoke remains pending", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "submission-final-check-cellular-"));
    try {
      await seedSubmissionDocs(rootDir, {
        copyPack: [
          "# Submission Copy Pack",
          "- Code: https://github.com/Bwillia13x/prairieclassroom-os",
          "- Live demo: https://prairieclassroom.example.com",
          "- Kaggle writeup: https://www.kaggle.com/competitions/gemma-4-good/discussion/example",
        ].join("\n"),
        pasteBlock: [
          "# Kaggle Paste Block",
          "- Public code repository: https://github.com/Bwillia13x/prairieclassroom-os",
          "- Public live demo: https://prairieclassroom.example.com",
          "- Public video: https://www.youtube.com/watch?v=example",
        ].join("\n"),
        checklist: [
          "# Hackathon Submission Checklist",
          "- Live demo deploy: PUBLIC SYNTHETIC DEMO READY. Public video and Kaggle submission URLs are recorded; true cellular-browser smoke is still pending.",
        ].join("\n"),
        publicDemo: [
          "# Public Demo Operations",
          "- **Not yet complete:** true cellular-browser smoke remains pending. Public video URL recorded: https://www.youtube.com/watch?v=example; Kaggle URL recorded: https://www.kaggle.com/competitions/gemma-4-good/discussion/example.",
        ].join("\n"),
      });

      const result = validatePublicationPlaceholders({ rootDir });

      assert.equal(result.ok, false);
      assert.match(result.issues.join("\n"), /true cellular-browser smoke is still pending/);
      assert.match(result.issues.join("\n"), /Cellular browser smoke evidence is missing/);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("fails when cellular smoke wording lacks screenshots and notes", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "submission-final-check-weak-cellular-"));
    try {
      await seedSubmissionDocs(rootDir, {
        copyPack: [
          "# Submission Copy Pack",
          "- Code: https://github.com/Bwillia13x/prairieclassroom-os",
          "- Live demo: https://prairieclassroom.example.com",
          "- Kaggle writeup: https://www.kaggle.com/competitions/gemma-4-good/discussion/example",
        ].join("\n"),
        pasteBlock: [
          "# Kaggle Paste Block",
          "- Public code repository: https://github.com/Bwillia13x/prairieclassroom-os",
          "- Public live demo: https://prairieclassroom.example.com",
          "- Public video: https://www.youtube.com/watch?v=example",
        ].join("\n"),
        checklist: [
          "# Hackathon Submission Checklist",
          "- Live demo deploy: deployed and smoked from external network and cellular.",
        ].join("\n"),
        publicDemo: [
          "# Public Demo Operations",
          "- **Verified:** public video, Kaggle writeup, and public demo checks are recorded.",
        ].join("\n"),
      });

      const result = validatePublicationPlaceholders({ rootDir });

      assert.equal(result.ok, false);
      assert.match(result.issues.join("\n"), /Cellular browser smoke evidence is missing/);
      assert.match(result.issues.join("\n"), /screenshots and notes/);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("passes public-link health checks when required URLs respond", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "submission-final-check-health-"));
    const calls = [];
    try {
      await seedCleanSubmissionDocs(rootDir);

      const result = await validatePublicationReadiness({
        rootDir,
        fetchImpl: async (url, options) => {
          calls.push([url, options.method]);
          return { ok: true, status: 200 };
        },
      });

      assert.deepEqual(result, { ok: true, issues: [] });
      assert.equal(calls.length, 4);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("reports public-link health failures after static publication checks pass", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "submission-final-check-health-fail-"));
    try {
      await seedCleanSubmissionDocs(rootDir);

      const issues = await findPublicationLinkHealthIssues({
        rootDir,
        fetchImpl: async (url) => {
          if (url.includes("youtube.com")) return { ok: false, status: 404 };
          return { ok: true, status: 200 };
        },
      });

      assert.equal(issues.length, 1);
      assert.match(issues[0], /Public video URL returned HTTP 404/);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
