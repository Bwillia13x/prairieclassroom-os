/**
 * PrairieClassroom OS — Comprehensive prompt builder & parser tests.
 *
 * Covers all 12 prompt classes:
 *   differentiate, tomorrow-plan, family-message, intervention,
 *   simplify, vocab-cards, support-patterns, ea-briefing,
 *   complexity-forecast, scaffold-decay, survival-packet, extract-worksheet
 */
import { describe, it, expect } from "vitest";

import type { ClassroomProfile } from "../../../packages/shared/schemas/classroom.js";
import type { LessonArtifact } from "../../../packages/shared/schemas/artifact.js";

import { buildDifferentiationPrompt, parseVariantsResponse } from "../differentiate.js";
import { buildTomorrowPlanPrompt, parseTomorrowPlanResponse } from "../tomorrow-plan.js";
import { buildFamilyMessagePrompt, parseFamilyMessageResponse } from "../family-message.js";
import { buildInterventionPrompt, parseInterventionResponse } from "../intervention.js";
import { buildSimplifyPrompt, parseSimplifyResponse } from "../simplify.js";
import { buildVocabCardsPrompt, parseVocabCardsResponse } from "../vocab-cards.js";
import { buildSupportPatternsPrompt, parseSupportPatternsResponse } from "../support-patterns.js";
import { buildEABriefingPrompt, parseEABriefingResponse } from "../ea-briefing.js";
import { buildComplexityForecastPrompt, parseComplexityForecastResponse } from "../complexity-forecast.js";
import { buildScaffoldDecayPrompt, parseScaffoldDecayResponse } from "../scaffold-decay.js";
import { buildSurvivalPacketPrompt, parseSurvivalPacketResponse } from "../survival-packet.js";
import { buildExtractionPrompt, parseExtractionResponse } from "../extract-worksheet.js";

// ---------------------------------------------------------------------------
// Shared fixture — realistic Alberta K-6 split-grade classroom
// ---------------------------------------------------------------------------
const DEMO_CLASSROOM: ClassroomProfile = {
  classroom_id: "test-classroom",
  grade_band: "3-4",
  subject_focus: "cross_curricular",
  classroom_notes: ["Split grade 3/4 class", "EA available mornings only"],
  routines: { morning: "bell work", after_lunch: "math block" },
  students: [
    {
      student_id: "T1",
      alias: "Ari",
      eal_flag: true,
      support_tags: ["eal_level_2", "needs_visual_supports"],
      known_successful_scaffolds: ["visual_step_cards"],
    },
    {
      student_id: "T2",
      alias: "Mika",
      eal_flag: false,
      support_tags: ["attention_during_transitions"],
      known_successful_scaffolds: ["advance_notice"],
    },
  ],
};

const DEMO_ARTIFACT: LessonArtifact = {
  artifact_id: "art-001",
  title: "Place Value to 1 000",
  subject: "Mathematics",
  source_type: "text",
  raw_text: "Students will represent numbers to 1 000 using base-ten blocks and expanded form.",
};

// ---------------------------------------------------------------------------
// Helpers to check standard prompt properties across all builders
// ---------------------------------------------------------------------------
function expectStandardSystemPrompt(system: string) {
  it("includes PrairieClassroom OS identity", () => {
    expect(system).toContain("PrairieClassroom OS");
  });

  it("includes PROMPT SAFETY notice", () => {
    expect(system).toContain("PROMPT SAFETY:");
    expect(system).toContain("untrusted-data");
  });
}

function expectClassroomContext(user: string) {
  it("includes student aliases", () => {
    expect(user).toContain("Ari");
    expect(user).toContain("Mika");
  });

  it("includes grade band", () => {
    expect(user).toContain("3-4");
  });

  it("includes subject focus", () => {
    expect(user).toContain("cross_curricular");
  });

  it("includes classroom notes", () => {
    expect(user).toContain("Split grade 3/4 class");
    expect(user).toContain("EA available mornings only");
  });
}

function expectUntrustedDataWrapping(text: string, label: string) {
  it(`wraps user content in <untrusted-data label="${label}">`, () => {
    expect(text).toContain(`<untrusted-data label="${label}">`);
    expect(text).toContain("</untrusted-data>");
  });
}

// ---------------------------------------------------------------------------
// Parser test helpers
// ---------------------------------------------------------------------------
function wrapInFence(json: string): string {
  return "```json\n" + json + "\n```";
}

