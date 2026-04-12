import path from "node:path";
import { describe, expect, it } from "vitest";
import { getRequestLogDir } from "../request-context.js";

describe("getRequestLogDir", () => {
  it("resolves request logs inside the repo output directory", () => {
    expect(getRequestLogDir()).toBe(
      path.resolve(process.cwd(), "output", "request-logs"),
    );
  });
});
