/**
 * LessonArtifact — a source classroom material.
 * Maps to data-contracts.md LessonArtifact entity.
 */
export interface LessonArtifact {
  artifact_id: string;
  title: string;
  subject: string;
  source_type: "text" | "image" | "pdf" | "voice";
  source_path_or_blob_ref?: string;
  raw_text?: string;
  teacher_goal?: string;
  capture_timestamp?: string;
}

/**
 * Variant types the differentiation engine can produce.
 */
export type VariantType =
  | "core"
  | "eal_supported"
  | "chunked"
  | "ea_small_group"
  | "extension";

/**
 * DifferentiatedVariant — one output version of a lesson artifact.
 * Maps to data-contracts.md DifferentiatedVariant entity.
 */
export interface DifferentiatedVariant {
  variant_id: string;
  artifact_id: string;
  variant_type: VariantType;
  title: string;
  student_facing_instructions: string;
  teacher_notes: string;
  required_materials: string[];
  estimated_minutes: number;
  schema_version: string;
}
