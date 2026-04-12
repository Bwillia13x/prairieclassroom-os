// services/orchestrator/__tests__/feedback-route.test.ts
import { describe, it, expect } from "vitest";
import { FeedbackRequestSchema } from "../../../packages/shared/schemas/feedback.js";

function expectValid(schema: any, input: any) {
  const result = schema.safeParse(input);
  expect(result.success).toBe(true);
}

function expectInvalid(schema: any, input: any, pathFragment?: string) {
  const result = schema.safeParse(input);
  expect(result.success).toBe(false);
  if (pathFragment) {
    const paths = result.error!.issues.map((i: any) => i.path.join("."));
    expect(paths.some((p: string) => p.includes(pathFragment))).toBe(true);
  }
}

describe("FeedbackRequestSchema", () => {
  const valid = {
    classroom_id: "demo-okafor-grade34",
    panel_id: "today",
    rating: 4,
  };

  it("accepts a valid minimal payload", () => {
    expectValid(FeedbackRequestSchema, valid);
  });

  it("accepts a payload with all optional fields", () => {
    expectValid(FeedbackRequestSchema, {
      ...valid,
      prompt_class: "prepare_tomorrow_plan",
      comment: "Very helpful output",
      generation_id: "gen-abc123",
      session_id: "sess-xyz456",
    });
  });

  it("rejects missing classroom_id", () => {
    const { classroom_id, ...rest } = valid;
    expectInvalid(FeedbackRequestSchema, rest, "classroom_id");
  });

  it("rejects empty classroom_id", () => {
    expectInvalid(FeedbackRequestSchema, { ...valid, classroom_id: "" }, "classroom_id");
  });

  it("rejects missing panel_id", () => {
    const { panel_id, ...rest } = valid;
    expectInvalid(FeedbackRequestSchema, rest, "panel_id");
  });

  it("rejects invalid panel_id enum value", () => {
    expectInvalid(FeedbackRequestSchema, { ...valid, panel_id: "nonexistent-panel" }, "panel_id");
  });

  it("rejects missing rating", () => {
    const { rating, ...rest } = valid;
    expectInvalid(FeedbackRequestSchema, rest, "rating");
  });

  it("rejects rating below 1", () => {
    expectInvalid(FeedbackRequestSchema, { ...valid, rating: 0 }, "rating");
  });

  it("rejects rating above 5", () => {
    expectInvalid(FeedbackRequestSchema, { ...valid, rating: 6 }, "rating");
  });

  it("rejects non-integer rating", () => {
    expectInvalid(FeedbackRequestSchema, { ...valid, rating: 3.5 }, "rating");
  });

  it("rejects comment over 200 characters", () => {
    expectInvalid(
      FeedbackRequestSchema,
      { ...valid, comment: "x".repeat(201) },
      "comment",
    );
  });

  it("accepts all valid panel_id values", () => {
    const panels = [
      "today", "differentiate", "language-tools", "tomorrow-plan",
      "ea-briefing", "complexity-forecast", "log-intervention",
      "survival-packet", "family-message", "support-patterns",
      "usage-insights",
    ];
    for (const panel of panels) {
      expectValid(FeedbackRequestSchema, { ...valid, panel_id: panel });
    }
  });
});
