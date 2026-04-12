import { describe, it, expect } from "vitest";

describe("SupportPatternsPanel", () => {
  it("can be imported without error", async () => {
    const mod = await import("../SupportPatternsPanel");
    expect(mod.default).toBeDefined();
  });
});
