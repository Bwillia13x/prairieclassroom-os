// packages/shared/schemas/__tests__/schemas.test.ts
// Comprehensive validation tests for all shared Zod schemas.
import { describe, it, expect } from "vitest";

import {
  // artifact.ts
  LessonArtifactSchema,
  VariantTypeSchema,
  DifferentiatedVariantSchema,
  // briefing.ts
  ScheduleBlockSchema,
  StudentWatchItemSchema,
  PendingFollowupSchema,
  EABriefingSchema,
  // classroom.ts
  StudentSupportSummarySchema,
  ClassroomProfileSchema,
  // debt.ts
  DebtCategorySchema,
  DebtItemSchema,
  DebtThresholdsSchema,
  ComplexityDebtRegisterSchema,
  // forecast.ts
  ScheduleBlockInputSchema,
  UpcomingEventSchema,
  ComplexityBlockSchema,
  ComplexityForecastSchema,
  // intervention.ts
  InterventionRecordSchema,
  // language.ts
  SimplifiedOutputSchema,
  VocabCardSchema,
  VocabCardSetSchema,
  // message.ts
  FamilyMessageDraftSchema,
  // pattern.ts
  RecurringThemeSchema,
  FollowUpGapSchema,
  PositiveTrendSchema,
  SuggestedFocusSchema,
  SupportPatternReportSchema,
  // plan.ts
  TransitionWatchpointSchema,
  SupportPrioritySchema,
  EAActionSchema,
  FamilyFollowupSchema,
  TomorrowPlanSchema,
  // scaffold-decay.ts
  ScaffoldUsageTrendSchema,
  PositiveSignalSchema,
  WithdrawalPhaseSchema,
  ScaffoldReviewSchema,
  ScaffoldDecayReportSchema,
  // survival-packet.ts
  RoutineEntrySchema,
  StudentSupportEntrySchema,
  EACoordinationSchema,
  SimplifiedDayPlanSchema,
  FamilyCommsEntrySchema,
  ComplexityPeakSchema,
  SurvivalPacketSchema,
} from "../index.js";

import {
  ExtractWorksheetRequestSchema,
  ExtractWorksheetResponseSchema,
} from "../extract-worksheet.js";

// ---------------------------------------------------------------------------
// artifact.ts
// ---------------------------------------------------------------------------

