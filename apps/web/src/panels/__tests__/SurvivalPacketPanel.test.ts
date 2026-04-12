import { describe, it, expect } from "vitest";

describe("SurvivalPacketPanel", () => {
  it("can be imported without error", async () => {
    const mod = await import("../SurvivalPacketPanel");
    expect(mod.default).toBeDefined();
  });
});
