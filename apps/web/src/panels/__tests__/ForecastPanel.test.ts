import { describe, it, expect } from "vitest";

describe("ForecastPanel", () => {
  it("can be imported without error", async () => {
    const mod = await import("../ForecastPanel");
    expect(mod.default).toBeDefined();
  });
});
