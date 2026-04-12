import { describe, it, expect } from "vitest";

describe("EABriefingPanel", () => {
  it("can be imported without error", async () => {
    const mod = await import("../EABriefingPanel");
    expect(mod.default).toBeDefined();
  });
});
