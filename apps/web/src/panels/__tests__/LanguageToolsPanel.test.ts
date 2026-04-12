import { describe, it, expect } from "vitest";

describe("LanguageToolsPanel", () => {
  it("can be imported without error", async () => {
    const mod = await import("../LanguageToolsPanel");
    expect(mod.default).toBeDefined();
  });
});
