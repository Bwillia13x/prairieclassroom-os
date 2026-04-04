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
  plain_language_text: z.string(),
  simplified_student_text: z.string().optional(),
  teacher_approved: z.boolean(),
  approval_timestamp: z.string().optional(),
  schema_version: z.string(),
});

export type FamilyMessageDraft = z.infer<typeof FamilyMessageDraftSchema>;
