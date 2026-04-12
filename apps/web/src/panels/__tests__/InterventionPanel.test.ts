import { describe, it, expect } from "vitest";

describe("InterventionPanel", () => {
  it("can be imported without error", async () => {
    const mod = await import("../InterventionPanel");
    expect(mod.default).toBeDefined();
  });
});
