/**
 * PrairieClassroom OS — Differentiation Prompt Builder
 *
 * Constructs the system prompt and user prompt for the
 * differentiate_material route. This is the versioned
 * prompt contract for Sprint 1.
 */

import type { ClassroomProfile } from "../../packages/shared/schemas/classroom.js";
import type { LessonArtifact, DifferentiatedVariant, VariantType } from "../../packages/shared/schemas/artifact.js";

export const VARIANT_TYPES: VariantType[] = [
  "core",
  "eal_supported",
  "chunked",
  "ea_small_group",
  "extension",
];

export interface DifferentiationPrompt {
  system: string;
  user: string;
}

export function buildDifferentiationPrompt(
  artifact: LessonArtifact,
  classroom: ClassroomProfile,
  teacherGoal?: string,
): DifferentiationPrompt {
  const system = `You are PrairieClassroom OS, a classroom differentiation assistant for Alberta K–6 teachers.

Your task: Given a lesson artifact and classroom context, produce exactly 5 differentiated variants.

VARIANT TYPES (produce exactly one of each):
1. core — Standard version for on-level students.
2. eal_supported — Simplified language, visual cues, sentence starters for English learners.
3. chunked — Broken into smaller steps with checkpoints for students who need pacing support.
4. ea_small_group — Designed for an Educational Assistant to run with a small group (3–5 students).
5. extension — Enrichment version for advanced students with open-ended challenge.

OUTPUT FORMAT: Respond with a JSON array of exactly 5 objects. Each object must have:
- variant_type: one of "core", "eal_supported", "chunked", "ea_small_group", "extension"
- title: short descriptive title
- student_facing_instructions: what the student reads/does
- teacher_notes: what the teacher needs to know
- required_materials: array of strings
- estimated_minutes: integer

RULES:
- All variants must be genuinely distinct and usable.
- Use plain language appropriate for the grade level.
- Do not invent content not related to the original artifact.
- Do not include diagnosis, discipline, or risk scoring.
- Output only the JSON array, no markdown fencing or commentary.`;

  const classroomContext = [
    `Grade: ${classroom.grade_band}`,
    `Subject focus: ${classroom.subject_focus}`,
    ...classroom.classroom_notes.map((n) => `Note: ${n}`),
    ...classroom.students.map(
      (s) =>
        `Student ${s.alias}: ${s.eal_flag ? "EAL" : "non-EAL"}, tags=[${s.support_tags.join(", ")}], scaffolds=[${s.known_successful_scaffolds.join(", ")}]`
    ),
  ].join("\n");

  const user = `CLASSROOM CONTEXT:
${classroomContext}

ARTIFACT:
Title: ${artifact.title}
Subject: ${artifact.subject}
Content: ${artifact.raw_text ?? "(no text — image/PDF source)"}
${teacherGoal ? `\nTEACHER GOAL: ${teacherGoal}` : ""}

Produce 5 differentiated variants as a JSON array.`;

  return { system, user };
}

/**
 * Parse the model's raw text output into DifferentiatedVariant objects.
 * Handles common model quirks (markdown fencing, trailing text).
 */
export function parseVariantsResponse(
  raw: string,
  artifactId: string,
): DifferentiatedVariant[] {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }

  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) {
    throw new Error("Expected JSON array of variants");
  }

  return parsed.map((v: Record<string, unknown>, i: number) => ({
    variant_id: `${artifactId}-v${i}`,
    artifact_id: artifactId,
    variant_type: (v.variant_type as VariantType) ?? VARIANT_TYPES[i],
    title: String(v.title ?? `Variant ${i + 1}`),
    student_facing_instructions: String(v.student_facing_instructions ?? ""),
    teacher_notes: String(v.teacher_notes ?? ""),
    required_materials: Array.isArray(v.required_materials)
      ? v.required_materials.map(String)
      : [],
    estimated_minutes: Number(v.estimated_minutes) || 20,
    schema_version: "0.1.0",
  }));
}
