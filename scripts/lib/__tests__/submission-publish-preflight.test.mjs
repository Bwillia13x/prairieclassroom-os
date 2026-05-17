import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  collectSubmissionPublishPreflight,
  extractUrlFromLine,
  formatSubmissionPublishPreflight,
  isKaggleUrl,
  isPublicUrl,
  isYouTubeUrl,
} from "../submission-publish-preflight.mjs";

async function seedFile(rootDir, relPath, content = "") {
  const filePath = path.join(rootDir, relPath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

async function seedPublishDocs(rootDir, { finalLinks = false } = {}) {
  await seedFile(
    rootDir,
    "docs/submission-copy-pack.md",
    finalLinks
      ? [
        "# Submission Copy Pack",
        "- Code: https://github.com/Bwillia13x/prairieclassroom-os",
        "- Live demo: https://prairieclassroom.example.com/?demo=true",
        "- Kaggle writeup: https://www.kaggle.com/competitions/gemma-4-good/discussion/example",
      ].join("\n")
      : [
        "# Submission Copy Pack",
        "- Code: https://github.com/Bwillia13x/prairieclassroom-os",
        "- Live demo: [add public deployed URL after deployment]",
        "- Kaggle writeup: [add Kaggle writeup URL after submission]",
      ].join("\n"),
  );
  await seedFile(
    rootDir,
    "docs/kaggle-paste-block.md",
    finalLinks
      ? [
        "# Kaggle Paste Block",
        "- Public live demo: https://prairieclassroom.example.com/?demo=true",
        "- Public video: https://www.youtube.com/watch?v=example",
      ].join("\n")
      : [
        "# Kaggle Paste Block",
        "- Public live demo: add public deployed URL after deployment",
        "- Public video: add public YouTube URL after upload",
      ].join("\n"),
  );
}

async function seedRequiredFiles(rootDir) {
  await seedFile(rootDir, ".nvmrc", "v25.8.2\n");
  await seedFile(rootDir, "render.yaml", "services: []\n");
  await seedFile(rootDir, "apps/web/vercel.json", "{}\n");
  await seedFile(rootDir, "qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11.mp4", "mp4");
  await seedFile(rootDir, "apps/web/.vercel/project.json", "{}\n");
}

function cleanGitRunner(command, args) {
  if (command === "npm" && args.join(" ") === "audit --omit=dev") {
    return { status: 0, stdout: "found 0 vulnerabilities\n", stderr: "" };
  }
  if (command !== "git") return { status: 1, stdout: "", stderr: "unknown command" };
  if (args[0] === "status") return { status: 0, stdout: "", stderr: "" };
  if (args[0] === "rev-parse") return { status: 0, stdout: "origin/main\n", stderr: "" };
  if (args[0] === "rev-list") return { status: 0, stdout: "0\t0\n", stderr: "" };
  return { status: 1, stdout: "", stderr: "unexpected git command" };
}

function dirtyGitRunner(command, args) {
  if (command === "npm" && args.join(" ") === "audit --omit=dev") {
    return { status: 0, stdout: "found 0 vulnerabilities\n", stderr: "" };
  }
  if (command !== "git") return { status: 1, stdout: "", stderr: "unknown command" };
  if (args[0] === "status") return { status: 0, stdout: " M docs/submission-copy-pack.md\n?? scripts/new.mjs\n", stderr: "" };
  if (args[0] === "rev-parse") return { status: 0, stdout: "origin/main\n", stderr: "" };
  if (args[0] === "rev-list") return { status: 0, stdout: "0\t0\n", stderr: "" };
  return { status: 1, stdout: "", stderr: "unexpected git command" };
}

describe("submission publish preflight", () => {
  it("passes when deployment files, tooling, env, and public URLs are present", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "submission-publish-clean-"));
    try {
      await seedRequiredFiles(rootDir);
      await seedPublishDocs(rootDir, { finalLinks: true });

      const results = collectSubmissionPublishPreflight({
        rootDir,
        env: {
          PRAIRIE_GEMINI_API_KEY: "test-key",
          PRAIRIE_ENABLE_GEMINI_RUNS: "true",
          RENDER_API_TOKEN: "render-token",
        },
        commandResolver: (command) => `/usr/local/bin/${command}`,
        commandRunner: cleanGitRunner,
        nodeVersion: "v25.9.0",
      });

      assert.equal(results.every((item) => item.ok), true);
      assert.match(formatSubmissionPublishPreflight(results), /Publish preflight passed/);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("reports the external blockers when credentials and public links are missing", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "submission-publish-blocked-"));
    try {
      await seedPublishDocs(rootDir);

      const results = collectSubmissionPublishPreflight({
        rootDir,
        env: {},
        commandResolver: () => "",
        commandRunner: dirtyGitRunner,
        nodeVersion: "v20.19.5",
      });
      const failedLabels = results.filter((item) => !item.ok).map((item) => item.label);

      assert.ok(failedLabels.includes("node version"));
      assert.ok(failedLabels.includes("git worktree clean"));
      assert.ok(failedLabels.includes("vercel project link"));
      assert.ok(failedLabels.includes("render cli or api token"));
      assert.ok(failedLabels.includes("hosted gemma api key"));
      assert.ok(failedLabels.includes("public live demo url"));
      assert.ok(failedLabels.includes("public video url"));
      assert.ok(failedLabels.includes("kaggle writeup url"));
      assert.match(formatSubmissionPublishPreflight(results), /blockers remain before public publishing/);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("reports unsynced branches before publication", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "submission-publish-unsynced-"));
    try {
      await seedRequiredFiles(rootDir);
      await seedPublishDocs(rootDir, { finalLinks: true });

      const results = collectSubmissionPublishPreflight({
        rootDir,
        env: {
          PRAIRIE_GEMINI_API_KEY: "test-key",
          PRAIRIE_ENABLE_GEMINI_RUNS: "true",
          RENDER_API_TOKEN: "render-token",
        },
        commandResolver: (command) => `/usr/local/bin/${command}`,
        commandRunner: (command, args) => {
          if (command === "npm" && args.join(" ") === "audit --omit=dev") {
            return { status: 0, stdout: "found 0 vulnerabilities\n", stderr: "" };
          }
          if (command !== "git") return { status: 1, stdout: "", stderr: "unknown command" };
          if (args[0] === "status") return { status: 0, stdout: "", stderr: "" };
          if (args[0] === "rev-parse") return { status: 0, stdout: "origin/main\n", stderr: "" };
          if (args[0] === "rev-list") return { status: 0, stdout: "2\t1\n", stderr: "" };
          return { status: 1, stdout: "", stderr: "unexpected git command" };
        },
        nodeVersion: "v25.8.2",
      });

      const branchSync = results.find((item) => item.label === "git branch synced");
      assert.equal(branchSync.ok, false);
      assert.equal(branchSync.detail, "ahead 2, behind 1");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("fails publication preflight when the production dependency audit is not clean", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "submission-publish-audit-"));
    try {
      await seedRequiredFiles(rootDir);
      await seedPublishDocs(rootDir, { finalLinks: true });

      const results = collectSubmissionPublishPreflight({
        rootDir,
        env: {
          PRAIRIE_GEMINI_API_KEY: "test-key",
          PRAIRIE_ENABLE_GEMINI_RUNS: "true",
          RENDER_API_TOKEN: "render-token",
        },
        commandResolver: (command) => `/usr/local/bin/${command}`,
        commandRunner: (command, args) => {
          if (command === "npm" && args.join(" ") === "audit --omit=dev") {
            return { status: 1, stdout: "1 high severity vulnerability\n", stderr: "" };
          }
          return cleanGitRunner(command, args);
        },
        nodeVersion: "v25.8.2",
      });

      const audit = results.find((item) => item.label === "production dependency audit");
      assert.equal(audit.ok, false);
      assert.equal(audit.detail, "1 high severity vulnerability");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("accepts public URLs and rejects local URLs", () => {
    assert.equal(isPublicUrl("https://prairieclassroom.example.com/?demo=true"), true);
    assert.equal(isPublicUrl("http://localhost:5173/?demo=true"), false);
    assert.equal(isPublicUrl("https://demo.local/?demo=true"), false);
  });

  it("requires Kaggle and YouTube domains for final publication links", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "submission-publish-link-domains-"));
    try {
      await seedRequiredFiles(rootDir);
      await seedFile(
        rootDir,
        "docs/submission-copy-pack.md",
        [
          "# Submission Copy Pack",
          "- Code: https://github.com/Bwillia13x/prairieclassroom-os",
          "- Live demo: https://prairieclassroom.example.com/?demo=true",
          "- Kaggle writeup: https://example.com/not-kaggle",
        ].join("\n"),
      );
      await seedFile(
        rootDir,
        "docs/kaggle-paste-block.md",
        [
          "# Kaggle Paste Block",
          "- Public live demo: https://prairieclassroom.example.com/?demo=true",
          "- Public video: https://vimeo.com/example",
        ].join("\n"),
      );

      const results = collectSubmissionPublishPreflight({
        rootDir,
        env: {
          PRAIRIE_GEMINI_API_KEY: "test-key",
          PRAIRIE_ENABLE_GEMINI_RUNS: "true",
          RENDER_API_TOKEN: "render-token",
        },
        commandResolver: (command) => `/usr/local/bin/${command}`,
        commandRunner: cleanGitRunner,
        nodeVersion: "v25.8.2",
      });

      const video = results.find((item) => item.label === "public video url");
      const kaggle = results.find((item) => item.label === "kaggle writeup url");
      assert.equal(video.ok, false);
      assert.equal(kaggle.ok, false);
      assert.equal(video.detail, "https://vimeo.com/example");
      assert.equal(kaggle.detail, "https://example.com/not-kaggle");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("recognizes required publication hostnames", () => {
    assert.equal(isYouTubeUrl("https://www.youtube.com/watch?v=example"), true);
    assert.equal(isYouTubeUrl("https://youtu.be/example"), true);
    assert.equal(isYouTubeUrl("https://vimeo.com/example"), false);
    assert.equal(isKaggleUrl("https://www.kaggle.com/competitions/gemma-4-good/discussion/example"), true);
    assert.equal(isKaggleUrl("https://example.com/not-kaggle"), false);
  });

  it("extracts markdown and bare URLs from labelled lines", () => {
    assert.equal(
      extractUrlFromLine("- Live demo: [PrairieClassroom](https://prairieclassroom.example.com/?demo=true)", /^-\s*Live demo:/i),
      "https://prairieclassroom.example.com/?demo=true",
    );
    assert.equal(
      extractUrlFromLine("- Public video: https://www.youtube.com/watch?v=example.", /^-\s*Public video:/i),
      "https://www.youtube.com/watch?v=example",
    );
  });
});
