import { describe, it, expect } from "vitest";

describe("TomorrowPlanPanel", () => {
  it("can be imported without error", async () => {
    const mod = await import("../TomorrowPlanPanel");
    expect(mod.default).toBeDefined();
  });
});
