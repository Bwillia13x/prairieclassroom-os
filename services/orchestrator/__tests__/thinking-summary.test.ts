import { beforeEach, describe, expect, it, vi } from "vitest";
import { maybeExposeThinkingSummary } from "../thinking-summary.js";

describe("maybeExposeThinkingSummary", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("hides model reasoning by default", () => {
    expect(maybeExposeThinkingSummary("internal reasoning")).toBeNull();
  });

  it("exposes model reasoning when PRAIRIE_DEBUG_PROMPTS is enabled", () => {
    vi.stubEnv("PRAIRIE_DEBUG_PROMPTS", "true");
    expect(maybeExposeThinkingSummary("internal reasoning")).toBe("internal reasoning");
  });
});
