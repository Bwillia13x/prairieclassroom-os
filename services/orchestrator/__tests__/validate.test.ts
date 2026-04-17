// services/orchestrator/__tests__/validate.test.ts
import { describe, it, expect, vi } from "vitest";
import {
  DifferentiateRequestSchema,
  TomorrowPlanRequestSchema,
  FamilyMessageRequestSchema,
  ApproveMessageRequestSchema,
  InterventionRequestSchema,
  SimplifyRequestSchema,
  VocabCardsRequestSchema,
  SupportPatternsRequestSchema,
  EABriefingRequestSchema,
  ComplexityForecastRequestSchema,
  ScaffoldDecayRequestSchema,
  SurvivalPacketRequestSchema,
  ScheduleUpdateRequestSchema,
  DebtRegisterRequestSchema,
  validateBody,
} from "../validate.js";
import type { Request, Response } from "express";

const VALID_ARTIFACT = {
  artifact_id: "art-001",
  title: "Fractions Worksheet",
  subject: "math",
  source_type: "text" as const,
  raw_text: "Solve the following fractions...",
};

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

describe("DifferentiateRequestSchema", () => {
  const valid = { artifact: VALID_ARTIFACT, classroom_id: "demo" };
  it("accepts valid input", () => expectValid(DifferentiateRequestSchema, valid));
  it("accepts valid Alberta curriculum selection", () =>
    expectValid(DifferentiateRequestSchema, {
      ...valid,
      curriculum_selection: {
        entry_id: "ab-math-3",
        selected_focus_ids: ["focus-number-3", "focus-represent-3"],
      },
    }));
  it("rejects missing classroom_id", () =>
    expectInvalid(DifferentiateRequestSchema, { artifact: VALID_ARTIFACT }));
  it("rejects missing artifact", () =>
    expectInvalid(DifferentiateRequestSchema, { classroom_id: "demo" }));
  it("rejects empty classroom_id", () =>
    expectInvalid(DifferentiateRequestSchema, { ...valid, classroom_id: "" }));
  it("rejects curriculum selection with more than three focus ids", () =>
    expectInvalid(DifferentiateRequestSchema, {
      ...valid,
      curriculum_selection: {
        entry_id: "ab-math-3",
        selected_focus_ids: ["a", "b", "c", "d"],
      },
    }, "curriculum_selection.selected_focus_ids"));
});

describe("TomorrowPlanRequestSchema", () => {
  const valid = { classroom_id: "demo", teacher_reflection: "Good day overall." };
  it("accepts valid input", () => expectValid(TomorrowPlanRequestSchema, valid));
  it("accepts with optional artifacts", () =>
    expectValid(TomorrowPlanRequestSchema, { ...valid, artifacts: [VALID_ARTIFACT] }));
  it("rejects missing teacher_reflection", () =>
    expectInvalid(TomorrowPlanRequestSchema, { classroom_id: "demo" }));
  it("rejects empty teacher_reflection", () =>
    expectInvalid(TomorrowPlanRequestSchema, { ...valid, teacher_reflection: "" }));
  it("rejects overlong teacher_reflection", () =>
    expectInvalid(TomorrowPlanRequestSchema, { ...valid, teacher_reflection: "x".repeat(9000) }));
});

describe("FamilyMessageRequestSchema", () => {
  const valid = {
    classroom_id: "demo",
    student_refs: ["Ari"],
    message_type: "praise" as const,
    target_language: "English",
  };
  it("accepts valid input", () => expectValid(FamilyMessageRequestSchema, valid));
  it("rejects empty student_refs array", () =>
    expectInvalid(FamilyMessageRequestSchema, { ...valid, student_refs: [] }));
  it("rejects invalid message_type enum", () =>
    expectInvalid(FamilyMessageRequestSchema, { ...valid, message_type: "angry_rant" }));
  it("rejects missing target_language", () =>
    expectInvalid(FamilyMessageRequestSchema, {
      classroom_id: "demo", student_refs: ["Ari"], message_type: "praise",
    }));
});

describe("ApproveMessageRequestSchema", () => {
  const valid = { classroom_id: "demo", draft_id: "msg-001" };
  it("accepts valid input", () => expectValid(ApproveMessageRequestSchema, valid));
  it("rejects missing draft_id", () =>
    expectInvalid(ApproveMessageRequestSchema, { classroom_id: "demo" }));
});

describe("InterventionRequestSchema", () => {
  const valid = {
    classroom_id: "demo",
    student_refs: ["Mika"],
    teacher_note: "Used visual timer for transition.",
  };
  it("accepts valid input", () => expectValid(InterventionRequestSchema, valid));
  it("rejects empty teacher_note", () =>
    expectInvalid(InterventionRequestSchema, { ...valid, teacher_note: "" }));
  it("rejects missing student_refs", () =>
    expectInvalid(InterventionRequestSchema, { classroom_id: "demo", teacher_note: "note" }));
});

describe("SimplifyRequestSchema", () => {
  const valid = { source_text: "Read the passage.", grade_band: "3-4", eal_level: "beginner" as const };
  it("accepts valid input", () => expectValid(SimplifyRequestSchema, valid));
  it("rejects invalid eal_level enum", () =>
    expectInvalid(SimplifyRequestSchema, { ...valid, eal_level: "expert" }));
  it("rejects empty source_text", () =>
    expectInvalid(SimplifyRequestSchema, { ...valid, source_text: "" }));
  it("rejects overlong source_text", () =>
    expectInvalid(SimplifyRequestSchema, { ...valid, source_text: "x".repeat(9000) }));
});

