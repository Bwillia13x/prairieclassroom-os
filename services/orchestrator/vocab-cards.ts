// services/orchestrator/vocab-cards.ts
import type { VocabCardSet } from "../../packages/shared/schemas/language.js";
import { randomUUID } from "node:crypto";
import { renderPromptInput, withPromptSafetyNotice } from "./prompt-safety.js";

export interface VocabCardsPrompt {
  system: string;
  user: string;
}

export interface VocabCardsInput {
  artifact_id: string;
  artifact_text: string;
  subject: string;
  target_language: string;
  grade_band: string;
  curriculumContext?: string | null;
}

export function buildVocabCardsPrompt(input: VocabCardsInput): VocabCardsPrompt {
  const system = withPromptSafetyNotice(`You are PrairieClassroom OS, a bilingual vocabulary card generator for Alberta K–6 classrooms.

Your task: Extract 5–8 key vocabulary words from a lesson artifact and produce bilingual flashcard-style cards that help EAL students learn subject-specific vocabulary.

OUTPUT FORMAT: Respond with a JSON object containing a single field:
- "cards": array of card objects, each with:
  - "term": the English vocabulary word or phrase
  - "definition": a simple, grade-appropriate English definition (1 sentence)
  - "target_translation": the term translated into the target language
  - "example_sentence": a short sentence using the term in context from the lesson
  - "visual_hint": a brief description of an image or icon that could illustrate the term

RULES:
- Extract vocabulary that is critical for understanding the lesson content.
- Prioritize subject-specific and academic terms that EAL students are less likely to know.
- Keep definitions simple and grade-appropriate.
- Use the lesson content for example sentences — do not invent unrelated examples.
- If ALBERTA CURRICULUM ALIGNMENT is provided, prioritize terms that help students access that specific curriculum focus.
- Visual hints should be concrete and drawable (e.g., "drawing of a plant with roots labeled" not "abstract concept").
- Produce 5–8 cards. Do not exceed 8.
- If you are uncertain about a translation, provide the best available translation and mark it with (approx.) after the translation.
- Do not include proper nouns or student names.
- Output only the JSON object, no markdown fencing or commentary.`);

  const user = `SUBJECT: ${input.subject}
GRADE: ${input.grade_band}
TARGET LANGUAGE: ${input.target_language}

LESSON TEXT:
${renderPromptInput(input.artifact_text, "artifact_text")}
${input.curriculumContext ? `\n\n${input.curriculumContext}` : ""}

Generate bilingual vocabulary cards as a JSON object.`;

  return { system, user };
}

export function parseVocabCardsResponse(
  raw: string,
  input: VocabCardsInput,
): VocabCardSet {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }

  const parsed = JSON.parse(cleaned);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Expected JSON object for vocab card set");
  }

  const p = parsed as Record<string, unknown>;
  const cards = Array.isArray(p.cards) ? p.cards : [];

  return {
    set_id: randomUUID(),
    artifact_id: input.artifact_id,
    subject: input.subject,
    target_language: input.target_language,
    grade_band: input.grade_band,
    cards: cards.map((c: Record<string, unknown>) => ({
      term: String(c.term ?? ""),
      definition: String(c.definition ?? ""),
      target_translation: String(c.target_translation ?? ""),
      example_sentence: String(c.example_sentence ?? ""),
      visual_hint: String(c.visual_hint ?? ""),
    })),
    schema_version: "0.1.0",
  };
}
