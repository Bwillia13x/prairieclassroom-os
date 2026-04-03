/**
 * FamilyMessageDraft — a teacher-approvable family communication.
 * Maps to data-contracts.md FamilyMessageDraft entity.
 */
export interface FamilyMessageDraft {
  draft_id: string;
  classroom_id: string;
  student_refs: string[];
  message_type: "routine_update" | "missed_work" | "praise" | "low_stakes_concern";
  target_language: string;
  plain_language_text: string;
  simplified_student_text?: string;
  teacher_approved: boolean;
  approval_timestamp?: string;
  schema_version: string;
}
