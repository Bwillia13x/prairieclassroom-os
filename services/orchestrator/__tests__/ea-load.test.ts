import { describe, expect, it } from "vitest";
import { buildEALoadPrompt, parseEALoadResponse } from "../ea-load.js";
import type { ClassroomProfile } from "../../../packages/shared/schemas/classroom.js";

const sampleClassroom: ClassroomProfile = {
  classroom_id: "demo-okafor-grade34",
  grade_band: "3-4",
  subject_focus: "cross_curricular",
  classroom_notes: [
    "Split grade 3/4 class with 24 students.",
    "EA (Ms. Fehr) available mornings only — afternoons are teacher-only.",
  ],
  routines: {
    morning: "bell work journal",
  },
  support_constraints: ["EA available 8:30-12:00 only"],
  students: [
    {
      student_id: "D1",
      alias: "Amira",
      eal_flag: true,
      support_tags: ["eal_level_2"],
      known_successful_scaffolds: ["visual_step_cards"],
    },
    {
      student_id: "D2",
      alias: "Brody",
      eal_flag: false,
      support_tags: ["sensory_needs"],
      known_successful_scaffolds: ["fidget_tools"],
    },
  ],
  schedule: [
    {
      time_slot: "8:30-9:15",
      activity: "Bell work",
      ea_available: true,
      ea_student_refs: ["Amira"],
    },
    {
      time_slot: "12:45-1:45",
      activity: "Math block",
      ea_available: false,
    },
  ],
};

describe("buildEALoadPrompt", () => {
  it("declares an explicit classroom roster allowlist and operational framing", () => {
    const prompt = buildEALoadPrompt(
      sampleClassroom,
      {
        classroom_id: "demo-okafor-grade34",
        target_date: "2026-04-13",
        teacher_notes: "Standard schedule.",
      },
      "INTERVENTION HISTORY:\n- Brody needed a visual timer during the post-lunch transition.",
    );

    // Operational framing, not judgmental
    expect(prompt.system).toContain("CLASSROOM CONDITIONS AND EA DEMANDS, never EA competence");
    expect(prompt.system).toContain("The system suggests redistributions; the teacher and EA decide.");

    // Safety rules are explicitly enumerated (the prompt *mentions* these as forbidden actions)
    expect(prompt.system).toContain("Do not diagnose conditions.");
    expect(prompt.system).toContain("Do not assign behavioral-risk scores.");
    expect(prompt.system).toContain("Do not suggest disciplinary actions.");

    // Cross-classroom protection
    expect(prompt.system).toContain("Never reuse aliases from another classroom.");

    // Roster and schedule visible in user prompt
    expect(prompt.user).toContain("ROSTER ALIASES: Amira, Brody");
    expect(prompt.user).toContain("8:30-9:15");
    expect(prompt.user).toContain("TARGET DATE: 2026-04-13");
  });

  it("includes support constraints so the model understands the EA window", () => {
    const prompt = buildEALoadPrompt(
      sampleClassroom,
      { classroom_id: "demo-okafor-grade34", target_date: "2026-04-13" },
    );
    expect(prompt.user).toContain("EA available 8:30-12:00 only");
  });
});

