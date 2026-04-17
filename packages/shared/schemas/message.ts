/**
 * FamilyMessageDraft — a teacher-approvable family communication.
 * Maps to data-contracts.md FamilyMessageDraft entity.
 */
import { z } from "zod";

export const FamilyMessageDraftSchema = z.object({
  draft_id: z.string(),
  classroom_id: z.string(),
  student_refs: z.array(z.string()),
  message_type: z.enum(["routine_update", "missed_work", "praise", "low_stakes_concern"]),
  target_language: z.string(),
  /** The original AI-generated draft text. Immutable once written. */
  plain_language_text: z.string(),
  simplified_student_text: z.string().optional(),
  /**
   * The teacher's edited version of plain_language_text, captured at
   * approval time when the dialog's textarea diverged from the AI draft.
   * Source of truth for what the family actually receives.
   * Absent when the teacher approved the AI draft verbatim.
   */
  edited_text: z.string().optional(),
  teacher_approved: z.boolean(),
  approval_timestamp: z.string().optional(),
  schema_version: z.string(),
});

export type FamilyMessageDraft = z.infer<typeof FamilyMessageDraftSchema>;
