import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CURRENT_HOSTED_ATTEMPT_RUN_DIR,
  HOSTED_PROOF_RUN_DIR,
  PROOF_DOC_PATHS,
  extractHostedProofRunDir,
  validateProofSurfaces,
} from "../hackathon-proof.mjs";
import { DEFAULT_GEMINI_MODEL_IDS } from "../gemini-api-preflight.mjs";

const FAILED_HOSTED_ATTEMPT_RUN_DIR = "output/release-gate/2026-05-16T19-20-45-520Z-14783";
const PUBLIC_HOSTED_PROOF_SUMMARY = "docs/evidence/2026-05-17-hosted-gemini-release-summary.json";

function consistentSurfaces({
  artifact = HOSTED_PROOF_RUN_DIR,
  attemptArtifact = null,
  attemptStatus = "failed",
  includeProofBriefLine = true,
  proofBriefLineOverride = null,
} = {}) {
  const sharedClauses = [
    `Hosted Gemini proof lane: passing`,
    `Models: ${DEFAULT_GEMINI_MODEL_IDS.live} and ${DEFAULT_GEMINI_MODEL_IDS.planning}`,
    `Primary rerun command: npm run release:gate:gemini`,
    `Use the hosted lane for synthetic/demo data only.`,
    `The privacy-first future deployment path remains local/self-hosted Gemma 4 via Ollama.`,
    `Artifact reference: ${artifact}`,
  ];
  if (attemptArtifact) {
    if (attemptStatus === "passed") {
      sharedClauses.push(
        `Current hosted refresh passed as a passing baseline: ${attemptArtifact}`,
      );
    } else {
      sharedClauses.push(
        `Current hosted refresh failed and did not produce a passing baseline: ${attemptArtifact}`,
      );
    }
  }

  const proofBriefLines = [...sharedClauses];
  if (proofBriefLineOverride !== null) {
    proofBriefLines.unshift(proofBriefLineOverride);
  } else if (includeProofBriefLine) {
    proofBriefLines.unshift(`- **Latest passing hosted gate:** \`${artifact}\``);
  }
  if (attemptArtifact) {
    proofBriefLines.unshift(`- **Latest attempted hosted gate:** \`${attemptArtifact}\``);
  }

  const sharedContent = sharedClauses.join("\n");
  const proofBriefContent = proofBriefLines.join("\n");
  const publicKaggleContent = [
    sharedContent,
    `Public proof summary: ${PUBLIC_HOSTED_PROOF_SUMMARY}`,
    `Provider proof ledger: docs/eval-baseline.md and docs/hackathon-proof-brief.md`,
  ].join("\n");

  const surfaces = {};
  for (const docPath of PROOF_DOC_PATHS) {
    surfaces[docPath] =
      docPath === "docs/hackathon-proof-brief.md"
        ? proofBriefContent
        : docPath === "docs/kaggle-writeup.md"
          ? publicKaggleContent
          : sharedContent;
  }
  return surfaces;
}

