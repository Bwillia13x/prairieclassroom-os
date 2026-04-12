import { describe, it, expect } from "vitest";

describe("DifferentiatePanel", () => {
  it("can be imported without error", async () => {
    const mod = await import("../DifferentiatePanel");
    expect(mod.default).toBeDefined();
  });
});
