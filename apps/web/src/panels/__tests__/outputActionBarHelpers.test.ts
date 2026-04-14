/**
 * outputActionBarHelpers.test.ts — unit tests for the five output serializers.
 * Each test uses a minimal fixture and checks expected section headers.
 */
import { describe, it, expect } from "vitest";
import {
  serializeSupportPatternsToPlainText,
  serializeEABriefingToPlainText,
  serializeForecastToPlainText,
  serializeSurvivalPacketToMarkdown,
  serializeLanguageOutputToPlainText,
} from "../outputActionBarHelpers";
import type {
  SupportPatternReport,
  EABriefing,
  ComplexityForecast,
  SurvivalPacket,
  SimplifiedOutput,
  VocabCardSet,
} from "../../types";

// ── SupportPatternReport ────────────────────────────────────────────────────

const minimalReport: SupportPatternReport = {
  report_id: "rpt-1",
  classroom_id: "cls-1",
  student_filter: null,
  time_window: 14,
  recurring_themes: [
    {
      theme: "Reading comprehension gaps",
      student_refs: ["Amira"],
      evidence_count: 3,
      example_observations: ["Struggled with inference questions"],
    },
  ],
  follow_up_gaps: [],
  positive_trends: [
    { student_ref: "Ben", description: "Improved focus", evidence: ["Completed tasks independently"] },
  ],
  suggested_focus: [
    { student_ref: "Amira", reason: "Ongoing gaps", suggested_action: "One-on-one reading", priority: "high" },
  ],
  generated_at: "2026-04-14T10:00:00Z",
  schema_version: "1",
};

describe("serializeSupportPatternsToPlainText", () => {
  it("includes expected section headers and content", () => {
    const output = serializeSupportPatternsToPlainText(minimalReport);
    expect(output).toContain("SUPPORT PATTERN REPORT");
    expect(output).toContain("RECURRING THEMES");
    expect(output).toContain("Reading comprehension gaps");
    expect(output).toContain("FOLLOW-UP GAPS");
    expect(output).toContain("POSITIVE TRENDS");
    expect(output).toContain("SUGGESTED FOCUS AREAS");
    expect(output).toContain("Amira");
  });
});

// ── EABriefing ──────────────────────────────────────────────────────────────

const minimalBriefing: EABriefing = {
  briefing_id: "brf-1",
  classroom_id: "cls-1",
  date: "2026-04-15",
  schedule_blocks: [
    {
      time_slot: "9:00–9:30",
      student_refs: ["Amira", "Ben"],
      task_description: "Small group reading",
      materials_needed: ["Leveled readers"],
    },
  ],
  student_watch_list: [
    {
      student_ref: "Amira",
      context_summary: "EAL support ongoing",
      suggested_approach: "Simplified instructions",
    },
  ],
  pending_followups: [],
  teacher_notes_for_ea: "Check in after literacy block.",
  schema_version: "1",
};

describe("serializeEABriefingToPlainText", () => {
  it("includes expected section headers and content", () => {
    const output = serializeEABriefingToPlainText(minimalBriefing);
    expect(output).toContain("EA BRIEFING");
    expect(output).toContain("SCHEDULE BLOCKS");
    expect(output).toContain("9:00–9:30");
    expect(output).toContain("STUDENT WATCH LIST");
    expect(output).toContain("Amira");
    expect(output).toContain("PENDING FOLLOW-UPS");
    expect(output).toContain("TEACHER NOTES FOR EA");
    expect(output).toContain("Check in after literacy block.");
  });
});

// ── ComplexityForecast ──────────────────────────────────────────────────────

const minimalForecast: ComplexityForecast = {
  forecast_id: "fct-1",
  classroom_id: "cls-1",
  forecast_date: "2026-04-15",
  blocks: [
    {
      time_slot: "9:00–10:00",
      activity: "Math workshop",
      level: "high",
      contributing_factors: ["Three students with IEPs", "New concept introduction"],
      suggested_mitigation: "Pre-teach vocabulary with EAL students",
    },
  ],
  overall_summary: "High complexity expected in morning math block.",
  highest_risk_block: "9:00–10:00",
  schema_version: "1",
};

