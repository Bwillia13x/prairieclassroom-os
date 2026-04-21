// packages/shared/schemas/__tests__/feedback-session.test.ts
import { describe, it, expect } from "vitest";
import {
  FeedbackRequestSchema,
  FeedbackResponseSchema,
  FeedbackSummarySchema,
  SessionRequestSchema,
  SessionResponseSchema,
  SessionSummarySchema,
  GenerationEventSchema,
  PANEL_IDS,
} from "../index.js";

// ---------------------------------------------------------------------------
// Feedback schemas
// ---------------------------------------------------------------------------

describe("FeedbackRequestSchema", () => {
  const valid = {
    classroom_id: "demo-okafor-grade34",
    panel_id: "today" as const,
    rating: 4,
  };

  it("accepts a valid minimal feedback request", () => {
    const result = FeedbackRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("accepts a fully populated feedback request", () => {
    const full = {
      ...valid,
      prompt_class: "prepare_tomorrow_plan",
      comment: "Very helpful suggestions",
      generation_id: "gen-abc123",
      session_id: "sess-xyz789",
    };
    const result = FeedbackRequestSchema.safeParse(full);
    expect(result.success).toBe(true);
  });

  it("accepts all valid panel IDs", () => {
    for (const panelId of PANEL_IDS) {
      const result = FeedbackRequestSchema.safeParse({
        ...valid,
        panel_id: panelId,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects rating below 1", () => {
    const result = FeedbackRequestSchema.safeParse({ ...valid, rating: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects rating above 5", () => {
    const result = FeedbackRequestSchema.safeParse({ ...valid, rating: 6 });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer rating", () => {
    const result = FeedbackRequestSchema.safeParse({ ...valid, rating: 3.5 });
    expect(result.success).toBe(false);
  });

  it("rejects comment over 200 characters", () => {
    const result = FeedbackRequestSchema.safeParse({
      ...valid,
      comment: "x".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("accepts comment of exactly 200 characters", () => {
    const result = FeedbackRequestSchema.safeParse({
      ...valid,
      comment: "x".repeat(200),
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty classroom_id", () => {
    const result = FeedbackRequestSchema.safeParse({
      ...valid,
      classroom_id: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid panel_id", () => {
    const result = FeedbackRequestSchema.safeParse({
      ...valid,
      panel_id: "nonexistent-panel",
    });
    expect(result.success).toBe(false);
  });
});

describe("FeedbackResponseSchema", () => {
  it("accepts a valid response", () => {
    const result = FeedbackResponseSchema.safeParse({
      id: "fb-001",
      created_at: "2026-04-11T10:00:00Z",
    });
    expect(result.success).toBe(true);
  });
});

describe("FeedbackSummarySchema", () => {
  it("accepts a valid summary", () => {
    const result = FeedbackSummarySchema.safeParse({
      total: 42,
      by_panel: {
        today: { count: 10, avg_rating: 4.2, recent_comments: ["Great"] },
        differentiate: { count: 5, avg_rating: 3.8, recent_comments: [] },
      },
      by_week: [
        { week: "2026-W15", count: 12, avg_rating: 4.0 },
      ],
      top_comments: [
        {
          text: "Very useful",
          panel_id: "today",
          rating: 5,
          created_at: "2026-04-11T10:00:00Z",
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Session schemas
// ---------------------------------------------------------------------------

describe("GenerationEventSchema", () => {
  it("accepts a valid generation event", () => {
    const result = GenerationEventSchema.safeParse({
      panel_id: "tomorrow-plan",
      prompt_class: "prepare_tomorrow_plan",
      timestamp: "2026-04-11T10:05:00Z",
    });
    expect(result.success).toBe(true);
  });
});

describe("SessionRequestSchema", () => {
  const valid = {
    classroom_id: "demo-okafor-grade34",
    session_id: "sess-abc",
    started_at: "2026-04-11T09:00:00Z",
    ended_at: "2026-04-11T09:30:00Z",
    panels_visited: ["today", "tomorrow-plan"],
    generations_triggered: [
      {
        panel_id: "tomorrow-plan",
        prompt_class: "prepare_tomorrow_plan",
        timestamp: "2026-04-11T09:10:00Z",
      },
    ],
    feedback_count: 2,
  };

  it("accepts a valid session request", () => {
    const result = SessionRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects empty panels_visited", () => {
    const result = SessionRequestSchema.safeParse({
      ...valid,
      panels_visited: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty classroom_id", () => {
    const result = SessionRequestSchema.safeParse({
      ...valid,
      classroom_id: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty session_id", () => {
    const result = SessionRequestSchema.safeParse({
      ...valid,
      session_id: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative feedback_count", () => {
    const result = SessionRequestSchema.safeParse({
      ...valid,
      feedback_count: -1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts zero feedback_count", () => {
    const result = SessionRequestSchema.safeParse({
      ...valid,
      feedback_count: 0,
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty generations_triggered", () => {
    const result = SessionRequestSchema.safeParse({
      ...valid,
      generations_triggered: [],
    });
    expect(result.success).toBe(true);
  });
});

describe("SessionResponseSchema", () => {
  it("accepts a valid response", () => {
    const result = SessionResponseSchema.safeParse({ id: "sess-001" });
    expect(result.success).toBe(true);
  });
});

describe("SessionSummarySchema", () => {
  it("accepts a valid summary", () => {
    const result = SessionSummarySchema.safeParse({
      total_sessions: 15,
      avg_duration_minutes: 22.5,
      common_flows: [
        { sequence: ["today", "tomorrow-plan", "differentiate"], count: 5 },
      ],
      transition_counts: [
        { from_panel: "today", to_panel: "tomorrow-plan", count: 6 },
      ],
      terminal_counts: [
        { panel_id: "family-message", count: 3 },
      ],
      panel_time_distribution: {
        today: 0.3,
        "tomorrow-plan": 0.25,
        differentiate: 0.2,
      },
      generations_per_session: 3.2,
      today_workflow_nudge: {
        week: "2026-W16",
        is_current_week: true,
        sequence: ["today", "log-intervention", "tomorrow-plan"],
        count: 4,
      },
    });
    expect(result.success).toBe(true);
  });
});