// ===================================================================
// 1. DIFFERENTIATE
// ===================================================================
describe("differentiate", () => {
  const prompt = buildDifferentiationPrompt(DEMO_ARTIFACT, DEMO_CLASSROOM);

  describe("buildDifferentiationPrompt", () => {
    expectStandardSystemPrompt(prompt.system);
    expectClassroomContext(prompt.user);
    expectUntrustedDataWrapping(prompt.user, "artifact_raw_text");

    it("includes artifact title and subject", () => {
      expect(prompt.user).toContain("Place Value to 1 000");
      expect(prompt.user).toContain("Mathematics");
    });

    it("wraps teacher goal when provided", () => {
      const withGoal = buildDifferentiationPrompt(DEMO_ARTIFACT, DEMO_CLASSROOM, "Focus on number sense");
      expect(withGoal.user).toContain(`<untrusted-data label="teacher_goal">`);
      expect(withGoal.user).toContain("Focus on number sense");
    });

    it("includes Alberta curriculum context when provided", () => {
      const withCurriculum = buildDifferentiationPrompt(
        DEMO_ARTIFACT,
        DEMO_CLASSROOM,
        undefined,
        "ALBERTA CURRICULUM ALIGNMENT: Mathematics Grade 3\n- represent numbers to 1 000",
      );
      expect(withCurriculum.user).toContain("ALBERTA CURRICULUM ALIGNMENT");
      expect(withCurriculum.user).toContain("represent numbers to 1 000");
    });

    it("omits teacher goal section when not provided", () => {
      expect(prompt.user).not.toContain("TEACHER GOAL:");
    });
  });

  describe("parseVariantsResponse", () => {
    const validArray = JSON.stringify([
      { variant_type: "core", title: "Core Place Value", student_facing_instructions: "Use blocks", teacher_notes: "Monitor", required_materials: ["base-ten blocks"], estimated_minutes: 25 },
      { variant_type: "eal_supported", title: "EAL Place Value", student_facing_instructions: "Look at pictures", teacher_notes: "Pre-teach", required_materials: ["picture cards"], estimated_minutes: 30 },
      { variant_type: "chunked", title: "Step-by-Step", student_facing_instructions: "Step 1...", teacher_notes: "Check in", required_materials: [], estimated_minutes: 35 },
      { variant_type: "ea_small_group", title: "Small Group", student_facing_instructions: "Work with EA", teacher_notes: "EA leads", required_materials: ["workmat"], estimated_minutes: 20 },
      { variant_type: "extension", title: "Challenge", student_facing_instructions: "Explore 10 000", teacher_notes: "Self-directed", required_materials: [], estimated_minutes: 20 },
    ]);

    it("parses valid JSON array", () => {
      const result = parseVariantsResponse(validArray, "art-001");
      expect(result).toHaveLength(5);
      expect(result[0].variant_type).toBe("core");
      expect(result[0].artifact_id).toBe("art-001");
      expect(result[0].variant_id).toBe("art-001-v0");
      expect(result[0].schema_version).toBe("0.1.0");
    });

    it("handles markdown-fenced JSON", () => {
      const result = parseVariantsResponse(wrapInFence(validArray), "art-001");
      expect(result).toHaveLength(5);
      expect(result[0].variant_type).toBe("core");
    });

    it("defaults missing optional fields", () => {
      const minimal = JSON.stringify([{}, {}, {}, {}, {}]);
      const result = parseVariantsResponse(minimal, "art-001");
      expect(result).toHaveLength(5);
      expect(result[0].title).toBe("Variant 1");
      expect(result[0].estimated_minutes).toBe(20);
      expect(result[0].required_materials).toEqual([]);
      expect(result[0].variant_type).toBe("core"); // falls back to VARIANT_TYPES[0]
    });

    it("throws on non-JSON input", () => {
      expect(() => parseVariantsResponse("not json at all", "art-001")).toThrow();
    });

    it("throws when response is an object instead of array", () => {
      expect(() => parseVariantsResponse('{"variants": []}', "art-001")).toThrow("Expected JSON array");
    });

    it("rejects invalid variant_type and falls back to the positional default", () => {
      // Safety check: the model can return an out-of-enum variant_type like
      // "honours". The parser must never silently cast it — fall back to the
      // canonical positional default (slot 0 = "core").
      const withInvalidType = JSON.stringify([
        { variant_type: "honours", title: "A" },
        { variant_type: "eal_supported", title: "B" },
        { variant_type: "chunked", title: "C" },
        { variant_type: "ea_small_group", title: "D" },
        { variant_type: "extension", title: "E" },
      ]);
      const result = parseVariantsResponse(withInvalidType, "art-001");
      expect(result[0].variant_type).toBe("core");
      expect(result[1].variant_type).toBe("eal_supported");
      expect(result[4].variant_type).toBe("extension");
    });

    it("bounds estimated_minutes to a sane range", () => {
      const withBadMinutes = JSON.stringify([
        { variant_type: "core", estimated_minutes: -5 },
        { variant_type: "eal_supported", estimated_minutes: 99999 },
        { variant_type: "chunked", estimated_minutes: "abc" },
        { variant_type: "ea_small_group", estimated_minutes: 30 },
        { variant_type: "extension", estimated_minutes: 0 },
      ]);
      const result = parseVariantsResponse(withBadMinutes, "art-001");
      expect(result[0].estimated_minutes).toBe(20);
      expect(result[1].estimated_minutes).toBe(480);
      expect(result[2].estimated_minutes).toBe(20);
      expect(result[3].estimated_minutes).toBe(30);
      expect(result[4].estimated_minutes).toBe(20);
    });
  });
});

// ===================================================================
// 2. TOMORROW PLAN
// ===================================================================
describe("tomorrow-plan", () => {
  const planInput = {
    classroom_id: "test-classroom",
    teacher_reflection: "Ari struggled with transitions after recess. Mika did well during math block.",
  };

  describe("buildTomorrowPlanPrompt", () => {
    const prompt = buildTomorrowPlanPrompt(DEMO_CLASSROOM, planInput);
    expectStandardSystemPrompt(prompt.system);
    expectClassroomContext(prompt.user);
    expectUntrustedDataWrapping(prompt.user, "teacher_reflection");

    it("includes routines", () => {
      expect(prompt.user).toContain("morning: bell work");
      expect(prompt.user).toContain("after_lunch: math block");
    });

    it("includes memory summary when provided", () => {
      const withMemory = buildTomorrowPlanPrompt(DEMO_CLASSROOM, planInput, "Ari has been improving with visual cues");
      expect(withMemory.user).toContain("CLASSROOM MEMORY:");
      expect(withMemory.user).toContain(`<untrusted-data label="classroom_memory">`);
      expect(withMemory.user).toContain("Ari has been improving");
    });

    it("omits memory section when not provided", () => {
      const prompt = buildTomorrowPlanPrompt(DEMO_CLASSROOM, planInput);
      expect(prompt.user).not.toContain("CLASSROOM MEMORY:");
    });

    it("includes intervention summary when provided", () => {
      const withInt = buildTomorrowPlanPrompt(DEMO_CLASSROOM, planInput, undefined, "Visual timer helped Ari settle");
      expect(withInt.user).toContain("RECENT INTERVENTIONS:");
      expect(withInt.user).toContain(`<untrusted-data label="intervention_summary">`);
    });

    it("omits intervention section when not provided", () => {
      expect(buildTomorrowPlanPrompt(DEMO_CLASSROOM, planInput).user).not.toContain("RECENT INTERVENTIONS:");
    });

    it("includes pattern insights when provided", () => {
      const withPat = buildTomorrowPlanPrompt(DEMO_CLASSROOM, planInput, undefined, undefined, "Ari shows recurring post-recess difficulty");
      expect(withPat.user).toContain("PATTERN INSIGHTS");
      expect(withPat.user).toContain(`<untrusted-data label="pattern_insights">`);
    });

    it("omits pattern insights when not provided", () => {
      expect(buildTomorrowPlanPrompt(DEMO_CLASSROOM, planInput).user).not.toContain("PATTERN INSIGHTS");
    });
  });

  describe("parseTomorrowPlanResponse", () => {
    const validPlan = JSON.stringify({
      transition_watchpoints: [{ time_or_activity: "after recess", risk_description: "Ari may need extra support", suggested_mitigation: "Use visual timer" }],
      support_priorities: [{ student_ref: "Ari", reason: "Post-recess difficulty", suggested_action: "Pre-cue transition" }],
      ea_actions: [{ description: "Support Ari during math", student_refs: ["Ari"], timing: "10:00-10:40" }],
      prep_checklist: ["Print visual schedule", "Set up timer"],
      family_followups: [{ student_ref: "Mika", reason: "Great math day", message_type: "praise" }],
    });

    it("parses valid JSON object", () => {
      const result = parseTomorrowPlanResponse(validPlan, "test-classroom", ["art-001"]);
      expect(result.classroom_id).toBe("test-classroom");
      expect(result.source_artifact_ids).toEqual(["art-001"]);
      expect(result.transition_watchpoints).toHaveLength(1);
      expect(result.support_priorities).toHaveLength(1);
      expect(result.ea_actions).toHaveLength(1);
      expect(result.prep_checklist).toHaveLength(2);
      expect(result.family_followups).toHaveLength(1);
      expect(result.schema_version).toBe("0.1.0");
      expect(result.plan_id).toMatch(/^plan-test-classroom-/);
    });

    it("handles markdown-fenced JSON", () => {
      const result = parseTomorrowPlanResponse(wrapInFence(validPlan), "test-classroom", []);
      expect(result.transition_watchpoints).toHaveLength(1);
    });

    it("defaults missing arrays to empty", () => {
      const result = parseTomorrowPlanResponse("{}", "test-classroom", []);
      expect(result.transition_watchpoints).toEqual([]);
      expect(result.support_priorities).toEqual([]);
      expect(result.ea_actions).toEqual([]);
      expect(result.prep_checklist).toEqual([]);
      expect(result.family_followups).toEqual([]);
    });

    it("throws on non-JSON input", () => {
      expect(() => parseTomorrowPlanResponse("Here is your plan:", "c", [])).toThrow();
    });

    it("throws when response is an array instead of object", () => {
      expect(() => parseTomorrowPlanResponse("[1,2,3]", "c", [])).toThrow("Expected JSON object");
    });
  });
});

