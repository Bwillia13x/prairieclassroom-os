import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  nodeMajorFromVersion,
  nodeMajorVersionMatches,
  parseReleaseGateArgs,
  releaseGateCommandForMode,
} from "../release-gate-helpers.mjs";

describe("release-gate helper parsing", () => {
  it("keeps the default release gate in mock mode", () => {
    assert.deepEqual(parseReleaseGateArgs([]), {
      inferenceMode: "mock",
      updateBaseline: false,
    });
    assert.equal(releaseGateCommandForMode("mock"), "release:gate");
  });
});

describe("nodeMajorVersionMatches", () => {
  it("allows minor and patch drift within the .nvmrc major", () => {
    assert.equal(nodeMajorVersionMatches("v25.8.2", "v25.9.0"), true);
    assert.equal(nodeMajorVersionMatches("v25.8.2", "25.8.3"), true);
  });

  it("rejects Node major drift", () => {
    assert.equal(nodeMajorVersionMatches("v25.8.2", "v26.0.0"), false);
    assert.equal(nodeMajorVersionMatches("v25.8.2", "v24.11.0"), false);
  });

  it("normalizes Node versions with or without a leading v", () => {
    assert.equal(nodeMajorFromVersion("v25.8.2"), "25");
    assert.equal(nodeMajorFromVersion("25.9.0"), "25");
  });
});
