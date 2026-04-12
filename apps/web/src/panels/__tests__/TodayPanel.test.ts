import { describe, it, expect } from "vitest";

describe("TodayPanel", () => {
  it("can be imported without error", async () => {
    const mod = await import("../TodayPanel");
    expect(mod.default).toBeDefined();
  });
});