describe("serializeForecastToPlainText", () => {
  it("includes expected section headers and content", () => {
    const output = serializeForecastToPlainText(minimalForecast);
    expect(output).toContain("COMPLEXITY FORECAST");
    expect(output).toContain("OVERALL SUMMARY");
    expect(output).toContain("BLOCK-BY-BLOCK FORECAST");
    expect(output).toContain("9:00–10:00");
    expect(output).toContain("HIGH");
    expect(output).toContain("Highest risk block");
  });
});

// ── SurvivalPacket ──────────────────────────────────────────────────────────

const minimalPacket: SurvivalPacket = {
  packet_id: "pkt-1",
  classroom_id: "cls-1",
  generated_for_date: "2026-04-15",
  routines: [{ time_or_label: "Morning entry", description: "Students self-register attendance" }],
  student_support: [
    {
      student_ref: "Amira",
      current_scaffolds: ["Visual schedule"],
      key_strategies: "Use picture cues",
      things_to_avoid: "Long verbal instructions",
    },
  ],
  ea_coordination: {
    schedule_summary: "EA supports math 9-10, literacy 10:30-11",
    primary_students: ["Amira"],
    if_ea_absent: "Notify office by 8:30am",
  },
  simplified_day_plan: [
    { time_slot: "9:00", activity: "Morning meeting", sub_instructions: "Take attendance, review schedule" },
  ],
  family_comms: [],
  complexity_peaks: [],
  heads_up: ["Fire drill at 1:30pm"],
  schema_version: "1",
};

describe("serializeSurvivalPacketToMarkdown", () => {
  it("includes expected section headers and content", () => {
    const output = serializeSurvivalPacketToMarkdown(minimalPacket);
    expect(output).toContain("# Substitute Survival Packet");
    expect(output).toContain("## Heads Up");
    expect(output).toContain("Fire drill at 1:30pm");
    expect(output).toContain("## Classroom Routines");
    expect(output).toContain("Morning entry");
    expect(output).toContain("## Simplified Day Plan");
    expect(output).toContain("## Student Support Notes");
    expect(output).toContain("Amira");
    expect(output).toContain("## EA Coordination");
  });
});

// ── Language tools ──────────────────────────────────────────────────────────

const minimalSimplified: SimplifiedOutput = {
  simplified_id: "smp-1",
  source_text: "The mitochondria is the powerhouse of the cell.",
  grade_band: "3-4",
  eal_level: "beginner",
  simplified_text: "The mitochondria gives the cell energy.",
  key_vocabulary: ["mitochondria", "energy", "cell"],
  visual_cue_suggestions: ["Draw a battery inside a circle"],
  schema_version: "1",
};

const minimalVocabSet: VocabCardSet = {
  set_id: "vcs-1",
  artifact_id: "art-1",
  subject: "Science",
  target_language: "French",
  grade_band: "3-4",
  cards: [
    {
      term: "mitochondria",
      definition: "The part of a cell that produces energy",
      target_translation: "mitochondrie",
      example_sentence: "The mitochondria is like a battery for the cell.",
      visual_hint: "Battery inside a cell",
    },
  ],
  schema_version: "1",
};

describe("serializeLanguageOutputToPlainText", () => {
  it("serializes SimplifiedOutput with expected headers", () => {
    const output = serializeLanguageOutputToPlainText(minimalSimplified);
    expect(output).toContain("SIMPLIFIED TEXT");
    expect(output).toContain("beginner");
    expect(output).toContain("The mitochondria gives the cell energy.");
    expect(output).toContain("KEY VOCABULARY");
    expect(output).toContain("VISUAL CUE SUGGESTIONS");
  });

  it("serializes VocabCardSet with expected headers", () => {
    const output = serializeLanguageOutputToPlainText(minimalVocabSet);
    expect(output).toContain("VOCABULARY CARDS");
    expect(output).toContain("Science");
    expect(output).toContain("French");
    expect(output).toContain("mitochondria");
    expect(output).toContain("mitochondrie");
  });
});