// ===================================================================
// 3. FAMILY MESSAGE
// ===================================================================
describe("family-message", () => {
  const msgInput = {
    classroom_id: "test-classroom",
    student_refs: ["Ari"],
    message_type: "praise" as const,
    target_language: "en",
    context: "Ari completed all math problems independently for the first time.",
  };

  describe("buildFamilyMessagePrompt", () => {
    const prompt = buildFamilyMessagePrompt(DEMO_CLASSROOM, msgInput);
    expectStandardSystemPrompt(prompt.system);

    it("includes student alias and profile", () => {
      expect(prompt.user).toContain("Ari");
      expect(prompt.user).toContain("EAL");
    });

    it("includes grade band and subject", () => {
      expect(prompt.user).toContain("3-4");
      expect(prompt.user).toContain("cross_curricular");
    });

    it("includes message type and language", () => {
      expect(prompt.user).toContain("praise");
      expect(prompt.user).toContain("en");
    });

    expectUntrustedDataWrapping(
      buildFamilyMessagePrompt(DEMO_CLASSROOM, msgInput).user,
      "message_context",
    );

    it("omits context section when not provided", () => {
      const noCtx = buildFamilyMessagePrompt(DEMO_CLASSROOM, { ...msgInput, context: undefined });
      expect(noCtx.user).not.toContain("\nCONTEXT:\n");
    });

    it("handles unknown student ref gracefully", () => {
      const unknown = buildFamilyMessagePrompt(DEMO_CLASSROOM, { ...msgInput, student_refs: ["Zara"] });
      expect(unknown.user).toContain("Zara: (no profile found)");
    });
  });

  describe("parseFamilyMessageResponse", () => {
    const validMsg = JSON.stringify({
      student_refs: ["Ari"],
      message_type: "praise",
      target_language: "en",
      plain_language_text: "Ari had a wonderful day in math today!",
      simplified_student_text: "You did great in math!",
    });

    it("parses valid JSON object", () => {
      const result = parseFamilyMessageResponse(validMsg, "test-classroom", msgInput);
      expect(result.classroom_id).toBe("test-classroom");
      expect(result.student_refs).toEqual(["Ari"]);
      expect(result.message_type).toBe("praise");
      expect(result.plain_language_text).toContain("wonderful day");
      expect(result.simplified_student_text).toBe("You did great in math!");
      expect(result.teacher_approved).toBe(false);
      expect(result.schema_version).toBe("0.1.0");
    });

    it("handles markdown-fenced JSON", () => {
      const result = parseFamilyMessageResponse(wrapInFence(validMsg), "test-classroom", msgInput);
      expect(result.plain_language_text).toContain("wonderful day");
    });

    it("defaults simplified_student_text to undefined when absent", () => {
      const noSimplified = JSON.stringify({ plain_language_text: "Great day!" });
      const result = parseFamilyMessageResponse(noSimplified, "c", msgInput);
      expect(result.simplified_student_text).toBeUndefined();
    });

    it("throws on non-JSON input", () => {
      expect(() => parseFamilyMessageResponse("Not JSON", "c", msgInput)).toThrow();
    });

    it("throws when response is an array", () => {
      expect(() => parseFamilyMessageResponse("[]", "c", msgInput)).toThrow("Expected JSON object");
    });
  });
});

// ===================================================================
// 4. INTERVENTION
// ===================================================================
describe("intervention", () => {
  const intInput = {
    classroom_id: "test-classroom",
    student_refs: ["Mika"],
    teacher_note: "Mika had trouble settling after lunch. I used advance notice for the transition and it helped.",
    context: "Tomorrow plan flagged post-lunch transitions for Mika.",
  };

  describe("buildInterventionPrompt", () => {
    const prompt = buildInterventionPrompt(DEMO_CLASSROOM, intInput);
    expectStandardSystemPrompt(prompt.system);

    it("includes student alias and profile", () => {
      expect(prompt.user).toContain("Mika");
      expect(prompt.user).toContain("attention_during_transitions");
      expect(prompt.user).toContain("advance_notice");
    });

    it("includes grade band and subject", () => {
      expect(prompt.user).toContain("3-4");
      expect(prompt.user).toContain("cross_curricular");
    });

    expectUntrustedDataWrapping(
      buildInterventionPrompt(DEMO_CLASSROOM, intInput).user,
      "teacher_note",
    );

    it("wraps plan context when provided", () => {
      expect(prompt.user).toContain(`<untrusted-data label="plan_context">`);
      expect(prompt.user).toContain("Tomorrow plan flagged");
    });

    it("omits plan context when not provided", () => {
      const noCtx = buildInterventionPrompt(DEMO_CLASSROOM, { ...intInput, context: undefined });
      expect(noCtx.user).not.toContain("CONTEXT FROM PLAN:");
    });
  });

  describe("parseInterventionResponse", () => {
    const validInt = JSON.stringify({
      observation: "Mika had difficulty settling after the lunch break",
      action_taken: "Used advance notice strategy for the transition",
      outcome: "Mika settled within 3 minutes",
      follow_up_needed: true,
    });

    it("parses valid JSON object", () => {
      const result = parseInterventionResponse(validInt, "test-classroom", intInput);
      expect(result.classroom_id).toBe("test-classroom");
      expect(result.student_refs).toEqual(["Mika"]);
      expect(result.observation).toContain("difficulty settling");
      expect(result.action_taken).toContain("advance notice");
      expect(result.outcome).toContain("3 minutes");
      expect(result.follow_up_needed).toBe(true);
      expect(result.record_id).toMatch(/^int-test-classroom-/);
      expect(result.schema_version).toBe("0.1.0");
    });

    it("handles markdown-fenced JSON", () => {
      const result = parseInterventionResponse(wrapInFence(validInt), "test-classroom", intInput);
      expect(result.observation).toContain("difficulty settling");
    });

    it("defaults outcome to undefined and follow_up_needed to false", () => {
      const minimal = JSON.stringify({ observation: "Arrived late", action_taken: "Checked in" });
      const result = parseInterventionResponse(minimal, "c", intInput);
      expect(result.outcome).toBeUndefined();
      expect(result.follow_up_needed).toBe(false);
    });

    it("throws on non-JSON input", () => {
      expect(() => parseInterventionResponse("random text", "c", intInput)).toThrow();
    });

    it("throws when response is an array", () => {
      expect(() => parseInterventionResponse("[]", "c", intInput)).toThrow("Expected JSON object");
    });
  });
});

