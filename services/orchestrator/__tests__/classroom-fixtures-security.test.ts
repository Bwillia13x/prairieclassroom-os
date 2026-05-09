import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

describe("synthetic classroom fixture security", () => {
  it("does not check in non-demo classroom access codes", () => {
    const dataDir = resolve(import.meta.dirname, "../../../data/synthetic_classrooms");
    const files = readdirSync(dataDir).filter((file) => file.startsWith("classroom_") && file.endsWith(".json"));

    for (const file of files) {
      const parsed = JSON.parse(readFileSync(resolve(dataDir, file), "utf-8")) as {
        classroom_id?: string;
        is_demo?: boolean;
        access_code?: unknown;
      };

      if (parsed.access_code !== undefined) {
        expect(parsed.is_demo, `${file} includes access_code; only explicit demo fixtures may do this`).toBe(true);
      }
    }
  });
});
