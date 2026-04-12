// services/orchestrator/simplify.ts
import type { SimplifiedOutput } from "../../packages/shared/schemas/language.js";
import { randomUUID } from "node:crypto";
import { renderPromptInput, withPromptSafetyNotice } from "./prompt-safety.js";

export interface SimplifyPrompt {
  system: string;
  user: string;
}

export interface SimplifyInput {
  source_text: string;
  grade_band: string;
  eal_level: "beginner" | "intermediate" | "advanced";
}

export function buildSimplifyPrompt(input: SimplifyInput): SimplifyPrompt {
  const system = withPromptSafetyNotice(`You are PrairieClassroom OS, a language simplification assistant for Alberta K–6 teachers.

Your task: Take a piece of classroom text (instructions, passage, assignment) and simplify it so a student at the specified EAL level can understand it.

OUTPUT FORMAT: Respond with a single JSON object containing these fields:
- "simplified_text": the simplified version of the source text
- "key_vocabulary": array of 3–8 important words from the text that may need teaching
- "visual_cue_suggestions": array of 2–4 suggestions for visual supports (icons, images, diagrams) that would help comprehension

SIMPLIFICATION RULES BY EAL LEVEL:
- beginner: Use short sentences (5–8 words). Use high-frequency vocabulary only. Add visual cue markers. Avoid idioms, metaphors, or complex syntax.
- intermediate: Use clear sentences (8–12 words). Define subject-specific terms inline. Reduce embedded clauses. Keep one idea per sentence.
- advanced: Maintain academic content but simplify complex phrasing. Preserve subject-specific vocabulary with brief parenthetical definitions. Reduce sentence nesting.

GENERAL RULES:
- Preserve the core meaning and academic content.
- Use active voice.
- Keep instructions actionable and sequential.
- Do not add content that was not in the original.
- Do not diagnose or make assumptions about specific students.
- Output only the JSON object, no markdown fencing or commentary.`);

  const user = `GRADE: ${input.grade_band}
EAL LEVEL: ${input.eal_level}

SOURCE TEXT:
${renderPromptInput(input.source_text, "source_text")}

Simplify this text as a JSON object.`;

  return { system, user };
}

export function parseSimplifyResponse(
  raw: string,
  input: SimplifyInput,
): SimplifiedOutput {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }

  const parsed = JSON.parse(cleaned);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Expected JSON object for simplified output");
  }

  const p = parsed as Record<string, unknown>;

  return {
    simplified_id: randomUUID(),
    source_text: input.source_text,
    grade_band: input.grade_band,
    eal_level: input.eal_level,
    simplified_text: String(p.simplified_text ?? ""),
    key_vocabulary: Array.isArray(p.key_vocabulary)
      ? p.key_vocabulary.map(String)
      : [],
    visual_cue_suggestions: Array.isArray(p.visual_cue_suggestions)
      ? p.visual_cue_suggestions.map(String)
      : [],
    schema_version: "0.1.0",
  };
}