// ===================================================================
// 5. SIMPLIFY
// ===================================================================
describe("simplify", () => {
  const simpInput = {
    source_text: "Represent and describe whole numbers to 1 000 pictorially and symbolically.",
    grade_band: "3-4",
    eal_level: "beginner" as const,
  };

  describe("buildSimplifyPrompt", () => {
    const prompt = buildSimplifyPrompt(simpInput);
    expectStandardSystemPrompt(prompt.system);

    it("includes grade band and EAL level", () => {
      expect(prompt.user).toContain("3-4");
      expect(prompt.user).toContain("beginner");
    });

    expectUntrustedDataWrapping(
      buildSimplifyPrompt(simpInput).user,
      "source_text",
    );
  });

  describe("parseSimplifyResponse", () => {
    const validSimp = JSON.stringify({
      simplified_text: "Show numbers up to 1 000. Use pictures and numbers.",
      key_vocabulary: ["represent", "whole number", "pictorially", "symbolically"],
      visual_cue_suggestions: ["drawing of base-ten blocks", "number line to 1 000"],
    });

    it("parses valid JSON object", () => {
      const result = parseSimplifyResponse(validSimp, simpInput);
      expect(result.source_text).toBe(simpInput.source_text);
      expect(result.grade_band).toBe("3-4");
      expect(result.eal_level).toBe("beginner");
      expect(result.simplified_text).toContain("Show numbers");
      expect(result.key_vocabulary).toHaveLength(4);
      expect(result.visual_cue_suggestions).toHaveLength(2);
      expect(result.schema_version).toBe("0.1.0");
      expect(result.simplified_id).toBeTruthy();
    });

    it("handles markdown-fenced JSON", () => {
      const result = parseSimplifyResponse(wrapInFence(validSimp), simpInput);
      expect(result.simplified_text).toContain("Show numbers");
    });

    it("defaults arrays when missing", () => {
      const minimal = JSON.stringify({ simplified_text: "Use blocks." });
      const result = parseSimplifyResponse(minimal, simpInput);
      expect(result.key_vocabulary).toEqual([]);
      expect(result.visual_cue_suggestions).toEqual([]);
    });

    it("throws on non-JSON input", () => {
      expect(() => parseSimplifyResponse("not json", simpInput)).toThrow();
    });

    it("throws when response is an array", () => {
      expect(() => parseSimplifyResponse("[]", simpInput)).toThrow("Expected JSON object");
    });
  });
});

// ===================================================================
// 6. VOCAB CARDS
// ===================================================================
describe("vocab-cards", () => {
  const vocabInput = {
    artifact_id: "art-001",
    artifact_text: "Students explore place value using base-ten blocks, expanded form, and standard form.",
    subject: "Mathematics",
    target_language: "ar",
    grade_band: "3-4",
  };

  describe("buildVocabCardsPrompt", () => {
    const prompt = buildVocabCardsPrompt(vocabInput);
    expectStandardSystemPrompt(prompt.system);

    it("includes subject, grade, and target language", () => {
      expect(prompt.user).toContain("Mathematics");
      expect(prompt.user).toContain("3-4");
      expect(prompt.user).toContain("ar");
    });

    expectUntrustedDataWrapping(
      buildVocabCardsPrompt(vocabInput).user,
      "artifact_text",
    );

    it("includes Alberta curriculum context when provided", () => {
      const withCurriculum = buildVocabCardsPrompt({
        ...vocabInput,
        curriculumContext: "ALBERTA CURRICULUM ALIGNMENT: Mathematics Grade 3\n- model place value with manipulatives",
      });
      expect(withCurriculum.user).toContain("ALBERTA CURRICULUM ALIGNMENT");
      expect(withCurriculum.user).toContain("model place value with manipulatives");
    });
  });

  describe("parseVocabCardsResponse", () => {
    const validCards = JSON.stringify({
      cards: [
        { term: "place value", definition: "What each digit is worth", target_translation: "القيمة المكانية", example_sentence: "The place value of 3 in 345 is hundreds.", visual_hint: "chart showing ones, tens, hundreds columns" },
        { term: "expanded form", definition: "Writing a number as a sum of each digit's value", target_translation: "الشكل الموسع", example_sentence: "345 in expanded form is 300 + 40 + 5.", visual_hint: "number broken into parts with plus signs" },
      ],
    });

    it("parses valid JSON object with cards", () => {
      const result = parseVocabCardsResponse(validCards, vocabInput);
      expect(result.artifact_id).toBe("art-001");
      expect(result.subject).toBe("Mathematics");
      expect(result.target_language).toBe("ar");
      expect(result.cards).toHaveLength(2);
      expect(result.cards[0].term).toBe("place value");
      expect(result.cards[0].target_translation).toContain("القيمة");
      expect(result.schema_version).toBe("0.1.0");
    });

    it("handles markdown-fenced JSON", () => {
      const result = parseVocabCardsResponse(wrapInFence(validCards), vocabInput);
      expect(result.cards).toHaveLength(2);
    });

    it("defaults to empty cards array when missing", () => {
      const result = parseVocabCardsResponse("{}", vocabInput);
      expect(result.cards).toEqual([]);
    });

    it("throws on non-JSON input", () => {
      expect(() => parseVocabCardsResponse("bad input", vocabInput)).toThrow();
    });

    it("throws when response is an array", () => {
      expect(() => parseVocabCardsResponse("[]", vocabInput)).toThrow("Expected JSON object");
    });
  });
});

