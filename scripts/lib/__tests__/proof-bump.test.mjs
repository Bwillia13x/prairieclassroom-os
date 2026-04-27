import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  FAN_OUT_FILES,
  bumpCanonicalArtifact,
  dateFromArtifactId,
  findLatestPassedHostedRunDir,
  isValidArtifactId,
  readCurrentCanonicalArtifactId,
} from "../proof-bump.mjs";

const OLD_ID = "2026-04-25T17-52-51-834Z-9428";
const NEW_ID = "2026-04-27T01-26-45-190Z-87424";

async function seedFile(rootDir, relPath, content) {
  const filePath = path.join(rootDir, relPath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
  return filePath;
}

async function seedFanOut(rootDir, artifactId) {
  const date = dateFromArtifactId(artifactId);
  for (const relPath of FAN_OUT_FILES) {
    const content = [
      `# ${relPath}`,
      "",
      `Latest passing hosted gate: \`output/release-gate/${artifactId}\``,
      `Eval summary: \`output/evals/${date}-gemini/${artifactId}-gemini-summary.json\``,
    ].join("\n");
    await seedFile(rootDir, relPath, content);
  }
}

async function seedReleaseGateRun(rootDir, runId, summary) {
  const runDir = path.join(rootDir, "output", "release-gate", runId);
  await mkdir(runDir, { recursive: true });
  await writeFile(
    path.join(runDir, "summary.json"),
    JSON.stringify({ ...summary, run_dir: `output/release-gate/${runId}` }),
    "utf8",
  );
}

describe("isValidArtifactId", () => {
  it("accepts the canonical release-gate artifact format", () => {
    assert.equal(isValidArtifactId("2026-04-27T01-26-45-190Z-87424"), true);
  });

  it("rejects malformed inputs", () => {
    assert.equal(isValidArtifactId(""), false);
    assert.equal(isValidArtifactId("not-an-id"), false);
    assert.equal(isValidArtifactId("2026-04-26"), false);
    assert.equal(isValidArtifactId("output/release-gate/2026-04-27T01-26-45-190Z-87424"), false);
    assert.equal(isValidArtifactId(null), false);
    assert.equal(isValidArtifactId(undefined), false);
  });
});

describe("dateFromArtifactId", () => {
  it("extracts the YYYY-MM-DD date prefix", () => {
    assert.equal(dateFromArtifactId(NEW_ID), "2026-04-27");
  });

  it("returns null for malformed inputs", () => {
    assert.equal(dateFromArtifactId("not-an-id"), null);
  });
});

describe("readCurrentCanonicalArtifactId", () => {
  it("extracts the canonical artifact id from the proof-brief", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "proof-bump-read-"));
    try {
      await seedFile(
        rootDir,
        "docs/hackathon-proof-brief.md",
        `- **Latest passing hosted gate:** \`output/release-gate/${NEW_ID}\``,
      );
      const result = await readCurrentCanonicalArtifactId(rootDir);
      assert.equal(result, NEW_ID);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("returns null when the proof-brief is missing", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "proof-bump-missing-"));
    try {
      const result = await readCurrentCanonicalArtifactId(rootDir);
      assert.equal(result, null);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("returns null when the proof-brief lacks the canonical line", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "proof-bump-blank-"));
    try {
      await seedFile(rootDir, "docs/hackathon-proof-brief.md", "(no canonical line yet)");
      const result = await readCurrentCanonicalArtifactId(rootDir);
      assert.equal(result, null);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});

describe("bumpCanonicalArtifact", () => {
  it("updates artifact id and date-folder paths across every fan-out surface", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "proof-bump-fanout-"));
    try {
      await seedFanOut(rootDir, OLD_ID);
      const { touched, skipped } = await bumpCanonicalArtifact({
        rootDir,
        oldArtifactId: OLD_ID,
        newArtifactId: NEW_ID,
      });
      assert.equal(touched.length, FAN_OUT_FILES.length, "every seeded surface should update");
      assert.deepEqual(skipped, []);

      for (const relPath of FAN_OUT_FILES) {
        const content = await readFile(path.join(rootDir, relPath), "utf8");
        assert.match(content, new RegExp(NEW_ID), `${relPath} should contain new id`);
        assert.doesNotMatch(content, new RegExp(OLD_ID), `${relPath} should not contain old id`);
        assert.match(content, /2026-04-27-gemini/, `${relPath} should contain new date folder`);
        assert.doesNotMatch(content, /2026-04-25-gemini/, `${relPath} should not contain old date folder`);
      }
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("is a no-op when old equals new", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "proof-bump-noop-"));
    try {
      await seedFanOut(rootDir, NEW_ID);
      const { touched, skipped } = await bumpCanonicalArtifact({
        rootDir,
        oldArtifactId: NEW_ID,
        newArtifactId: NEW_ID,
      });
      assert.deepEqual(touched, []);
      assert.deepEqual(skipped, FAN_OUT_FILES);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("skips files that don't contain the old id (e.g. file present but not referencing it)", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "proof-bump-mixed-"));
    try {
      const expectedTouched = ["README.md"];
      await seedFile(
        rootDir,
        "README.md",
        `Latest passing hosted gate: \`output/release-gate/${OLD_ID}\``,
      );
      await seedFile(rootDir, "docs/demo-script.md", "(no artifact reference here)");
      const { touched, skipped } = await bumpCanonicalArtifact({
        rootDir,
        oldArtifactId: OLD_ID,
        newArtifactId: NEW_ID,
        files: ["README.md", "docs/demo-script.md"],
      });
      assert.deepEqual(touched, expectedTouched);
      assert.deepEqual(skipped, ["docs/demo-script.md"]);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("rejects malformed artifact ids", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "proof-bump-bad-"));
    try {
      await assert.rejects(
        bumpCanonicalArtifact({ rootDir, oldArtifactId: "bogus", newArtifactId: NEW_ID }),
        /Invalid old artifact id/,
      );
      await assert.rejects(
        bumpCanonicalArtifact({ rootDir, oldArtifactId: OLD_ID, newArtifactId: "bogus" }),
        /Invalid new artifact id/,
      );
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("preserves the same-date case (date-folder rename suppressed when identical)", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "proof-bump-sameday-"));
    try {
      const sameDayOld = "2026-04-26T08-00-00-000Z-11111";
      const sameDayNew = "2026-04-26T18-00-00-000Z-22222";
      await seedFile(
        rootDir,
        "README.md",
        [
          `output/release-gate/${sameDayOld}`,
          "output/evals/2026-04-26-gemini/something.json",
        ].join("\n"),
      );
      const { touched } = await bumpCanonicalArtifact({
        rootDir,
        oldArtifactId: sameDayOld,
        newArtifactId: sameDayNew,
        files: ["README.md"],
      });
      assert.deepEqual(touched, ["README.md"]);
      const content = await readFile(path.join(rootDir, "README.md"), "utf8");
      assert.match(content, new RegExp(sameDayNew));
      assert.match(content, /2026-04-26-gemini/);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});

describe("findLatestPassedHostedRunDir", () => {
  it("returns the most recent passing gemini gate", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "proof-bump-find-"));
    try {
      await seedReleaseGateRun(rootDir, "2026-04-26T08-00-00-000Z-11111", {
        inference_mode: "gemini",
        status: "passed",
      });
      await seedReleaseGateRun(rootDir, "2026-04-26T18-00-00-000Z-22222", {
        inference_mode: "gemini",
        status: "passed",
      });
      await seedReleaseGateRun(rootDir, "2026-04-26T19-00-00-000Z-33333", {
        inference_mode: "gemini",
        status: "failed",
      });
      await seedReleaseGateRun(rootDir, "2026-04-26T20-00-00-000Z-44444", {
        inference_mode: "mock",
        status: "passed",
      });
      const result = await findLatestPassedHostedRunDir(rootDir);
      assert.equal(result, "2026-04-26T18-00-00-000Z-22222");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("returns null when no passing hosted gate exists", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "proof-bump-empty-"));
    try {
      await seedReleaseGateRun(rootDir, "2026-04-26T19-00-00-000Z-33333", {
        inference_mode: "gemini",
        status: "failed",
      });
      const result = await findLatestPassedHostedRunDir(rootDir);
      assert.equal(result, null);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("returns null when output/release-gate/ does not exist", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "proof-bump-nogate-"));
    try {
      const result = await findLatestPassedHostedRunDir(rootDir);
      assert.equal(result, null);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
