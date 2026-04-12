import { describe, it, expect } from "vitest";

describe("UsageInsightsPanel", () => {
  it("can be imported without error", async () => {
    const mod = await import("../UsageInsightsPanel");
    expect(mod.default).toBeDefined();
  });
});
