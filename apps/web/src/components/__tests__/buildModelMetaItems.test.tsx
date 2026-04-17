import { describe, expect, it } from "vitest";
import { buildModelMetaItems } from "../buildModelMetaItems";

describe("buildModelMetaItems", () => {
  it("renders all three chips when full inference meta is present", () => {
    const items = buildModelMetaItems({
      model_id: "gemma-4-26b-a4b-it",
      latency_ms: 1240,
      total_tokens: 1820,
    });

    expect(items.map((item) => item.label)).toEqual([
      "Gemma 4 · live",
      "1.2 s",
      "1.8k tokens",
    ]);
  });

  it("formats sub-second latency in milliseconds and small token counts as integers", () => {
    const items = buildModelMetaItems({
      model_id: "gemma4:4b",
      latency_ms: 412,
      total_tokens: 480,
    });

    expect(items.map((item) => item.label)).toEqual([
      "Gemma 4 · live",
      "412 ms",
      "480 tokens",
    ]);
  });

  it("maps planning-tier model IDs to the planning label", () => {
    const items = buildModelMetaItems({
      model_id: "gemma-4-31b-it",
      latency_ms: 8400,
      total_tokens: 4200,
    });

    expect(items[0].label).toBe("Gemma 4 · planning");
    expect(items[1].label).toBe("8.4 s");
    expect(items[2].label).toBe("4.2k tokens");
  });

  it("suppresses unknown model_id and zero latency", () => {
    const items = buildModelMetaItems({
      model_id: "unknown",
      latency_ms: 0,
      total_tokens: null,
    });

    expect(items).toEqual([]);
  });

  it("omits the token chip when the backend cannot report it (mock/local)", () => {
    const items = buildModelMetaItems({
      model_id: "mock",
      latency_ms: 5,
      total_tokens: null,
    });

    expect(items.map((item) => item.label)).toEqual(["Mock (offline)", "5 ms"]);
  });

  it("passes unknown model IDs through verbatim so operators can grep", () => {
    const items = buildModelMetaItems({
      model_id: "experimental-fork-v2",
      latency_ms: 1000,
    });

    expect(items[0].label).toBe("experimental-fork-v2");
  });
});
