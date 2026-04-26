import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildProofStatusMarkdown, updateProofStatusDoc } from "../proof-status.mjs";

const ROOT = "/repo";

function mockRun({ mode, status, id, extra = {} }) {
  return {
    inference_mode: mode,
    status,
    run_dir: `output/release-gate/${id}`,
    completed_at: "2099-01-01T00:00:00.000Z",
    ...extra,
  };
}

describe("buildProofStatusMarkdown — hosted Gemini awareness", () => {
  it("includes hosted verdict, commands, and table when a passing hosted run exists", () => {
    const md = buildProofStatusMarkdown({
      rootDir: ROOT,
      preflights: [],
      runSummaries: [
        mockRun({
          mode: "gemini",
          status: "passed",
          id: "HOSTED-ID",
          extra: {
            gemini_model_ids: { live: "gemma-live", planning: "gemma-planning" },
          },
        }),
        mockRun({ mode: "mock", status: "passed", id: "MOCK-ID" }),
      ],
    });

    assert.match(md, /Hosted Gemma 4 proof: Passing on synthetic\/demo data/);
    assert.match(md, /Latest passed hosted Gemini gate: `output\/release-gate\/HOSTED-ID`/);
    assert.match(md, /Latest passed mock gate: `output\/release-gate\/MOCK-ID`/);
    assert.match(md, /mock and Ollama remain the default no-spend lanes/);
    assert.match(md, /npm run gemini:readycheck/);
    assert.match(md, /npm run release:gate:gemini/);
    assert.match(md, /## Hosted Proof/);
    assert.match(md, /\| Gemini API \| `gemma-live`, `gemma-planning` \| Synthetic\/demo only \| `output\/release-gate\/HOSTED-ID` \|/);
  });

  it("omits hosted sections and keeps mock-only wording when no hosted pass exists", () => {
    const md = buildProofStatusMarkdown({
      rootDir: ROOT,
      preflights: [],
      runSummaries: [mockRun({ mode: "mock", status: "passed", id: "MOCK-ID" })],
    });

    assert.doesNotMatch(md, /Hosted Gemma 4 proof/);
    assert.doesNotMatch(md, /Latest passed hosted Gemini gate/);
    assert.doesNotMatch(md, /## Hosted Proof/);
    assert.doesNotMatch(md, /npm run gemini:readycheck/);
    assert.doesNotMatch(md, /npm run release:gate:gemini/);
    assert.match(md, /Live-model proof:/);
    assert.match(md, /mock and Ollama only; no paid fallback recorded/);
    assert.match(md, /Latest passed mock gate: `output\/release-gate\/MOCK-ID`/);
  });

  it("falls back gracefully when a passing hosted run has no model IDs", () => {
    const md = buildProofStatusMarkdown({
      rootDir: ROOT,
      preflights: [],
      runSummaries: [
        mockRun({ mode: "gemini", status: "passed", id: "HOSTED-ID" }),
        mockRun({ mode: "mock", status: "passed", id: "MOCK-ID" }),
      ],
    });

    assert.match(md, /## Hosted Proof/);
    assert.match(md, /\| Gemini API \| _unknown_, _unknown_ \| Synthetic\/demo only \| `output\/release-gate\/HOSTED-ID` \|/);
  });

  it("ignores failed hosted runs when deciding whether to show hosted sections", () => {
    const md = buildProofStatusMarkdown({
      rootDir: ROOT,
      preflights: [],
      runSummaries: [
        mockRun({ mode: "gemini", status: "failed", id: "HOSTED-ID" }),
        mockRun({ mode: "mock", status: "passed", id: "MOCK-ID" }),
      ],
    });

    assert.doesNotMatch(md, /Hosted Gemma 4 proof/);
    assert.doesNotMatch(md, /## Hosted Proof/);
  });
});

describe("updateProofStatusDoc — fixture directory round-trip", () => {
  async function writeSummary(dir, id, summary) {
    const runDir = path.join(dir, "output", "release-gate", id);
    await mkdir(runDir, { recursive: true });
    await writeFile(
      path.join(runDir, "summary.json"),
      JSON.stringify({ ...summary, run_dir: `output/release-gate/${id}` }),
      "utf8",
    );
  }

  it("generates a markdown file with hosted sections when both mock and hosted artifacts exist", async () => {
    const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "proof-status-"));
    try {
      await writeSummary(fixtureRoot, "MOCK-ID", {
        inference_mode: "mock",
        status: "passed",
        completed_at: "2099-01-01T00:00:00.000Z",
      });
      await writeSummary(fixtureRoot, "HOSTED-ID", {
        inference_mode: "gemini",
        status: "passed",
        completed_at: "2099-01-02T00:00:00.000Z",
        gemini_model_ids: { live: "gemma-live", planning: "gemma-planning" },
      });

      const docPath = path.join(fixtureRoot, "docs", "live-model-proof-status.md");
      await updateProofStatusDoc({ rootDir: fixtureRoot, docPath });

      const contents = await readFile(docPath, "utf8");
      assert.match(contents, /Hosted Gemma 4 proof: Passing/);
      assert.match(contents, /Latest passed hosted Gemini gate: `output\/release-gate\/HOSTED-ID`/);
      assert.match(contents, /Latest passed mock gate: `output\/release-gate\/MOCK-ID`/);
      assert.match(contents, /npm run release:gate:gemini/);
      assert.match(contents, /## Hosted Proof/);
      assert.match(contents, /\| Gemini API \| `gemma-live`, `gemma-planning` \| Synthetic\/demo only \| `output\/release-gate\/HOSTED-ID` \|/);
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("generates a mock-only doc when no hosted artifact exists", async () => {
    const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "proof-status-"));
    try {
      await writeSummary(fixtureRoot, "MOCK-ID", {
        inference_mode: "mock",
        status: "passed",
        completed_at: "2099-01-01T00:00:00.000Z",
      });

      const docPath = path.join(fixtureRoot, "docs", "live-model-proof-status.md");
      await updateProofStatusDoc({ rootDir: fixtureRoot, docPath });

      const contents = await readFile(docPath, "utf8");
      assert.doesNotMatch(contents, /## Hosted Proof/);
      assert.doesNotMatch(contents, /npm run release:gate:gemini/);
      assert.match(contents, /mock and Ollama only; no paid fallback recorded/);
      assert.match(contents, /Latest passed mock gate: `output\/release-gate\/MOCK-ID`/);
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
  });
});

describe("updateProofStatusDoc — hosted-proof preservation across regen", () => {
  async function writeSummary(dir, id, summary) {
    const runDir = path.join(dir, "output", "release-gate", id);
    await mkdir(runDir, { recursive: true });
    await writeFile(
      path.join(runDir, "summary.json"),
      JSON.stringify({ ...summary, run_dir: `output/release-gate/${id}` }),
      "utf8",
    );
  }

  async function seedExistingHostedDoc(docPath, { hostedId, mockId, liveModel, planningModel }) {
    const md = buildProofStatusMarkdown({
      rootDir: "/repo",
      preflights: [],
      runSummaries: [
        {
          inference_mode: "gemini",
          status: "passed",
          run_dir: `output/release-gate/${hostedId}`,
          completed_at: "2099-01-02T00:00:00.000Z",
          gemini_model_ids: { live: liveModel, planning: planningModel },
        },
        {
          inference_mode: "mock",
          status: "passed",
          run_dir: `output/release-gate/${mockId}`,
          completed_at: "2099-01-01T00:00:00.000Z",
        },
      ],
    });
    await mkdir(path.dirname(docPath), { recursive: true });
    await writeFile(docPath, `${md}\n`, "utf8");
  }

  it("preserves hosted info from the existing doc when no fresh hosted summary exists", async () => {
    const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "proof-status-preserve-"));
    try {
      const docPath = path.join(fixtureRoot, "docs", "live-model-proof-status.md");
      await seedExistingHostedDoc(docPath, {
        hostedId: "STALE-HOSTED-ID",
        mockId: "OLD-MOCK-ID",
        liveModel: "gemma-live-26b",
        planningModel: "gemma-planning-31b",
      });

      await writeSummary(fixtureRoot, "FRESH-MOCK-ID", {
        inference_mode: "mock",
        status: "passed",
        completed_at: "2099-02-01T00:00:00.000Z",
      });

      await updateProofStatusDoc({ rootDir: fixtureRoot, docPath });
      const contents = await readFile(docPath, "utf8");

      assert.match(contents, /## Hosted Proof/);
      assert.match(contents, /Hosted Gemma 4 proof: Passing/);
      assert.match(contents, /Latest passed hosted Gemini gate: `output\/release-gate\/STALE-HOSTED-ID`/);
      assert.match(
        contents,
        /\| Gemini API \| `gemma-live-26b`, `gemma-planning-31b` \| Synthetic\/demo only \| `output\/release-gate\/STALE-HOSTED-ID` \|/,
      );
      assert.match(contents, /Latest passed mock gate: `output\/release-gate\/FRESH-MOCK-ID`/);
      assert.match(contents, /npm run release:gate:gemini/);
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("regenerates freely when a fresh passing hosted summary is available", async () => {
    const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "proof-status-fresh-"));
    try {
      const docPath = path.join(fixtureRoot, "docs", "live-model-proof-status.md");
      await seedExistingHostedDoc(docPath, {
        hostedId: "STALE-HOSTED-ID",
        mockId: "OLD-MOCK-ID",
        liveModel: "gemma-live-26b",
        planningModel: "gemma-planning-31b",
      });

      await writeSummary(fixtureRoot, "FRESH-HOSTED-ID", {
        inference_mode: "gemini",
        status: "passed",
        completed_at: "2099-03-01T00:00:00.000Z",
        gemini_model_ids: { live: "gemma-live-fresh", planning: "gemma-planning-fresh" },
      });

      await updateProofStatusDoc({ rootDir: fixtureRoot, docPath });
      const contents = await readFile(docPath, "utf8");

      assert.match(contents, /Latest passed hosted Gemini gate: `output\/release-gate\/FRESH-HOSTED-ID`/);
      assert.doesNotMatch(contents, /STALE-HOSTED-ID/);
      assert.match(
        contents,
        /\| Gemini API \| `gemma-live-fresh`, `gemma-planning-fresh` \| Synthetic\/demo only \| `output\/release-gate\/FRESH-HOSTED-ID` \|/,
      );
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("falls through to mock-only doc when no existing doc and no hosted summary", async () => {
    const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "proof-status-clean-"));
    try {
      await writeSummary(fixtureRoot, "FRESH-MOCK-ID", {
        inference_mode: "mock",
        status: "passed",
        completed_at: "2099-02-01T00:00:00.000Z",
      });

      const docPath = path.join(fixtureRoot, "docs", "live-model-proof-status.md");
      await updateProofStatusDoc({ rootDir: fixtureRoot, docPath });
      const contents = await readFile(docPath, "utf8");

      assert.doesNotMatch(contents, /## Hosted Proof/);
      assert.doesNotMatch(contents, /npm run release:gate:gemini/);
      assert.match(contents, /mock and Ollama only; no paid fallback recorded/);
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
  });
});