// ===================================================================
// 7. SUPPORT PATTERNS
// ===================================================================
describe("support-patterns", () => {
  const patInput = {
    classroom_id: "test-classroom",
    time_window: 20,
  };
  const patternContext = "Ari: 5 records about post-recess transitions. Mika: 3 records about advance notice.";

  describe("buildSupportPatternsPrompt", () => {
    const prompt = buildSupportPatternsPrompt(DEMO_CLASSROOM, patInput, patternContext);
    expectStandardSystemPrompt(prompt.system);

    it("includes student aliases in user message", () => {
      expect(prompt.user).toContain("Ari");
      expect(prompt.user).toContain("Mika");
    });

    it("includes grade band and subject focus", () => {
      expect(prompt.user).toContain("3-4");
      expect(prompt.user).toContain("cross_curricular");
    });

    it("includes roster aliases line", () => {
      expect(prompt.user).toContain("Roster aliases: Ari, Mika");
    });

    it("includes time window", () => {
      expect(prompt.user).toContain("last 20 records");
    });

    expectUntrustedDataWrapping(
      buildSupportPatternsPrompt(DEMO_CLASSROOM, patInput, patternContext).user,
      "pattern_context",
    );

    it("uses fallback text when pattern context is empty", () => {
      const noCtx = buildSupportPatternsPrompt(DEMO_CLASSROOM, patInput, "");
      expect(noCtx.user).toContain("(no retrieval context available)");
    });
  });

  describe("parseSupportPatternsResponse", () => {
    const validPat = JSON.stringify({
      recurring_themes: [{ theme: "Post-recess transitions", student_refs: ["Ari"], evidence_count: 5, example_observations: ["Ari needed visual timer after recess"] }],
      follow_up_gaps: [{ original_record_id: "int-1", student_refs: ["Mika"], observation: "Advance notice not given", days_since: 3 }],
      positive_trends: [{ student_ref: "Ari", description: "Improving with visual cues", evidence: ["Settled in 2 minutes last Thursday"] }],
      suggested_focus: [{ student_ref: "Mika", reason: "Transition support consistency", suggested_action: "Add advance notice to daily checklist", priority: "high" }],
    });

    it("parses valid JSON object", () => {
      const result = parseSupportPatternsResponse(validPat, "test-classroom", patInput);
      expect(result.classroom_id).toBe("test-classroom");
      expect(result.time_window).toBe(20);
      expect(result.student_filter).toBeNull();
      expect(result.recurring_themes).toHaveLength(1);
      expect(result.follow_up_gaps).toHaveLength(1);
      expect(result.positive_trends).toHaveLength(1);
      expect(result.suggested_focus).toHaveLength(1);
      expect(result.schema_version).toBe("0.1.0");
    });

    it("handles markdown-fenced JSON", () => {
      const result = parseSupportPatternsResponse(wrapInFence(validPat), "test-classroom", patInput);
      expect(result.recurring_themes).toHaveLength(1);
    });

    it("defaults missing arrays to empty", () => {
      const result = parseSupportPatternsResponse("{}", "c", patInput);
      expect(result.recurring_themes).toEqual([]);
      expect(result.follow_up_gaps).toEqual([]);
      expect(result.positive_trends).toEqual([]);
      expect(result.suggested_focus).toEqual([]);
    });

    it("preserves student_filter when provided", () => {
      const filtered = parseSupportPatternsResponse("{}", "c", { ...patInput, student_filter: "Ari" });
      expect(filtered.student_filter).toBe("Ari");
    });

    it("throws on non-JSON input", () => {
      expect(() => parseSupportPatternsResponse("oops", "c", patInput)).toThrow();
    });

    it("throws when response is an array", () => {
      expect(() => parseSupportPatternsResponse("[]", "c", patInput)).toThrow("Expected JSON object");
    });
  });
});

// ===================================================================
// 8. EA BRIEFING
// ===================================================================
describe("ea-briefing", () => {
  const eaInput = { classroom_id: "test-classroom", ea_name: "Mrs. Chen" };
  const briefingContext = "Plan: Ari needs visual timer after recess. Mika needs advance notice for all transitions.";

  describe("buildEABriefingPrompt", () => {
    const prompt = buildEABriefingPrompt(DEMO_CLASSROOM, eaInput, briefingContext);
    expectStandardSystemPrompt(prompt.system);

    it("includes EA name in system prompt", () => {
      expect(prompt.system).toContain("Mrs. Chen");
    });

    it("includes student aliases in user message", () => {
      expect(prompt.user).toContain("Ari");
      expect(prompt.user).toContain("Mika");
    });

    it("includes grade band and subject focus", () => {
      expect(prompt.user).toContain("3-4");
      expect(prompt.user).toContain("cross_curricular");
    });

    it("includes roster aliases line", () => {
      expect(prompt.user).toContain("ROSTER ALIASES: Ari, Mika");
    });

    expectUntrustedDataWrapping(
      buildEABriefingPrompt(DEMO_CLASSROOM, eaInput, briefingContext).user,
      "ea_briefing_context",
    );

    it("uses fallback when briefing context is empty", () => {
      const noCtx = buildEABriefingPrompt(DEMO_CLASSROOM, eaInput, "");
      expect(noCtx.user).toContain("(no retrieved coordination context available)");
    });

    // 2026-04-19 OPS audit phase 4: coordination_notes is rendered only
    // when the teacher supplies content, so the absence path stays
    // identical to pre-phase-4 output.
    it("omits the teacher_coordination_notes block when coordination_notes is absent", () => {
      expect(prompt.user).not.toContain("teacher_coordination_notes");
    });

    it("renders the teacher_coordination_notes block when coordination_notes is present", () => {
      const withNotes = buildEABriefingPrompt(
        DEMO_CLASSROOM,
        { ...eaInput, coordination_notes: "EA covering blocks 2-3 only; focus on Brody during math." },
        briefingContext,
      );
      expect(withNotes.user).toContain("teacher_coordination_notes");
      expect(withNotes.user).toContain("EA covering blocks 2-3 only");
    });
  });

  describe("parseEABriefingResponse", () => {
    const validBriefing = JSON.stringify({
      schedule_blocks: [{ time_slot: "10:00-10:30", student_refs: ["Ari"], task_description: "Support math group", materials_needed: ["base-ten blocks"] }],
      student_watch_list: [{ student_ref: "Mika", context_summary: "Needs advance notice", suggested_approach: "Give 5-minute warning" }],
      pending_followups: [{ student_ref: "Ari", original_observation: "Struggled with recess transition", days_since: 2, suggested_action: "Check if visual timer is effective" }],
      teacher_notes_for_ea: "Focus on supporting Ari during math and Mika during transitions.",
    });

    it("parses valid JSON object", () => {
      const result = parseEABriefingResponse(validBriefing, "test-classroom");
      expect(result.classroom_id).toBe("test-classroom");
      expect(result.schedule_blocks).toHaveLength(1);
      expect(result.student_watch_list).toHaveLength(1);
      expect(result.pending_followups).toHaveLength(1);
      expect(result.teacher_notes_for_ea).toContain("Focus on supporting");
      expect(result.schema_version).toBe("0.1.0");
    });

    it("handles markdown-fenced JSON", () => {
      const result = parseEABriefingResponse(wrapInFence(validBriefing), "test-classroom");
      expect(result.schedule_blocks).toHaveLength(1);
    });

    it("unwraps a single-object array from hosted model output", () => {
      const result = parseEABriefingResponse(`[${validBriefing}]`, "test-classroom");
      expect(result.classroom_id).toBe("test-classroom");
      expect(result.schedule_blocks).toHaveLength(1);
      expect(result.student_watch_list[0]?.student_ref).toBe("Mika");
    });

    it("filters student refs by allowed aliases", () => {
      const withLeak = JSON.stringify({
        schedule_blocks: [{ time_slot: "10:00", student_refs: ["Ari", "UnknownKid"], task_description: "Help", materials_needed: [] }],
        student_watch_list: [{ student_ref: "UnknownKid", context_summary: "Leaked", suggested_approach: "N/A" }],
        pending_followups: [{ student_ref: "UnknownKid", original_observation: "Leaked", days_since: 1, suggested_action: "N/A" }],
        teacher_notes_for_ea: "",
      });
      const result = parseEABriefingResponse(withLeak, "c", ["Ari"]);
      expect(result.schedule_blocks[0].student_refs).toEqual(["Ari"]);
      expect(result.student_watch_list).toHaveLength(0);
      expect(result.pending_followups).toHaveLength(0);
    });

    it("defaults missing arrays to empty", () => {
      const result = parseEABriefingResponse("{}", "c");
      expect(result.schedule_blocks).toEqual([]);
      expect(result.student_watch_list).toEqual([]);
      expect(result.pending_followups).toEqual([]);
      expect(result.teacher_notes_for_ea).toBe("");
    });

    it("throws on non-JSON input", () => {
      expect(() => parseEABriefingResponse("not json", "c")).toThrow();
    });

    it("throws when response is an array", () => {
      expect(() => parseEABriefingResponse("[]", "c")).toThrow("Expected JSON object");
    });
  });
});

