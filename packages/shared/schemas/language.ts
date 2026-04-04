/**
 * Language tools schemas — simplification outputs and vocabulary cards.
 * Sprint 5: Language Bridge & Multilingual Support.
 */
import { z } from "zod";

export const SimplifiedOutputSchema = z.object({
  simplified_id: z.string(),
  source_text: z.string(),
  grade_band: z.string(),
  eal_level: z.enum(["beginner", "intermediate", "advanced"]),
  simplified_text: z.string(),
  key_vocabulary: z.array(z.string()),
  visual_cue_suggestions: z.array(z.string()),
  schema_version: z.string(),
});

export type SimplifiedOutput = z.infer<typeof SimplifiedOutputSchema>;

export const VocabCardSchema = z.object({
  term: z.string(),
  definition: z.string(),
  target_translation: z.string(),
  example_sentence: z.string(),
  visual_hint: z.string(),
});

export type VocabCard = z.infer<typeof VocabCardSchema>;

export const VocabCardSetSchema = z.object({
  set_id: z.string(),
  artifact_id: z.string(),
  subject: z.string(),
  target_language: z.string(),
  grade_band: z.string(),
  cards: z.array(VocabCardSchema),
  schema_version: z.string(),
});

export type VocabCardSet = z.infer<typeof VocabCardSetSchema>;