describe("parseEALoadResponse", () => {
  const baseline = {
    blocks: [
      {
        time_slot: "8:30-9:15",
        activity: "Bell work",
        ea_available: true,
        supported_students: ["Amira"],
        load_level: "low",
        load_factors: ["Familiar routine"],
      },
      {
        time_slot: "9:30-10:30",
        activity: "Literacy",
        ea_available: true,
        supported_students: ["Amira", "Brody"],
        load_level: "high",
        load_factors: ["Two supported students", "Language-heavy block"],
        redistribution_suggestion: "Consider rotating Brody to independent station at 9:45.",
      },
      {
        time_slot: "12:45-1:45",
        activity: "Math block",
        ea_available: false,
        supported_students: [],
        load_level: "low",
        load_factors: ["EA not scheduled"],
      },
    ],
    alerts: ["Sustained high load during literacy block"],
    overall_summary: "Amira and Brody need simultaneous support during literacy.",
    highest_load_block: "9:30-10:30",
  };

  it("parses a well-formed response and preserves block fields", () => {
    const parsed = parseEALoadResponse(
      JSON.stringify(baseline),
      "demo-okafor-grade34",
      "2026-04-13",
      ["Amira", "Brody"],
      ["Amira", "Brody"],
    );

    expect(parsed.schema_version).toBe("0.1.0");
    expect(parsed.classroom_id).toBe("demo-okafor-grade34");
    expect(parsed.target_date).toBe("2026-04-13");
    expect(parsed.blocks).toHaveLength(3);
    expect(parsed.blocks[1].load_level).toBe("high");
    expect(parsed.blocks[1].supported_students).toEqual(["Amira", "Brody"]);
    expect(parsed.blocks[1].redistribution_suggestion).toContain("rotating Brody");
    expect(parsed.alerts).toHaveLength(1);
    expect(parsed.highest_load_block).toBe("9:30-10:30");
  });

  it("forces load_level to 'break' when the EA is not available, regardless of model output", () => {
    const payload = JSON.parse(JSON.stringify(baseline));
    payload.blocks[2].load_level = "high"; // Model got it wrong
    payload.blocks[2].ea_available = false;

    const parsed = parseEALoadResponse(
      JSON.stringify(payload),
      "demo-okafor-grade34",
      "2026-04-13",
      ["Amira", "Brody"],
      ["Amira", "Brody"],
    );

    // Invariant: no-EA blocks are always "break"
    expect(parsed.blocks[2].load_level).toBe("break");
  });

  it("drops supported_students that are not on the classroom roster (cross-classroom leak protection)", () => {
    const payload = JSON.parse(JSON.stringify(baseline));
    payload.blocks[1].supported_students = ["Amira", "Brody", "Xander", "Zeke"];

    const parsed = parseEALoadResponse(
      JSON.stringify(payload),
      "demo-okafor-grade34",
      "2026-04-13",
      ["Amira", "Brody"], // Only these are on this roster
      ["Amira", "Brody", "Xander", "Zeke"], // Xander / Zeke live in another classroom
    );

    expect(parsed.blocks[1].supported_students).toEqual(["Amira", "Brody"]);
  });

  it("scrubs non-roster aliases from narrative text (overall_summary, alerts)", () => {
    const payload = JSON.parse(JSON.stringify(baseline));
    payload.overall_summary = "Amira, Brody, and Zeke all need support during literacy.";
    payload.alerts = ["Zeke's block overlaps with the high-load sequence"];

    const parsed = parseEALoadResponse(
      JSON.stringify(payload),
      "demo-okafor-grade34",
      "2026-04-13",
      ["Amira", "Brody"],
      ["Amira", "Brody", "Zeke"],
    );

    expect(parsed.overall_summary).not.toContain("Zeke");
    expect(parsed.overall_summary).toContain("another student");
    expect(parsed.alerts[0]).toContain("another student");
    expect(parsed.alerts[0]).not.toContain("Zeke");
  });

  it("coerces an unknown load_level to 'medium' rather than crashing", () => {
    const payload = JSON.parse(JSON.stringify(baseline));
    payload.blocks[0].load_level = "chaotic"; // Not in enum

    const parsed = parseEALoadResponse(
      JSON.stringify(payload),
      "demo-okafor-grade34",
      "2026-04-13",
      ["Amira", "Brody"],
      ["Amira", "Brody"],
    );

    expect(parsed.blocks[0].load_level).toBe("medium");
  });

  it("strips markdown fencing from the raw response", () => {
    const raw = "```json\n" + JSON.stringify(baseline) + "\n```";
    const parsed = parseEALoadResponse(
      raw,
      "demo-okafor-grade34",
      "2026-04-13",
      ["Amira", "Brody"],
      ["Amira", "Brody"],
    );
    expect(parsed.blocks).toHaveLength(3);
  });

  it("falls back to a block's time_slot when highest_load_block is missing from the response", () => {
    const payload = JSON.parse(JSON.stringify(baseline));
    delete payload.highest_load_block;

    const parsed = parseEALoadResponse(
      JSON.stringify(payload),
      "demo-okafor-grade34",
      "2026-04-13",
      ["Amira", "Brody"],
      ["Amira", "Brody"],
    );

    // Should resolve to the first block whose load_level === "high"
    expect(parsed.highest_load_block).toBe("9:30-10:30");
  });
});