describe("LessonArtifactSchema", () => {
  const valid = {
    artifact_id: "art-101",
    title: "Prairie Grasslands Reading",
    subject: "science",
    source_type: "text" as const,
    raw_text: "The fescue prairie is home to many species...",
    teacher_goal: "Identify native grass species",
  };

  it("accepts a complete valid artifact", () => {
    expect(LessonArtifactSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts minimal required fields only", () => {
    const minimal = {
      artifact_id: "art-102",
      title: "Quick Math Warmup",
      subject: "math",
      source_type: "pdf" as const,
    };
    expect(LessonArtifactSchema.safeParse(minimal).success).toBe(true);
  });

  it("rejects missing artifact_id", () => {
    const { artifact_id, ...rest } = valid;
    expect(LessonArtifactSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing title", () => {
    const { title, ...rest } = valid;
    expect(LessonArtifactSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects invalid source_type enum value", () => {
    expect(
      LessonArtifactSchema.safeParse({ ...valid, source_type: "video" }).success,
    ).toBe(false);
  });

  it("rejects source_type as number", () => {
    expect(
      LessonArtifactSchema.safeParse({ ...valid, source_type: 42 }).success,
    ).toBe(false);
  });
});

describe("VariantTypeSchema", () => {
  it("accepts all valid variant types", () => {
    for (const v of ["core", "eal_supported", "chunked", "ea_small_group", "extension"]) {
      expect(VariantTypeSchema.safeParse(v).success).toBe(true);
    }
  });

  it("rejects an unknown variant type", () => {
    expect(VariantTypeSchema.safeParse("honours").success).toBe(false);
  });
});

describe("DifferentiatedVariantSchema", () => {
  const valid = {
    variant_id: "var-001",
    artifact_id: "art-101",
    variant_type: "eal_supported" as const,
    title: "Prairie Grasslands - EAL Supported",
    student_facing_instructions: "Read the passage. Circle words you do not know.",
    teacher_notes: "Pre-teach fescue and ecosystem before handing out.",
    required_materials: ["highlighters", "word wall cards"],
    estimated_minutes: 25,
    schema_version: "1.0.0",
  };

  it("accepts a complete valid variant", () => {
    expect(DifferentiatedVariantSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing student_facing_instructions", () => {
    const { student_facing_instructions, ...rest } = valid;
    expect(DifferentiatedVariantSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects estimated_minutes as string", () => {
    expect(
      DifferentiatedVariantSchema.safeParse({ ...valid, estimated_minutes: "25" }).success,
    ).toBe(false);
  });

  it("rejects required_materials as string instead of array", () => {
    expect(
      DifferentiatedVariantSchema.safeParse({ ...valid, required_materials: "highlighters" }).success,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// briefing.ts
// ---------------------------------------------------------------------------

describe("ScheduleBlockSchema (briefing)", () => {
  const valid = {
    time_slot: "9:00-9:45",
    student_refs: ["Ari", "Mika"],
    task_description: "Guided reading with visual supports",
    materials_needed: ["levelled readers", "picture cards"],
  };

  it("accepts a valid schedule block", () => {
    expect(ScheduleBlockSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing task_description", () => {
    const { task_description, ...rest } = valid;
    expect(ScheduleBlockSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects student_refs as a single string", () => {
    expect(
      ScheduleBlockSchema.safeParse({ ...valid, student_refs: "Ari" }).success,
    ).toBe(false);
  });
});

describe("StudentWatchItemSchema", () => {
  const valid = {
    student_ref: "Ari",
    context_summary: "Missed two days last week; re-entry support needed.",
    suggested_approach: "Check in quietly during morning routine.",
  };

  it("accepts a valid watch item", () => {
    expect(StudentWatchItemSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing student_ref", () => {
    const { student_ref, ...rest } = valid;
    expect(StudentWatchItemSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects context_summary as number", () => {
    expect(
      StudentWatchItemSchema.safeParse({ ...valid, context_summary: 123 }).success,
    ).toBe(false);
  });
});

describe("PendingFollowupSchema", () => {
  const valid = {
    student_ref: "Mika",
    original_observation: "Struggled with multi-step word problems.",
    days_since: 3,
    suggested_action: "Re-assess with manipulatives.",
  };

  it("accepts a valid pending followup", () => {
    expect(PendingFollowupSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing days_since", () => {
    const { days_since, ...rest } = valid;
    expect(PendingFollowupSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects days_since as string", () => {
    expect(
      PendingFollowupSchema.safeParse({ ...valid, days_since: "3" }).success,
    ).toBe(false);
  });
});

describe("EABriefingSchema", () => {
  const valid = {
    briefing_id: "brief-001",
    classroom_id: "cls-k2-meadow",
    date: "2026-04-10",
    schedule_blocks: [
      {
        time_slot: "9:00-9:45",
        student_refs: ["Ari"],
        task_description: "Guided reading",
        materials_needed: ["levelled readers"],
      },
    ],
    student_watch_list: [
      {
        student_ref: "Mika",
        context_summary: "Re-entry after absence.",
        suggested_approach: "Quiet check-in at desk.",
      },
    ],
    pending_followups: [
      {
        student_ref: "Leo",
        original_observation: "Needed extra time on fractions.",
        days_since: 2,
        suggested_action: "Revisit with number line.",
      },
    ],
    teacher_notes_for_ea: "Assembly at 10:30 - return students by 10:20.",
    schema_version: "1.0.0",
  };

  it("accepts a complete valid briefing", () => {
    expect(EABriefingSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing classroom_id", () => {
    const { classroom_id, ...rest } = valid;
    expect(EABriefingSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects schedule_blocks as a string", () => {
    expect(
      EABriefingSchema.safeParse({ ...valid, schedule_blocks: "morning block" }).success,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// classroom.ts
// ---------------------------------------------------------------------------

describe("StudentSupportSummarySchema", () => {
  const valid = {
    student_id: "stu-ari-01",
    alias: "Ari",
    eal_flag: true,
    support_tags: ["visual_supports", "chunked_instructions"],
    known_successful_scaffolds: ["word wall", "sentence starters"],
    communication_notes: ["Prefers written check-ins"],
    family_language: "Tagalog",
  };

  it("accepts a complete student summary", () => {
    expect(StudentSupportSummarySchema.safeParse(valid).success).toBe(true);
  });

  it("accepts without optional fields", () => {
    const minimal = {
      student_id: "stu-mika-01",
      alias: "Mika",
      eal_flag: false,
      support_tags: [],
      known_successful_scaffolds: ["visual timer"],
    };
    expect(StudentSupportSummarySchema.safeParse(minimal).success).toBe(true);
  });

  it("rejects missing eal_flag", () => {
    const { eal_flag, ...rest } = valid;
    expect(StudentSupportSummarySchema.safeParse(rest).success).toBe(false);
  });

  it("rejects eal_flag as string", () => {
    expect(
      StudentSupportSummarySchema.safeParse({ ...valid, eal_flag: "yes" }).success,
    ).toBe(false);
  });
});

describe("ClassroomProfileSchema", () => {
  const valid = {
    classroom_id: "cls-k2-meadow",
    grade_band: "K-2",
    subject_focus: "cross-curricular",
    classroom_notes: ["22 students", "1 EA mornings only"],
    routines: { morning: "Circle time then calendar math", dismissal: "Pack, stack, read" },
    students: [
      {
        student_id: "stu-ari-01",
        alias: "Ari",
        eal_flag: true,
        support_tags: ["visual_supports"],
        known_successful_scaffolds: ["word wall"],
      },
    ],
  };

  it("accepts a valid classroom profile", () => {
    expect(ClassroomProfileSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts with optional schedule and events", () => {
    const withOptionals = {
      ...valid,
      support_constraints: ["EA unavailable Thursdays"],
      access_code: "meadow2026",
      sub_ready: true,
      schedule: [{ time_slot: "9:00-10:00", activity: "Math", ea_available: true }],
      upcoming_events: [{ description: "Field trip to Nose Hill" }],
    };
    expect(ClassroomProfileSchema.safeParse(withOptionals).success).toBe(true);
  });

  it("rejects missing grade_band", () => {
    const { grade_band, ...rest } = valid;
    expect(ClassroomProfileSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects routines as array instead of record", () => {
    expect(
      ClassroomProfileSchema.safeParse({ ...valid, routines: ["circle time"] }).success,
    ).toBe(false);
  });

  it("rejects students as a string", () => {
    expect(
      ClassroomProfileSchema.safeParse({ ...valid, students: "Ari, Mika" }).success,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// debt.ts
// ---------------------------------------------------------------------------

describe("DebtCategorySchema", () => {
  it("accepts all valid categories", () => {
    for (const cat of [
      "stale_followup",
      "unapproved_message",
      "unaddressed_pattern",
      "recurring_plan_item",
      "approaching_review",
    ]) {
      expect(DebtCategorySchema.safeParse(cat).success).toBe(true);
    }
  });

  it("rejects an unknown category", () => {
    expect(DebtCategorySchema.safeParse("overdue_homework").success).toBe(false);
  });
});

describe("DebtItemSchema", () => {
  const valid = {
    category: "stale_followup" as const,
    student_refs: ["Ari"],
    description: "Follow-up on reading comprehension check not completed.",
    source_record_id: "int-042",
    age_days: 6,
    suggested_action: "Revisit with Ari during guided reading block.",
  };

  it("accepts a valid debt item", () => {
    expect(DebtItemSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing category", () => {
    const { category, ...rest } = valid;
    expect(DebtItemSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects age_days as string", () => {
    expect(
      DebtItemSchema.safeParse({ ...valid, age_days: "six" }).success,
    ).toBe(false);
  });
});

describe("DebtThresholdsSchema", () => {
  it("accepts empty object and applies defaults", () => {
    const result = DebtThresholdsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stale_followup_days).toBe(5);
      expect(result.data.unapproved_message_days).toBe(3);
      expect(result.data.recurring_plan_min).toBe(3);
      expect(result.data.review_window_days).toBe(14);
      expect(result.data.review_min_records).toBe(2);
    }
  });

  it("accepts explicit overrides", () => {
    const result = DebtThresholdsSchema.safeParse({ stale_followup_days: 7 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stale_followup_days).toBe(7);
    }
  });

  it("rejects stale_followup_days as string", () => {
    expect(
      DebtThresholdsSchema.safeParse({ stale_followup_days: "five" }).success,
    ).toBe(false);
  });
});

describe("ComplexityDebtRegisterSchema", () => {
  const valid = {
    register_id: "debt-reg-001",
    classroom_id: "cls-k2-meadow",
    items: [
      {
        category: "stale_followup" as const,
        student_refs: ["Ari"],
        description: "No follow-up recorded for visual timer trial.",
        source_record_id: "int-040",
        age_days: 7,
        suggested_action: "Check in with Ari during math block.",
      },
    ],
    item_count_by_category: { stale_followup: 1 },
    generated_at: "2026-04-10T08:00:00Z",
    schema_version: "1.0.0",
  };

  it("accepts a valid debt register", () => {
    expect(ComplexityDebtRegisterSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing items array", () => {
    const { items, ...rest } = valid;
    expect(ComplexityDebtRegisterSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects item_count_by_category with non-number values", () => {
    expect(
      ComplexityDebtRegisterSchema.safeParse({
        ...valid,
        item_count_by_category: { stale_followup: "one" },
      }).success,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// extract-worksheet.ts
// ---------------------------------------------------------------------------

describe("ExtractWorksheetRequestSchema", () => {
  const valid = {
    classroom_id: "cls-34-river",
    image_base64: "iVBORw0KGgoAAAANSUhEUgAAAAUA",
    mime_type: "image/png",
  };

  it("accepts a valid extract request", () => {
    expect(ExtractWorksheetRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts image/jpeg mime type", () => {
    expect(
      ExtractWorksheetRequestSchema.safeParse({ ...valid, mime_type: "image/jpeg" }).success,
    ).toBe(true);
  });

  it("rejects empty classroom_id", () => {
    expect(
      ExtractWorksheetRequestSchema.safeParse({ ...valid, classroom_id: "" }).success,
    ).toBe(false);
  });

  it("rejects empty image_base64", () => {
    expect(
      ExtractWorksheetRequestSchema.safeParse({ ...valid, image_base64: "" }).success,
    ).toBe(false);
  });

  it("rejects unsupported mime_type", () => {
    expect(
      ExtractWorksheetRequestSchema.safeParse({ ...valid, mime_type: "image/gif" }).success,
    ).toBe(false);
  });

  it("rejects mime_type that does not start with image/", () => {
    expect(
      ExtractWorksheetRequestSchema.safeParse({ ...valid, mime_type: "application/pdf" }).success,
    ).toBe(false);
  });
});

describe("ExtractWorksheetResponseSchema", () => {
  const valid = {
    extracted_text: "1. Solve 3/4 + 1/2\n2. Simplify 6/8",
    confidence_notes: ["Handwriting partially obscured in question 2"],
  };

  it("accepts a valid extract response", () => {
    expect(ExtractWorksheetResponseSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing extracted_text", () => {
    const { extracted_text, ...rest } = valid;
    expect(ExtractWorksheetResponseSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects confidence_notes as string instead of array", () => {
    expect(
      ExtractWorksheetResponseSchema.safeParse({
        ...valid,
        confidence_notes: "some note",
      }).success,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// forecast.ts
// ---------------------------------------------------------------------------

describe("ScheduleBlockInputSchema", () => {
  const valid = {
    time_slot: "9:00-10:00",
    activity: "Math - Fractions",
    ea_available: true,
    ea_student_refs: ["Ari", "Mika"],
    notes: "Continue from yesterday's lesson",
  };

  it("accepts a complete schedule block input", () => {
    expect(ScheduleBlockInputSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts without optional fields", () => {
    const minimal = { time_slot: "10:00-10:45", activity: "Literacy", ea_available: false };
    expect(ScheduleBlockInputSchema.safeParse(minimal).success).toBe(true);
  });

  it("rejects missing ea_available", () => {
    const { ea_available, ...rest } = valid;
    expect(ScheduleBlockInputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects ea_available as string", () => {
    expect(
      ScheduleBlockInputSchema.safeParse({ ...valid, ea_available: "yes" }).success,
    ).toBe(false);
  });
});

describe("UpcomingEventSchema", () => {
  const valid = {
    description: "School assembly - Terry Fox Run kickoff",
    event_date: "2026-04-11",
    time_slot: "10:30-11:00",
    impacts: "Students will miss last 15 min of math block",
  };

  it("accepts a complete upcoming event", () => {
    expect(UpcomingEventSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts description-only (all others optional)", () => {
    expect(UpcomingEventSchema.safeParse({ description: "Early dismissal" }).success).toBe(true);
  });

  it("rejects missing description", () => {
    expect(UpcomingEventSchema.safeParse({ event_date: "2026-04-11" }).success).toBe(false);
  });

  it("rejects description as number", () => {
    expect(UpcomingEventSchema.safeParse({ description: 42 }).success).toBe(false);
  });
});

describe("ComplexityBlockSchema", () => {
  const valid = {
    time_slot: "10:00-10:45",
    activity: "Science - weather observation walk",
    level: "high" as const,
    contributing_factors: ["outdoor transition", "Ari returning from absence", "EA unavailable"],
    suggested_mitigation: "Pair Ari with peer buddy for outdoor portion.",
  };

  it("accepts a valid complexity block", () => {
    expect(ComplexityBlockSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid level enum", () => {
    expect(
      ComplexityBlockSchema.safeParse({ ...valid, level: "extreme" }).success,
    ).toBe(false);
  });

  it("rejects missing contributing_factors", () => {
    const { contributing_factors, ...rest } = valid;
    expect(ComplexityBlockSchema.safeParse(rest).success).toBe(false);
  });
});

describe("ComplexityForecastSchema", () => {
  const valid = {
    forecast_id: "fc-001",
    classroom_id: "cls-k2-meadow",
    forecast_date: "2026-04-11",
    blocks: [
      {
        time_slot: "9:00-9:45",
        activity: "Morning circle",
        level: "low" as const,
        contributing_factors: ["familiar routine"],
        suggested_mitigation: "None needed.",
      },
    ],
    overall_summary: "Generally smooth day with one high-complexity block at 10:00.",
    highest_risk_block: "10:00-10:45",
    schema_version: "1.0.0",
  };

  it("accepts a valid forecast", () => {
    expect(ComplexityForecastSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing forecast_date", () => {
    const { forecast_date, ...rest } = valid;
    expect(ComplexityForecastSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects blocks as a string", () => {
    expect(
      ComplexityForecastSchema.safeParse({ ...valid, blocks: "morning block" }).success,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// intervention.ts
// ---------------------------------------------------------------------------

describe("InterventionRecordSchema", () => {
  const valid = {
    record_id: "int-051",
    classroom_id: "cls-34-river",
    student_refs: ["Mika", "Leo"],
    observation: "Both students lost focus during independent work after recess.",
    action_taken: "Moved to small table with visual timer and chunked worksheet.",
    outcome: "Completed 3 of 4 questions with support.",
    follow_up_needed: true,
    created_at: "2026-04-10T13:30:00Z",
    schema_version: "1.0.0",
  };

  it("accepts a complete valid intervention", () => {
    expect(InterventionRecordSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts without optional outcome", () => {
    const { outcome, ...rest } = valid;
    expect(InterventionRecordSchema.safeParse(rest).success).toBe(true);
  });

  it("rejects missing observation", () => {
    const { observation, ...rest } = valid;
    expect(InterventionRecordSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects follow_up_needed as string", () => {
    expect(
      InterventionRecordSchema.safeParse({ ...valid, follow_up_needed: "yes" }).success,
    ).toBe(false);
  });

  it("rejects student_refs as a single string", () => {
    expect(
      InterventionRecordSchema.safeParse({ ...valid, student_refs: "Mika" }).success,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// language.ts
// ---------------------------------------------------------------------------

describe("SimplifiedOutputSchema", () => {
  const valid = {
    simplified_id: "simp-001",
    source_text: "The water cycle involves evaporation, condensation, and precipitation.",
    grade_band: "K-2",
    eal_level: "beginner" as const,
    simplified_text: "Water goes up to the sky. It makes clouds. Then rain falls down.",
    key_vocabulary: ["evaporation", "condensation", "precipitation"],
    visual_cue_suggestions: ["water cycle diagram", "cloud and rain icon"],
    schema_version: "1.0.0",
  };

  it("accepts a valid simplified output", () => {
    expect(SimplifiedOutputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid eal_level", () => {
    expect(
      SimplifiedOutputSchema.safeParse({ ...valid, eal_level: "native" }).success,
    ).toBe(false);
  });

  it("rejects missing grade_band", () => {
    const { grade_band, ...rest } = valid;
    expect(SimplifiedOutputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects key_vocabulary as string instead of array", () => {
    expect(
      SimplifiedOutputSchema.safeParse({ ...valid, key_vocabulary: "evaporation" }).success,
    ).toBe(false);
  });
});

describe("VocabCardSchema", () => {
  const valid = {
    term: "ecosystem",
    definition: "A community of living things and their environment.",
    target_translation: "ecosistema",
    example_sentence: "The prairie is a type of ecosystem.",
    visual_hint: "Drawing of grass, animals, and sun together",
  };

  it("accepts a valid vocab card", () => {
    expect(VocabCardSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing term", () => {
    const { term, ...rest } = valid;
    expect(VocabCardSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects definition as number", () => {
    expect(
      VocabCardSchema.safeParse({ ...valid, definition: 42 }).success,
    ).toBe(false);
  });
});

describe("VocabCardSetSchema", () => {
  const valid = {
    set_id: "vcs-001",
    artifact_id: "art-101",
    subject: "science",
    target_language: "Spanish",
    grade_band: "3-4",
    cards: [
      {
        term: "ecosystem",
        definition: "A community of living things and their environment.",
        target_translation: "ecosistema",
        example_sentence: "The prairie is a type of ecosystem.",
        visual_hint: "Grass, animals, sun",
      },
    ],
    schema_version: "1.0.0",
  };

  it("accepts a valid vocab card set", () => {
    expect(VocabCardSetSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing cards array", () => {
    const { cards, ...rest } = valid;
    expect(VocabCardSetSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects cards as a string", () => {
    expect(
      VocabCardSetSchema.safeParse({ ...valid, cards: "ecosystem card" }).success,
    ).toBe(false);
  });

  it("rejects missing target_language", () => {
    const { target_language, ...rest } = valid;
    expect(VocabCardSetSchema.safeParse(rest).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// message.ts
// ---------------------------------------------------------------------------

describe("FamilyMessageDraftSchema", () => {
  const valid = {
    draft_id: "msg-011",
    classroom_id: "cls-k2-meadow",
    student_refs: ["Ari"],
    message_type: "praise" as const,
    target_language: "English",
    plain_language_text: "Ari had a wonderful day today. Great participation in science!",
    teacher_approved: false,
    schema_version: "1.0.0",
  };

  it("accepts a valid family message draft", () => {
    expect(FamilyMessageDraftSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts with optional fields", () => {
    const withOptionals = {
      ...valid,
      simplified_student_text: "Ari did great today!",
      approval_timestamp: "2026-04-10T15:00:00Z",
    };
    expect(FamilyMessageDraftSchema.safeParse(withOptionals).success).toBe(true);
  });

  it("rejects invalid message_type", () => {
    expect(
      FamilyMessageDraftSchema.safeParse({ ...valid, message_type: "angry_rant" }).success,
    ).toBe(false);
  });

  it("rejects missing teacher_approved", () => {
    const { teacher_approved, ...rest } = valid;
    expect(FamilyMessageDraftSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects teacher_approved as string", () => {
    expect(
      FamilyMessageDraftSchema.safeParse({ ...valid, teacher_approved: "true" }).success,
    ).toBe(false);
  });

  it("accepts all valid message_type values", () => {
    for (const mt of ["routine_update", "missed_work", "praise", "low_stakes_concern"]) {
      expect(
        FamilyMessageDraftSchema.safeParse({ ...valid, message_type: mt }).success,
      ).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// pattern.ts
// ---------------------------------------------------------------------------

describe("RecurringThemeSchema", () => {
  const valid = {
    theme: "Transition difficulties after recess",
    student_refs: ["Mika", "Leo"],
    evidence_count: 4,
    example_observations: [
      "Lost focus after recess on Monday",
      "Needed extra transition support Wednesday",
    ],
  };

  it("accepts a valid recurring theme", () => {
    expect(RecurringThemeSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing evidence_count", () => {
    const { evidence_count, ...rest } = valid;
    expect(RecurringThemeSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects evidence_count as string", () => {
    expect(
      RecurringThemeSchema.safeParse({ ...valid, evidence_count: "four" }).success,
    ).toBe(false);
  });
});

describe("FollowUpGapSchema", () => {
  const valid = {
    original_record_id: "int-040",
    student_refs: ["Ari"],
    observation: "Tried sentence starters but no follow-up logged.",
    days_since: 5,
  };

  it("accepts a valid follow-up gap", () => {
    expect(FollowUpGapSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing original_record_id", () => {
    const { original_record_id, ...rest } = valid;
    expect(FollowUpGapSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects days_since as boolean", () => {
    expect(
      FollowUpGapSchema.safeParse({ ...valid, days_since: true }).success,
    ).toBe(false);
  });
});

describe("PositiveTrendSchema", () => {
  const valid = {
    student_ref: "Ari",
    description: "Independently used word wall during writing block two days in a row.",
    evidence: ["int-045: used word wall unprompted", "int-048: completed writing without scaffolding"],
  };

  it("accepts a valid positive trend", () => {
    expect(PositiveTrendSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing student_ref", () => {
    const { student_ref, ...rest } = valid;
    expect(PositiveTrendSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects evidence as a single string", () => {
    expect(
      PositiveTrendSchema.safeParse({ ...valid, evidence: "used word wall" }).success,
    ).toBe(false);
  });
});

describe("SuggestedFocusSchema", () => {
  const valid = {
    student_ref: "Mika",
    reason: "Three transition incidents this week.",
    suggested_action: "Add visual timer and 2-minute warning before transitions.",
    priority: "high" as const,
  };

  it("accepts a valid suggested focus", () => {
    expect(SuggestedFocusSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid priority enum", () => {
    expect(
      SuggestedFocusSchema.safeParse({ ...valid, priority: "critical" }).success,
    ).toBe(false);
  });

  it("rejects missing reason", () => {
    const { reason, ...rest } = valid;
    expect(SuggestedFocusSchema.safeParse(rest).success).toBe(false);
  });
});

describe("SupportPatternReportSchema", () => {
  const valid = {
    report_id: "spr-001",
    classroom_id: "cls-k2-meadow",
    student_filter: null,
    time_window: 14,
    recurring_themes: [
      {
        theme: "Post-recess transition difficulties",
        student_refs: ["Mika"],
        evidence_count: 3,
        example_observations: ["Needed extra support after recess Monday"],
      },
    ],
    follow_up_gaps: [],
    positive_trends: [
      {
        student_ref: "Ari",
        description: "Independent word wall use increasing.",
        evidence: ["int-045"],
      },
    ],
    suggested_focus: [
      {
        student_ref: "Mika",
        reason: "Recurring transition difficulties.",
        suggested_action: "Visual timer before transitions.",
        priority: "medium" as const,
      },
    ],
    generated_at: "2026-04-10T08:00:00Z",
    schema_version: "1.0.0",
  };

  it("accepts a complete valid report", () => {
    expect(SupportPatternReportSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts student_filter as a string", () => {
    expect(
      SupportPatternReportSchema.safeParse({ ...valid, student_filter: "Ari" }).success,
    ).toBe(true);
  });

  it("rejects missing time_window", () => {
    const { time_window, ...rest } = valid;
    expect(SupportPatternReportSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects time_window as string", () => {
    expect(
      SupportPatternReportSchema.safeParse({ ...valid, time_window: "two weeks" }).success,
    ).toBe(false);
  });

  it("rejects student_filter as number (must be string or null)", () => {
    expect(
      SupportPatternReportSchema.safeParse({ ...valid, student_filter: 123 }).success,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// plan.ts
// ---------------------------------------------------------------------------

describe("TransitionWatchpointSchema", () => {
  const valid = {
    time_or_activity: "After recess (10:15)",
    risk_description: "Mika struggles with re-entry after outdoor time.",
    suggested_mitigation: "Meet at door with visual schedule.",
  };

  it("accepts a valid watchpoint", () => {
    expect(TransitionWatchpointSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing risk_description", () => {
    const { risk_description, ...rest } = valid;
    expect(TransitionWatchpointSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects suggested_mitigation as number", () => {
    expect(
      TransitionWatchpointSchema.safeParse({ ...valid, suggested_mitigation: 0 }).success,
    ).toBe(false);
  });
});

describe("SupportPrioritySchema", () => {
  const valid = {
    student_ref: "Ari",
    reason: "Returning from 2-day absence, needs re-entry support.",
    suggested_action: "Check in during morning circle; preview day schedule.",
  };

  it("accepts a valid support priority", () => {
    expect(SupportPrioritySchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing student_ref", () => {
    const { student_ref, ...rest } = valid;
    expect(SupportPrioritySchema.safeParse(rest).success).toBe(false);
  });

  it("rejects reason as boolean", () => {
    expect(
      SupportPrioritySchema.safeParse({ ...valid, reason: true }).success,
    ).toBe(false);
  });
});

describe("EAActionSchema", () => {
  const valid = {
    description: "Support Ari and Mika with guided reading group.",
    student_refs: ["Ari", "Mika"],
    timing: "9:00-9:45",
  };

  it("accepts a valid EA action", () => {
    expect(EAActionSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing student_refs", () => {
    const { student_refs, ...rest } = valid;
    expect(EAActionSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects timing as number", () => {
    expect(
      EAActionSchema.safeParse({ ...valid, timing: 900 }).success,
    ).toBe(false);
  });
});

describe("FamilyFollowupSchema", () => {
  const valid = {
    student_ref: "Leo",
    reason: "Missed homework two days this week.",
    message_type: "missed_work",
  };

  it("accepts a valid family followup", () => {
    expect(FamilyFollowupSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing message_type", () => {
    const { message_type, ...rest } = valid;
    expect(FamilyFollowupSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects student_ref as number", () => {
    expect(
      FamilyFollowupSchema.safeParse({ ...valid, student_ref: 42 }).success,
    ).toBe(false);
  });
});

describe("TomorrowPlanSchema", () => {
  const valid = {
    plan_id: "plan-011",
    classroom_id: "cls-34-river",
    source_artifact_ids: ["art-101", "art-102"],
    transition_watchpoints: [
      {
        time_or_activity: "After recess",
        risk_description: "Transition difficulty expected for Mika.",
        suggested_mitigation: "Visual timer at door.",
      },
    ],
    support_priorities: [
      {
        student_ref: "Ari",
        reason: "Returning from absence.",
        suggested_action: "Morning check-in.",
      },
    ],
    ea_actions: [
      {
        description: "Guided reading support.",
        student_refs: ["Ari", "Mika"],
        timing: "9:00-9:45",
      },
    ],
    prep_checklist: ["Print chunked worksheet for Mika", "Charge tablet for Ari"],
    family_followups: [
      { student_ref: "Leo", reason: "Missed homework.", message_type: "missed_work" },
    ],
    schema_version: "1.0.0",
  };

  it("accepts a complete valid tomorrow plan", () => {
    expect(TomorrowPlanSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing classroom_id", () => {
    const { classroom_id, ...rest } = valid;
    expect(TomorrowPlanSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects prep_checklist as a single string", () => {
    expect(
      TomorrowPlanSchema.safeParse({ ...valid, prep_checklist: "print worksheets" }).success,
    ).toBe(false);
  });

  it("rejects source_artifact_ids as number array", () => {
    expect(
      TomorrowPlanSchema.safeParse({ ...valid, source_artifact_ids: [1, 2] }).success,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// scaffold-decay.ts
// ---------------------------------------------------------------------------

describe("ScaffoldUsageTrendSchema", () => {
  const valid = {
    scaffold_name: "visual timer",
    early_window_count: 5,
    early_window_total: 8,
    recent_window_count: 2,
    recent_window_total: 8,
    trend: "decaying" as const,
  };

  it("accepts a valid usage trend", () => {
    expect(ScaffoldUsageTrendSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid trend enum", () => {
    expect(
      ScaffoldUsageTrendSchema.safeParse({ ...valid, trend: "unknown" }).success,
    ).toBe(false);
  });

  it("rejects early_window_count as string", () => {
    expect(
      ScaffoldUsageTrendSchema.safeParse({ ...valid, early_window_count: "five" }).success,
    ).toBe(false);
  });
});

describe("PositiveSignalSchema", () => {
  const valid = {
    description: "Used word wall independently during writing.",
    source_record_id: "int-045",
  };

  it("accepts a valid positive signal", () => {
    expect(PositiveSignalSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing source_record_id", () => {
    const { source_record_id, ...rest } = valid;
    expect(PositiveSignalSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects description as array", () => {
    expect(
      PositiveSignalSchema.safeParse({ ...valid, description: ["signal"] }).success,
    ).toBe(false);
  });
});

describe("WithdrawalPhaseSchema", () => {
  const valid = {
    phase_number: 1,
    description: "Reduce visual timer prompts from every transition to two per day.",
    duration_weeks: 2,
    success_criteria: "Mika self-transitions 3 of 5 times without timer.",
  };

  it("accepts a valid withdrawal phase", () => {
    expect(WithdrawalPhaseSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing phase_number", () => {
    const { phase_number, ...rest } = valid;
    expect(WithdrawalPhaseSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects duration_weeks as string", () => {
    expect(
      WithdrawalPhaseSchema.safeParse({ ...valid, duration_weeks: "two" }).success,
    ).toBe(false);
  });
});

describe("ScaffoldReviewSchema", () => {
  const valid = {
    scaffold_name: "visual timer",
    usage_trend: {
      scaffold_name: "visual timer",
      early_window_count: 5,
      early_window_total: 8,
      recent_window_count: 2,
      recent_window_total: 8,
      trend: "decaying" as const,
    },
    positive_signals: [
      { description: "Self-transitioned twice this week.", source_record_id: "int-050" },
    ],
    withdrawal_plan: [
      {
        phase_number: 1,
        description: "Reduce to 2 prompts/day.",
        duration_weeks: 2,
        success_criteria: "3 of 5 self-transitions.",
      },
    ],
    regression_protocol: "If Mika needs timer 3+ times in a day, revert to full support for one week.",
    confidence: "medium" as const,
  };

  it("accepts a valid scaffold review", () => {
    expect(ScaffoldReviewSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid confidence enum", () => {
    expect(
      ScaffoldReviewSchema.safeParse({ ...valid, confidence: "very_high" }).success,
    ).toBe(false);
  });

  it("rejects missing regression_protocol", () => {
    const { regression_protocol, ...rest } = valid;
    expect(ScaffoldReviewSchema.safeParse(rest).success).toBe(false);
  });
});

describe("ScaffoldDecayReportSchema", () => {
  const valid = {
    report_id: "sdr-001",
    classroom_id: "cls-34-river",
    student_ref: "Mika",
    reviews: [
      {
        scaffold_name: "visual timer",
        usage_trend: {
          scaffold_name: "visual timer",
          early_window_count: 5,
          early_window_total: 8,
          recent_window_count: 2,
          recent_window_total: 8,
          trend: "decaying" as const,
        },
        positive_signals: [],
        withdrawal_plan: [],
        regression_protocol: "Revert if regression observed.",
        confidence: "low" as const,
      },
    ],
    summary: "Visual timer usage decreasing. Consider phased withdrawal.",
    generated_at: "2026-04-10T08:00:00Z",
    schema_version: "1.0.0",
  };

  it("accepts a valid scaffold decay report", () => {
    expect(ScaffoldDecayReportSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing student_ref", () => {
    const { student_ref, ...rest } = valid;
    expect(ScaffoldDecayReportSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects reviews as a string", () => {
    expect(
      ScaffoldDecayReportSchema.safeParse({ ...valid, reviews: "see report" }).success,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// survival-packet.ts
// ---------------------------------------------------------------------------

describe("RoutineEntrySchema", () => {
  const valid = {
    time_or_label: "8:30 - Morning Arrival",
    description: "Students unpack, put folders in bin, start morning work.",
    recent_changes: "New seating chart as of Monday.",
  };

  it("accepts a valid routine entry", () => {
    expect(RoutineEntrySchema.safeParse(valid).success).toBe(true);
  });

  it("accepts without optional recent_changes", () => {
    const { recent_changes, ...rest } = valid;
    expect(RoutineEntrySchema.safeParse(rest).success).toBe(true);
  });

  it("rejects missing description", () => {
    const { description, ...rest } = valid;
    expect(RoutineEntrySchema.safeParse(rest).success).toBe(false);
  });

  it("rejects time_or_label as number", () => {
    expect(
      RoutineEntrySchema.safeParse({ ...valid, time_or_label: 830 }).success,
    ).toBe(false);
  });
});

describe("StudentSupportEntrySchema", () => {
  const valid = {
    student_ref: "Ari",
    current_scaffolds: ["word wall", "sentence starters", "visual schedule"],
    key_strategies: "Pre-teach vocabulary before new content. Allow extra processing time.",
    things_to_avoid: "Do not cold-call. Ari shuts down if put on the spot.",
  };

  it("accepts a valid student support entry", () => {
    expect(StudentSupportEntrySchema.safeParse(valid).success).toBe(true);
  });

  it("accepts without optional things_to_avoid", () => {
    const { things_to_avoid, ...rest } = valid;
    expect(StudentSupportEntrySchema.safeParse(rest).success).toBe(true);
  });

  it("rejects missing current_scaffolds", () => {
    const { current_scaffolds, ...rest } = valid;
    expect(StudentSupportEntrySchema.safeParse(rest).success).toBe(false);
  });

  it("rejects current_scaffolds as string", () => {
    expect(
      StudentSupportEntrySchema.safeParse({ ...valid, current_scaffolds: "word wall" }).success,
    ).toBe(false);
  });
});

describe("EACoordinationSchema", () => {
  const valid = {
    ea_name: "Ms. Fehr",
    schedule_summary: "Available 9:00-12:00 Mon-Wed-Fri.",
    primary_students: ["Ari", "Mika"],
    if_ea_absent: "Teacher takes small group. Mika uses visual timer independently.",
  };

  it("accepts a complete EA coordination entry", () => {
    expect(EACoordinationSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts without optional ea_name", () => {
    const { ea_name, ...rest } = valid;
    expect(EACoordinationSchema.safeParse(rest).success).toBe(true);
  });

  it("rejects missing if_ea_absent", () => {
    const { if_ea_absent, ...rest } = valid;
    expect(EACoordinationSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects primary_students as string", () => {
    expect(
      EACoordinationSchema.safeParse({ ...valid, primary_students: "Ari" }).success,
    ).toBe(false);
  });
});

describe("SimplifiedDayPlanSchema", () => {
  const valid = {
    time_slot: "9:00-10:00",
    activity: "Math - Fractions Review",
    sub_instructions: "Students complete worksheet on pg. 42. Answer key in blue binder.",
    materials_location: "Blue binder on teacher desk, worksheets in tray 3.",
  };

  it("accepts a valid day plan entry", () => {
    expect(SimplifiedDayPlanSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts without optional materials_location", () => {
    const { materials_location, ...rest } = valid;
    expect(SimplifiedDayPlanSchema.safeParse(rest).success).toBe(true);
  });

  it("rejects missing sub_instructions", () => {
    const { sub_instructions, ...rest } = valid;
    expect(SimplifiedDayPlanSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects activity as number", () => {
    expect(
      SimplifiedDayPlanSchema.safeParse({ ...valid, activity: 1 }).success,
    ).toBe(false);
  });
});

describe("FamilyCommsEntrySchema", () => {
  const valid = {
    student_ref: "Ari",
    status: "defer_to_teacher" as const,
    language_preference: "Tagalog",
    notes: "Family prefers written communication. Do not call.",
  };

  it("accepts a valid family comms entry", () => {
    expect(FamilyCommsEntrySchema.safeParse(valid).success).toBe(true);
  });

  it("accepts all valid status values", () => {
    for (const s of ["do_not_contact", "defer_to_teacher", "routine_ok", "expecting_message"]) {
      expect(
        FamilyCommsEntrySchema.safeParse({ ...valid, status: s }).success,
      ).toBe(true);
    }
  });

  it("rejects invalid status", () => {
    expect(
      FamilyCommsEntrySchema.safeParse({ ...valid, status: "call_immediately" }).success,
    ).toBe(false);
  });

  it("rejects missing notes", () => {
    const { notes, ...rest } = valid;
    expect(FamilyCommsEntrySchema.safeParse(rest).success).toBe(false);
  });
});

describe("ComplexityPeakSchema", () => {
  const valid = {
    time_slot: "10:00-10:45",
    level: "high" as const,
    reason: "Outdoor transition plus EA unavailable.",
    mitigation: "Pair students with buddies for outdoor portion.",
  };

  it("accepts a valid complexity peak", () => {
    expect(ComplexityPeakSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid level", () => {
    expect(
      ComplexityPeakSchema.safeParse({ ...valid, level: "extreme" }).success,
    ).toBe(false);
  });

  it("rejects missing mitigation", () => {
    const { mitigation, ...rest } = valid;
    expect(ComplexityPeakSchema.safeParse(rest).success).toBe(false);
  });
});

describe("SurvivalPacketSchema", () => {
  const valid = {
    packet_id: "sp-001",
    classroom_id: "cls-k2-meadow",
    generated_for_date: "2026-04-11",
    routines: [
      {
        time_or_label: "8:30 - Arrival",
        description: "Unpack, morning work on desks.",
      },
    ],
    student_support: [
      {
        student_ref: "Ari",
        current_scaffolds: ["word wall", "sentence starters"],
        key_strategies: "Pre-teach vocab. Extra processing time.",
      },
    ],
    ea_coordination: {
      schedule_summary: "Ms. Fehr available 9-12.",
      primary_students: ["Ari", "Mika"],
      if_ea_absent: "Teacher takes small group.",
    },
    simplified_day_plan: [
      {
        time_slot: "9:00-10:00",
        activity: "Math",
        sub_instructions: "Worksheet pg 42. Answer key in blue binder.",
      },
    ],
    family_comms: [
      {
        student_ref: "Ari",
        status: "defer_to_teacher" as const,
        notes: "Do not contact family directly.",
      },
    ],
    complexity_peaks: [
      {
        time_slot: "10:00-10:45",
        level: "high" as const,
        reason: "Outdoor transition.",
        mitigation: "Buddy system.",
      },
    ],
    heads_up: ["Assembly at 1:30 - students need gym shoes"],
    schema_version: "1.0.0",
  };

  it("accepts a complete valid survival packet", () => {
    expect(SurvivalPacketSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing ea_coordination (not an array, single object)", () => {
    const { ea_coordination, ...rest } = valid;
    expect(SurvivalPacketSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects ea_coordination as array instead of object", () => {
    expect(
      SurvivalPacketSchema.safeParse({
        ...valid,
        ea_coordination: [valid.ea_coordination],
      }).success,
    ).toBe(false);
  });

  it("rejects missing heads_up", () => {
    const { heads_up, ...rest } = valid;
    expect(SurvivalPacketSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects heads_up as a string instead of array", () => {
    expect(
      SurvivalPacketSchema.safeParse({ ...valid, heads_up: "assembly at 1:30" }).success,
    ).toBe(false);
  });

  it("rejects missing generated_for_date", () => {
    const { generated_for_date, ...rest } = valid;
    expect(SurvivalPacketSchema.safeParse(rest).success).toBe(false);
  });
});
