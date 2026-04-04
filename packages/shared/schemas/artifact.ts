/**
 * LessonArtifact — a source classroom material.
 * Maps to data-contracts.md LessonArtifact entity.
 */
import { z } from "zod";

export const LessonArtifactSchema = z.object({
  artifact_id: z.string(),
  title: z.string(),
  subject: z.string(),
  source_type: z.enum(["text", "image", "pdf", "voice"]),
  source_path_or_blob_ref: z.string().optional(),
  raw_text: z.string().optional(),
  teacher_goal: z.string().optional(),
  capture_timestamp: z.string().optional(),
});

export type LessonArtifact = z.infer<typeof LessonArtifactSchema>;

/**
 * Variant types the differentiation engine can produce.
 */
export const VariantTypeSchema = z.enum([
  "core",
  "eal_supported",
  "chunked",
  "ea_small_group",
  "extension",
]);

export type VariantType = z.infer<typeof VariantTypeSchema>;

/**
 * DifferentiatedVariant — one output version of a lesson artifact.
 * Maps to data-contracts.md DifferentiatedVariant entity.
 */
export const DifferentiatedVariantSchema = z.object({
  variant_id: z.string(),
  artifact_id: z.string(),
  variant_type: VariantTypeSchema,
  title: z.string(),
  student_facing_instructions: z.string(),
  teacher_notes: z.string(),
  required_materials: z.array(z.string()),
  estimated_minutes: z.number(),
  schema_version: z.string(),
});

export type DifferentiatedVariant = z.infer<typeof DifferentiatedVariantSchema>;