// ===================================================================
// 9. COMPLEXITY FORECAST
// ===================================================================
describe("complexity-forecast", () => {
  const fcInput = {
    classroom_id: "test-classroom",
    forecast_date: "2026-04-11",
    teacher_notes: "Fire drill scheduled at 10:15.",
  };

  describe("buildComplexityForecastPrompt", () => {
    const prompt = buildComplexityForecastPrompt(DEMO_CLASSROOM, fcInput);
    expectStandardSystemPrompt(prompt.system);
    expectClassroomContext(prompt.user);

    it("includes forecast date", () => {
      expect(prompt.user).toContain("2026-04-11");
    });

    it("includes teacher notes when provided", () => {
      expect(prompt.user).toContain("TEACHER NOTES FOR TOMORROW:");
      expect(prompt.user).toContain(`<untrusted-data label="teacher_notes">`);
      expect(prompt.user).toContain("Fire drill");
    });

    it("omits teacher notes when not provided", () => {
      const noNotes = buildComplexityForecastPrompt(DEMO_CLASSROOM, { ...fcInput, teacher_notes: undefined });
      expect(noNotes.user).not.toContain("TEACHER NOTES FOR TOMORROW:");
    });

    it("includes forecast context when provided", () => {
      const withCtx = buildComplexityForecastPrompt(DEMO_CLASSROOM, fcInput, "Post-lunch is historically difficult");
      expect(withCtx.user).toContain("INTERVENTION HISTORY & PATTERNS:");
      expect(withCtx.user).toContain(`<untrusted-data label="forecast_context">`);
    });

    it("omits forecast context when not provided", () => {
      const prompt = buildComplexityForecastPrompt(DEMO_CLASSROOM, fcInput);
      expect(prompt.user).not.toContain("INTERVENTION HISTORY & PATTERNS:");
    });

    it("includes roster aliases line", () => {
      expect(prompt.user).toContain("ROSTER ALIASES: Ari, Mika");
    });
  });

  describe("parseComplexityForecastResponse", () => {
    const validForecast = JSON.stringify({
      blocks: [
        { time_slot: "8:30-9:15", activity: "Math block", level: "low", contributing_factors: ["EA present", "Routine activity"], suggested_mitigation: "Standard approach" },
        { time_slot: "10:00-10:30", activity: "Recess return", level: "high", contributing_factors: ["Fire drill disruption", "Transition challenge for Ari"], suggested_mitigation: "Pre-cue Ari with visual timer" },
      ],
      overall_summary: "Morning is manageable. The fire drill at 10:15 will create a high-complexity block after recess.",
      highest_risk_block: "10:00-10:30",
    });

    it("parses valid JSON object", () => {
      const result = parseComplexityForecastResponse(validForecast, "test-classroom", "2026-04-11");
      expect(result.classroom_id).toBe("test-classroom");
      expect(result.forecast_date).toBe("2026-04-11");
      expect(result.blocks).toHaveLength(2);
      expect(result.blocks[0].level).toBe("low");
      expect(result.blocks[1].level).toBe("high");
      expect(result.highest_risk_block).toBe("10:00-10:30");
      expect(result.overall_summary).toContain("fire drill");
      expect(result.schema_version).toBe("0.1.0");
    });

    it("handles markdown-fenced JSON", () => {
      const result = parseComplexityForecastResponse(wrapInFence(validForecast), "c", "2026-04-11");
      expect(result.blocks).toHaveLength(2);
    });

    it("defaults invalid level to medium", () => {
      const badLevel = JSON.stringify({ blocks: [{ time_slot: "8:30", activity: "Math", level: "extreme", contributing_factors: [], suggested_mitigation: "" }], overall_summary: "", highest_risk_block: "" });
      const result = parseComplexityForecastResponse(badLevel, "c", "2026-04-11");
      expect(result.blocks[0].level).toBe("medium");
    });

    it("defaults missing blocks to empty array", () => {
      const result = parseComplexityForecastResponse("{}", "c", "2026-04-11");
      expect(result.blocks).toEqual([]);
    });

    it("throws on non-JSON input", () => {
      expect(() => parseComplexityForecastResponse("gibberish", "c", "d")).toThrow();
    });

    it("throws when response is an array", () => {
      expect(() => parseComplexityForecastResponse("[]", "c", "d")).toThrow("Expected JSON object");
    });
  });
});

