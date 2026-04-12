import { describe, it, expect } from "vitest";

describe("FamilyMessagePanel", () => {
  it("can be imported without error", async () => {
    const mod = await import("../FamilyMessagePanel");
    expect(mod.default).toBeDefined();
  });
});