describe("VocabCardsRequestSchema", () => {
  const valid = {
    artifact_text: "Community helpers are people who help us.",
    subject: "social studies",
    target_language: "Spanish",
    grade_band: "3-4",
  };
  it("accepts valid input", () => expectValid(VocabCardsRequestSchema, valid));
  it("accepts valid Alberta curriculum selection", () =>
    expectValid(VocabCardsRequestSchema, {
      ...valid,
      curriculum_selection: {
        entry_id: "ab-social-3",
        selected_focus_ids: ["focus-community-3"],
      },
    }));
  it("rejects missing subject", () =>
    expectInvalid(VocabCardsRequestSchema, {
      artifact_text: "text", target_language: "Spanish", grade_band: "3-4",
    }));
});

describe("SupportPatternsRequestSchema", () => {
  it("accepts minimal input", () =>
    expectValid(SupportPatternsRequestSchema, { classroom_id: "demo" }));
  it("accepts with all optional fields", () =>
    expectValid(SupportPatternsRequestSchema, {
      classroom_id: "demo", student_filter: "Ari", time_window: 10,
    }));
  it("rejects non-positive time_window", () =>
    expectInvalid(SupportPatternsRequestSchema, { classroom_id: "demo", time_window: 0 }));
});

describe("EABriefingRequestSchema", () => {
  it("accepts minimal input", () =>
    expectValid(EABriefingRequestSchema, { classroom_id: "demo" }));
  it("accepts with optional ea_name", () =>
    expectValid(EABriefingRequestSchema, { classroom_id: "demo", ea_name: "Ms. Fehr" }));
});

describe("ComplexityForecastRequestSchema", () => {
  const valid = { classroom_id: "demo", forecast_date: "2026-04-06" };
  it("accepts valid input", () => expectValid(ComplexityForecastRequestSchema, valid));
  it("accepts with optional teacher_notes", () =>
    expectValid(ComplexityForecastRequestSchema, { ...valid, teacher_notes: "Assembly at 10am" }));
  it("rejects missing forecast_date", () =>
    expectInvalid(ComplexityForecastRequestSchema, { classroom_id: "demo" }));
});

describe("ScaffoldDecayRequestSchema", () => {
  const valid = { classroom_id: "demo", student_ref: "Ari" };
  it("accepts valid input", () => expectValid(ScaffoldDecayRequestSchema, valid));
  it("applies default time_window of 20", () => {
    const result = ScaffoldDecayRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.time_window).toBe(20);
  });
  it("rejects time_window below 10", () =>
    expectInvalid(ScaffoldDecayRequestSchema, { ...valid, time_window: 5 }));
});

describe("SurvivalPacketRequestSchema", () => {
  const valid = { classroom_id: "demo", target_date: "2026-04-06" };
  it("accepts valid input", () => expectValid(SurvivalPacketRequestSchema, valid));
  it("rejects missing target_date", () =>
    expectInvalid(SurvivalPacketRequestSchema, { classroom_id: "demo" }));
});

describe("ScheduleUpdateRequestSchema", () => {
  const valid = {
    schedule: [{ time_slot: "9:00-10:00", activity: "Math", ea_available: true }],
  };
  it("accepts valid input", () => expectValid(ScheduleUpdateRequestSchema, valid));
  it("accepts with optional nested fields", () =>
    expectValid(ScheduleUpdateRequestSchema, {
      schedule: [{
        time_slot: "9:00-10:00", activity: "Math", ea_available: true,
        ea_student_refs: ["Ari"], notes: "Focus on fractions",
      }],
      upcoming_events: [{ description: "Assembly" }],
    }));
  it("rejects empty schedule array", () =>
    expectInvalid(ScheduleUpdateRequestSchema, { schedule: [] }));
  it("rejects schedule item missing required fields", () =>
    expectInvalid(ScheduleUpdateRequestSchema, { schedule: [{ time_slot: "9:00" }] }));
});

describe("DebtRegisterRequestSchema", () => {
  it("accepts empty object (all fields optional)", () =>
    expectValid(DebtRegisterRequestSchema, {}));
  it("accepts with all optional fields", () =>
    expectValid(DebtRegisterRequestSchema, {
      stale_followup_days: 5,
      unapproved_message_days: 3,
      recurring_plan_min: 3,
      review_window_days: 14,
      review_min_records: 2,
    }));
  it("rejects non-positive stale_followup_days", () =>
    expectInvalid(DebtRegisterRequestSchema, { stale_followup_days: 0 }));
  it("rejects non-integer review_window_days", () =>
    expectInvalid(DebtRegisterRequestSchema, { review_window_days: 3.5 }));
});

describe("validateBody middleware", () => {
  it("calls next() with parsed body on valid input", () => {
    const mw = validateBody(SurvivalPacketRequestSchema);
    const req = { body: { classroom_id: "demo", target_date: "2026-04-06" } } as Request;
    const res = {} as Response;
    const next = vi.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.body.classroom_id).toBe("demo");
  });

  it("returns 400 with validation_errors on invalid input", () => {
    const mw = validateBody(SurvivalPacketRequestSchema);
    const req = { body: {} } as Request;
    let statusCode: number | null = null;
    let jsonBody: any = null;
    const res = {
      locals: {},
      status(code: number) { statusCode = code; return res; },
      json(data: any) { jsonBody = data; return res; },
    } as unknown as Response;
    const next = vi.fn();
    mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(statusCode).toBe(400);
    expect(jsonBody.error).toBe("Invalid request body");
    expect(jsonBody.category).toBe("validation");
    expect(jsonBody.retryable).toBe(false);
    expect(jsonBody.detail_code).toBe("request_body_invalid");
    expect(Array.isArray(jsonBody.validation_errors)).toBe(true);
    expect(jsonBody.validation_errors.length).toBeGreaterThan(0);
  });
});
