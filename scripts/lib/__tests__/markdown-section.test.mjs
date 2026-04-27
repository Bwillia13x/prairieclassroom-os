import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractMarkdownSection,
  isBlockedHostedSection,
  parseHostedPassFromProofStatusDoc,
} from "../markdown-section.mjs";

describe("extractMarkdownSection", () => {
  it("returns the section between a `## Heading` line and the next `## ` heading", () => {
    const md = [
      "# Title",
      "",
      "intro",
      "",
      "## Alpha",
      "",
      "alpha body",
      "",
      "## Beta",
      "",
      "beta body",
    ].join("\n");
    assert.equal(extractMarkdownSection(md, "Alpha"), "## Alpha\n\nalpha body");
  });

  it("includes ### subheadings inside the matched section", () => {
    const md = [
      "## Outer",
      "",
      "outer line",
      "",
      "### Inner",
      "",
      "inner line",
      "",
      "## Next",
      "next line",
    ].join("\n");
    assert.equal(
      extractMarkdownSection(md, "Outer"),
      "## Outer\n\nouter line\n\n### Inner\n\ninner line",
    );
  });

  it("returns the trailing section when there is no following `## ` heading", () => {
    const md = ["intro", "", "## Only", "", "only body"].join("\n");
    assert.equal(extractMarkdownSection(md, "Only"), "## Only\n\nonly body");
  });

  it("returns null when the heading is missing", () => {
    assert.equal(extractMarkdownSection("## Other\n\nbody", "Missing"), null);
  });

  it("returns null for non-string inputs", () => {
    assert.equal(extractMarkdownSection(null, "Alpha"), null);
    assert.equal(extractMarkdownSection("## Alpha\nbody", null), null);
  });
});

describe("isBlockedHostedSection", () => {
  it("returns true when the section is a Blocked status block", () => {
    const md = "## Hosted Gemini API Baseline\n\n**Status:** Blocked before evals — Gemini API preflight failed.";
    assert.equal(isBlockedHostedSection(md), true);
  });

  it("returns false when the section is a Passing status block", () => {
    const md = "## Hosted Gemini API Baseline\n\n**Status:** Passing baseline — 13/13 evals passed.";
    assert.equal(isBlockedHostedSection(md), false);
  });

  it("returns false for empty or non-string inputs", () => {
    assert.equal(isBlockedHostedSection(null), false);
    assert.equal(isBlockedHostedSection(""), false);
    assert.equal(isBlockedHostedSection(undefined), false);
  });
});

describe("parseHostedPassFromProofStatusDoc", () => {
  it("extracts run_dir and model ids from a passing hosted proof doc", () => {
    const md = [
      "## Verdict",
      "",
      "- Hosted Gemma 4 proof: Passing on synthetic/demo data through the guarded Gemini lane.",
      "- Latest passed hosted Gemini gate: `output/release-gate/HOSTED-ID-1234`",
      "",
      "## Hosted Proof",
      "",
      "| Provider | Models | Scope | Artifact |",
      "| --- | --- | --- | --- |",
      "| Gemini API | `gemma-live-26b`, `gemma-planning-31b` | Synthetic/demo only | `output/release-gate/HOSTED-ID-1234` |",
    ].join("\n");
    const result = parseHostedPassFromProofStatusDoc(md);
    assert.deepEqual(result, {
      inference_mode: "gemini",
      status: "passed",
      run_dir: "output/release-gate/HOSTED-ID-1234",
      gemini_model_ids: { live: "gemma-live-26b", planning: "gemma-planning-31b" },
      completed_at: null,
      generated_at: null,
      host: null,
    });
  });

  it("returns null when the doc has no hosted info", () => {
    const md = [
      "## Verdict",
      "",
      "- Live-model proof: Blocked pending a viable zero-cost Ollama host.",
      "- Latest passed mock gate: `output/release-gate/MOCK-ID`",
    ].join("\n");
    assert.equal(parseHostedPassFromProofStatusDoc(md), null);
  });

  it("returns null when the doc has the artifact line but no hosted-proof table row", () => {
    const md = "- Latest passed hosted Gemini gate: `output/release-gate/HOSTED-ID`\n";
    assert.equal(parseHostedPassFromProofStatusDoc(md), null);
  });

  it("returns null for non-string inputs", () => {
    assert.equal(parseHostedPassFromProofStatusDoc(null), null);
    assert.equal(parseHostedPassFromProofStatusDoc(undefined), null);
  });
});