describe("validateProofSurfaces — derives canonical artifact from proof-brief", () => {
  it("passes when every surface references the artifact extracted from the proof-brief line", () => {
    const result = validateProofSurfaces(consistentSurfaces());
    assert.deepEqual(result, { ok: true, issues: [] });
  });

  it("flags the drifting doc when one surface references an older artifact than the proof-brief", () => {
    const surfaces = consistentSurfaces({
      artifact: "output/release-gate/2099-02-02T00-00-00-000Z-99999",
    });
    // README still on the old artifact
    surfaces["README.md"] = surfaces["README.md"].replace(
      "output/release-gate/2099-02-02T00-00-00-000Z-99999",
      HOSTED_PROOF_RUN_DIR,
    );

    const result = validateProofSurfaces(surfaces);
    assert.equal(result.ok, false);
    const joined = result.issues.join("\n");
    assert.match(
      joined,
      /README\.md: missing hosted proof artifact path: output\/release-gate\/2099-02-02T00-00-00-000Z-99999/,
    );
  });

  it("returns a clear issue when the proof-brief has no canonical hosted-gate line", () => {
    const surfaces = consistentSurfaces({ includeProofBriefLine: false });

    const result = validateProofSurfaces(surfaces);
    assert.equal(result.ok, false);
    const joined = result.issues.join("\n");
    assert.match(joined, /docs\/hackathon-proof-brief\.md/);
    assert.match(joined, /could not extract canonical hosted artifact/i);
  });

  it("returns a clear issue when the proof-brief line does not quote an output/release-gate path", () => {
    const surfaces = consistentSurfaces({
      proofBriefLineOverride: "- **Latest passing hosted gate:** `pending-next-refresh`",
    });

    const result = validateProofSurfaces(surfaces);
    assert.equal(result.ok, false);
    const joined = result.issues.join("\n");
    assert.match(joined, /could not extract canonical hosted artifact/i);
  });

  it("passes when surfaces include both last-passing and current-attempt hosted artifacts", () => {
    const result = validateProofSurfaces(
      consistentSurfaces({ attemptArtifact: FAILED_HOSTED_ATTEMPT_RUN_DIR }),
    );
    assert.deepEqual(result, { ok: true, issues: [] });
  });

  it("passes when the latest current attempt is the canonical passing hosted artifact", () => {
    const result = validateProofSurfaces(
      consistentSurfaces({
        attemptArtifact: HOSTED_PROOF_RUN_DIR,
        attemptStatus: "passed",
      }),
    );
    assert.deepEqual(result, { ok: true, issues: [] });
  });

  it("flags docs that omit the current attempted hosted artifact when proof-brief declares one", () => {
    const surfaces = consistentSurfaces({ attemptArtifact: FAILED_HOSTED_ATTEMPT_RUN_DIR });
    surfaces["README.md"] = surfaces["README.md"].replace(FAILED_HOSTED_ATTEMPT_RUN_DIR, "missing-current-attempt");

    const result = validateProofSurfaces(surfaces);
    assert.equal(result.ok, false);
    assert.match(result.issues.join("\n"), /README\.md: missing current hosted attempt artifact path/);
  });

  it("allows the public Kaggle writeup to cite docs/evidence instead of ignored raw output paths", () => {
    const surfaces = consistentSurfaces({ attemptArtifact: HOSTED_PROOF_RUN_DIR, attemptStatus: "passed" });
    surfaces["docs/kaggle-writeup.md"] = [
      `Hosted Gemma 4 proof baseline: passing.`,
      `Models: ${DEFAULT_GEMINI_MODEL_IDS.live} and ${DEFAULT_GEMINI_MODEL_IDS.planning}`,
      `Primary rerun command: npm run release:gate:gemini`,
      `Use the hosted lane for synthetic/demo data only.`,
      `The privacy-first future deployment path remains local/self-hosted Gemma 4 via Ollama.`,
      `Public proof summary: ${PUBLIC_HOSTED_PROOF_SUMMARY}`,
      `Provider proof ledger: docs/eval-baseline.md and docs/hackathon-proof-brief.md`,
    ].join("\n");

    const result = validateProofSurfaces(surfaces);
    assert.deepEqual(result, { ok: true, issues: [] });
  });
});

describe("extractHostedProofRunDir — preferred path matches the real proof-brief format", () => {
  it("returns the proof-brief artifact via the preferred extraction when an earlier PROOF_DOC_PATHS entry references an older path", () => {
    const canonical = "output/release-gate/2099-03-03T00-00-00-000Z-12345";
    const stale = "output/release-gate/2000-01-01T00-00-00-000Z-00001";

    // PROOF_DOC_PATHS[0] is docs/eval-baseline.md — the repo-wide fallback
    // scans PROOF_DOC_PATHS in order and would return the stale artifact
    // unless the preferred extraction for the proof-brief short-circuits
    // first. This test fails when the primary proof-brief regex drifts
    // away from the real `- **Latest passing hosted gate:** \`…\`` format.
    const surfaces = {
      "docs/eval-baseline.md": `**Raw artifacts:** \`${stale}\``,
      "docs/hackathon-proof-brief.md": `- **Latest passing hosted gate:** \`${canonical}\``,
      "docs/hackathon-hosted-operations.md": "(no artifact referenced here)",
      "README.md": "(no artifact referenced here)",
      "docs/kaggle-writeup.md": "(no artifact referenced here)",
    };

    const extracted = extractHostedProofRunDir(surfaces);
    assert.equal(
      extracted,
      canonical,
      "preferred extraction from proof-brief must win over the PROOF_DOC_PATHS-ordered fallback",
    );
  });

  it("prefers the current attempted hosted gate for readycheck when present", () => {
    const surfaces = consistentSurfaces({ attemptArtifact: CURRENT_HOSTED_ATTEMPT_RUN_DIR, attemptStatus: "passed" });

    const extracted = extractHostedProofRunDir(surfaces);
    assert.equal(extracted, CURRENT_HOSTED_ATTEMPT_RUN_DIR);
  });
});
