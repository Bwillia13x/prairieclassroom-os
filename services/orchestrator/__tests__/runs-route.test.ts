// services/orchestrator/__tests__/runs-route.test.ts
import { describe, it, expect } from "vitest";
import { SaveRunRequestSchema } from "../../../packages/shared/schemas/run.js";

describe("SaveRunRequestSchema", () => {
  const valid = {
    run_id: "diff-001-1712345678",
    tool: "differentiate" as const,
    label: "Fractions worksheet",
    created_at: "2026-04-18T10:00:00.000Z",
  };

  it("accepts a valid minimal payload", () => {
    const result = SaveRunRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("accepts a payload with metadata", () => {
    const result = SaveRunRequestSchema.safeParse({
      ...valid,
      metadata: { source: "photo", eal_level: "beginner" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts all valid tools", () => {
    for (const tool of ["differentiate", "simplify", "vocab"] as const) {
      const result = SaveRunRequestSchema.safeParse({ ...valid, tool });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid tool enum", () => {
    const result = SaveRunRequestSchema.safeParse({ ...valid, tool: "family-message" });
    expect(result.success).toBe(false);
  });

  it("rejects empty run_id", () => {
    const result = SaveRunRequestSchema.safeParse({ ...valid, run_id: "" });
    expect(result.success).toBe(false);
  });

  it("rejects empty label", () => {
    const result = SaveRunRequestSchema.safeParse({ ...valid, label: "" });
    expect(result.success).toBe(false);
  });

  it("rejects label over 160 chars", () => {
    const result = SaveRunRequestSchema.safeParse({ ...valid, label: "x".repeat(161) });
    expect(result.success).toBe(false);
  });

  it("rejects missing created_at", () => {
    const { created_at: _omit, ...rest } = valid;
    const result = SaveRunRequestSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});