// ===================================================================
// 10. SCAFFOLD DECAY
// ===================================================================
describe("scaffold-decay", () => {
  const sdInput = {
    classroom_id: "test-classroom",
    student_ref: "Ari",
    time_window: 15,
  };
  const decayContext = "Ari visual_step_cards: 8 uses in first 10 records, 2 uses in last 10 records. Teacher noted Ari self-started without cards twice.";

  describe("buildScaffoldDecayPrompt", () => {
    const prompt = buildScaffoldDecayPrompt(DEMO_CLASSROOM, sdInput, decayContext);
    expectStandardSystemPrompt(prompt.system);

    it("includes student ref", () => {
      expect(prompt.user).toContain("STUDENT: Ari");
    });

    it("includes grade band", () => {
      expect(prompt.user).toContain("3-4");
    });

    it("includes known scaffolds for the student", () => {
      expect(prompt.user).toContain("visual_step_cards");
    });

    it("includes classroom notes via classroom context", () => {
      // The scaffold-decay builder only uses classroom_id and grade_band in user,
      // but the classroom is passed for student lookup
      expect(prompt.user).toContain("test-classroom");
    });

    expectUntrustedDataWrapping(
      buildScaffoldDecayPrompt(DEMO_CLASSROOM, sdInput, decayContext).user,
      "scaffold_decay_context",
    );

    it("uses fallback when decay context is empty", () => {
      const noCtx = buildScaffoldDecayPrompt(DEMO_CLASSROOM, sdInput, "");
      expect(noCtx.user).toContain("(no intervention history available)");
    });
  });

  describe("parseScaffoldDecayResponse", () => {
    const validDecay = JSON.stringify({
      reviews: [{
        scaffold_name: "visual_step_cards",
        usage_trend: { scaffold_name: "visual_step_cards", early_window_count: 8, early_window_total: 10, recent_window_count: 2, recent_window_total: 10, trend: "decaying" },
        positive_signals: [{ description: "Ari self-started without cards", source_record_id: "int-5" }],
        withdrawal_plan: [{ phase_number: 1, description: "Provide cards but do not prompt use", duration_weeks: 2, success_criteria: "Ari starts 3/5 tasks independently" }],
        regression_protocol: "Return to previous phase if Ari needs cards 3+ times in a week",
        confidence: "high",
      }],
      summary: "Your records show decreasing use of visual step cards for Ari over the past 15 records.",
    });

    it("parses valid JSON object", () => {
      const result = parseScaffoldDecayResponse(validDecay, "test-classroom", "Ari");
      expect(result.classroom_id).toBe("test-classroom");
      expect(result.student_ref).toBe("Ari");
      expect(result.reviews).toHaveLength(1);
      expect(result.reviews[0].scaffold_name).toBe("visual_step_cards");
      expect(result.reviews[0].usage_trend.trend).toBe("decaying");
      expect(result.reviews[0].positive_signals).toHaveLength(1);
      expect(result.reviews[0].withdrawal_plan).toHaveLength(1);
      expect(result.reviews[0].confidence).toBe("high");
      expect(result.summary).toContain("decreasing use");
      expect(result.schema_version).toBe("0.1.0");
    });

    it("handles markdown-fenced JSON", () => {
      const result = parseScaffoldDecayResponse(wrapInFence(validDecay), "test-classroom", "Ari");
      expect(result.reviews).toHaveLength(1);
    });

    it("defaults invalid trend to stable", () => {
      const badTrend = JSON.stringify({
        reviews: [{ scaffold_name: "cards", usage_trend: { trend: "crashing" }, confidence: "high" }],
        summary: "",
      });
      const result = parseScaffoldDecayResponse(badTrend, "c", "Ari");
      expect(result.reviews[0].usage_trend.trend).toBe("stable");
    });

    it("defaults invalid confidence to low", () => {
      const badConf = JSON.stringify({
        reviews: [{ scaffold_name: "cards", usage_trend: {}, confidence: "very_high" }],
        summary: "",
      });
      const result = parseScaffoldDecayResponse(badConf, "c", "Ari");
      expect(result.reviews[0].confidence).toBe("low");
    });

    it("defaults missing reviews to empty array", () => {
      const result = parseScaffoldDecayResponse('{"summary":"None found"}', "c", "Ari");
      expect(result.reviews).toEqual([]);
    });

    it("throws on non-JSON input", () => {
      expect(() => parseScaffoldDecayResponse("not json", "c", "s")).toThrow();
    });

    it("throws when response is an array", () => {
      expect(() => parseScaffoldDecayResponse("[]", "c", "s")).toThrow("Expected JSON object");
    });
  });
});

