/**
 * ClassroomProfile — represents one classroom's context.
 * Maps to data-contracts.md ClassroomProfile entity.
 */
export interface ClassroomProfile {
  classroom_id: string;
  grade_band: string;
  subject_focus: string;
  classroom_notes: string[];
  routines: Record<string, string>;
  support_constraints?: string[];
  students: StudentSupportSummary[];
}

/**
 * StudentSupportSummary — per-student support context.
 * Maps to data-contracts.md StudentSupportSummary entity.
 */
export interface StudentSupportSummary {
  student_id: string;
  alias: string;
  eal_flag: boolean;
  support_tags: string[];
  known_successful_scaffolds: string[];
  communication_notes?: string[];
}