// ===================================================================
// 11. SURVIVAL PACKET
// ===================================================================
describe("survival-packet", () => {
  const spInput = {
    classroom_id: "test-classroom",
    target_date: "2026-04-11",
    teacher_notes: "I left photocopied math sheets on the front table.",
  };
  const survivalContext = "Schedule: 8:30 bell work, 9:15 math block. Ari uses visual_step_cards. Mika needs advance_notice. EA arrives 8:15, leaves 12:00.";

  describe("buildSurvivalPacketPrompt", () => {
    const prompt = buildSurvivalPacketPrompt(DEMO_CLASSROOM, spInput, survivalContext);
    expectStandardSystemPrompt(prompt.system);

    it("includes student aliases in user message", () => {
      expect(prompt.user).toContain("Ari");
      expect(prompt.user).toContain("Mika");
    });

    it("includes grade band and subject focus", () => {
      expect(prompt.user).toContain("3-4");
      expect(prompt.user).toContain("cross_curricular");
    });

    it("includes target date", () => {
      expect(prompt.user).toContain("2026-04-11");
    });

    it("includes teacher notes for substitute when provided", () => {
      expect(prompt.user).toContain("TEACHER NOTES FOR SUBSTITUTE:");
      expect(prompt.user).toContain(`<untrusted-data label="teacher_notes">`);
      expect(prompt.user).toContain("photocopied math sheets");
    });

    it("omits teacher notes when not provided", () => {
      const noNotes = buildSurvivalPacketPrompt(DEMO_CLASSROOM, { ...spInput, teacher_notes: undefined }, survivalContext);
      expect(noNotes.user).not.toContain("TEACHER NOTES FOR SUBSTITUTE:");
    });

    expectUntrustedDataWrapping(
      buildSurvivalPacketPrompt(DEMO_CLASSROOM, spInput, survivalContext).user,
      "survival_context",
    );

    it("uses fallback when survival context is empty", () => {
      const noCtx = buildSurvivalPacketPrompt(DEMO_CLASSROOM, spInput, "");
      expect(noCtx.user).toContain("(no classroom synthesis available)");
    });

    it("includes roster aliases line", () => {
      expect(prompt.user).toContain("ROSTER ALIASES: Ari, Mika");
    });
  });

  describe("parseSurvivalPacketResponse", () => {
    const validPacket = JSON.stringify({
      routines: [{ time_or_label: "Morning", description: "Bell work at desks", recent_changes: "New math warm-up added last week" }],
      student_support: [{ student_ref: "Ari", current_scaffolds: ["visual_step_cards"], key_strategies: "Provide visual step cards before tasks", things_to_avoid: "Do not remove cards mid-task" }],
      ea_coordination: { ea_name: "Mrs. Chen", schedule_summary: "Arrives 8:15, leaves 12:00", primary_students: ["Ari"], if_ea_absent: "Pair Ari with a peer buddy" },
      simplified_day_plan: [{ time_slot: "8:30-9:15", activity: "Bell work + math block", sub_instructions: "Hand out the photocopied sheets from the front table", materials_location: "Front table" }],
      family_comms: [{ student_ref: "Mika", status: "defer_to_teacher", notes: "Pending message about missed work" }],
      complexity_peaks: [{ time_slot: "12:00-12:30", level: "high", reason: "EA leaves at lunch, multiple transitions", mitigation: "Simplify post-lunch activity" }],
      heads_up: ["Fire drill may happen at 10:15", "Ari may need extra time during transitions"],
    });

    it("parses valid JSON object", () => {
      const result = parseSurvivalPacketResponse(validPacket, "test-classroom", "2026-04-11");
      expect(result.classroom_id).toBe("test-classroom");
      expect(result.generated_for_date).toBe("2026-04-11");
      expect(result.routines).toHaveLength(1);
      expect(result.student_support).toHaveLength(1);
      expect(result.student_support[0].student_ref).toBe("Ari");
      expect(result.ea_coordination.ea_name).toBe("Mrs. Chen");
      expect(result.ea_coordination.primary_students).toEqual(["Ari"]);
      expect(result.simplified_day_plan).toHaveLength(1);
      expect(result.family_comms).toHaveLength(1);
      expect(result.family_comms[0].status).toBe("defer_to_teacher");
      expect(result.complexity_peaks).toHaveLength(1);
      expect(result.complexity_peaks[0].level).toBe("high");
      expect(result.heads_up).toHaveLength(2);
      expect(result.schema_version).toBe("0.1.0");
    });

    it("handles markdown-fenced JSON", () => {
      const result = parseSurvivalPacketResponse(wrapInFence(validPacket), "test-classroom", "2026-04-11");
      expect(result.routines).toHaveLength(1);
    });

    it("filters student_support by allowed aliases", () => {
      const withLeak = JSON.stringify({
        routines: [],
        student_support: [
          { student_ref: "Ari", current_scaffolds: [], key_strategies: "Cards" },
          { student_ref: "GhostStudent", current_scaffolds: [], key_strategies: "Unknown" },
        ],
        ea_coordination: { schedule_summary: "", primary_students: ["Ari", "GhostStudent"], if_ea_absent: "" },
        simplified_day_plan: [],
        family_comms: [{ student_ref: "GhostStudent", status: "routine_ok", notes: "Leaked" }],
        complexity_peaks: [],
        heads_up: [],
      });
      const result = parseSurvivalPacketResponse(withLeak, "c", "d", ["Ari"]);
      expect(result.student_support).toHaveLength(1);
      expect(result.student_support[0].student_ref).toBe("Ari");
      expect(result.ea_coordination.primary_students).toEqual(["Ari"]);
      expect(result.family_comms).toHaveLength(0);
    });

    it("defaults invalid family_comms status to defer_to_teacher", () => {
      const badStatus = JSON.stringify({
        routines: [],
        student_support: [],
        ea_coordination: { schedule_summary: "", primary_students: [], if_ea_absent: "" },
        simplified_day_plan: [],
        family_comms: [{ student_ref: "Ari", status: "send_immediately", notes: "Bad" }],
        complexity_peaks: [],
        heads_up: [],
      });
      const result = parseSurvivalPacketResponse(badStatus, "c", "d");
      expect(result.family_comms[0].status).toBe("defer_to_teacher");
    });

    it("defaults missing sections to empty", () => {
      const result = parseSurvivalPacketResponse("{}", "c", "d");
      expect(result.routines).toEqual([]);
      expect(result.student_support).toEqual([]);
      expect(result.simplified_day_plan).toEqual([]);
      expect(result.family_comms).toEqual([]);
      expect(result.complexity_peaks).toEqual([]);
      expect(result.heads_up).toEqual([]);
    });

    it("throws on non-JSON input", () => {
      expect(() => parseSurvivalPacketResponse("nope", "c", "d")).toThrow();
    });

    it("throws when response is an array", () => {
      expect(() => parseSurvivalPacketResponse("[]", "c", "d")).toThrow("Expected JSON object");
    });
  });
});

// ===================================================================
// 12. EXTRACT WORKSHEET
// ===================================================================
describe("extract-worksheet", () => {
  describe("buildExtractionPrompt", () => {
    const prompt = buildExtractionPrompt();

    it("includes PrairieClassroom OS identity", () => {
      expect(prompt.system).toContain("PrairieClassroom OS");
    });

    it("includes safety rules in system prompt", () => {
      expect(prompt.system).toContain("Do not infer or diagnose");
    });

    it("includes prompt-injection safety notice (scanned worksheets are the highest injection surface)", () => {
      // The `withPromptSafetyNotice` helper appends a boundary declaration
      // so a student-written "ignore previous instructions" in the scanned
      // worksheet image cannot override the extraction instructions.
      expect(prompt.system).toMatch(/safety|injection|untrusted|boundary|trusted instructions/i);
    });

    it("has static user prompt requesting extraction", () => {
      expect(prompt.user).toContain("Extract all text");
      expect(prompt.user).toContain("extracted_text");
      expect(prompt.user).toContain("confidence_notes");
    });
  });

  describe("parseExtractionResponse", () => {
    const validExtraction = JSON.stringify({
      extracted_text: "1. What is 345 in expanded form?\n   ___\n2. Draw base-ten blocks for 672.\n   [space for drawing]",
      confidence_notes: ["Question 2 drawing area boundary was unclear"],
    });

    it("parses valid JSON object", () => {
      const result = parseExtractionResponse(validExtraction);
      expect(result.extracted_text).toContain("expanded form");
      expect(result.confidence_notes).toHaveLength(1);
      expect(result.confidence_notes[0]).toContain("drawing area");
    });

    it("handles markdown-fenced JSON", () => {
      const result = parseExtractionResponse(wrapInFence(validExtraction));
      expect(result.extracted_text).toContain("expanded form");
    });

    it("handles JSON with surrounding text (robust extraction)", () => {
      const messy = 'Here is the extraction:\n{"extracted_text":"Hello","confidence_notes":[]}\nDone!';
      const result = parseExtractionResponse(messy);
      expect(result.extracted_text).toBe("Hello");
      expect(result.confidence_notes).toEqual([]);
    });

    it("defaults missing fields", () => {
      const result = parseExtractionResponse("{}");
      expect(result.extracted_text).toBe("");
      expect(result.confidence_notes).toEqual([]);
    });

    it("throws on non-JSON input", () => {
      expect(() => parseExtractionResponse("This is just text with no braces at all and no json")).toThrow();
    });

    it("throws when response is an array", () => {
      expect(() => parseExtractionResponse("[]")).toThrow("Expected JSON object");
    });
  });
});
