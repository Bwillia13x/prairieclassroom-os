/**
 * InterventionRecord — structured documentation of a classroom intervention.
 * Maps to data-contracts.md InterventionRecord entity.
 */
export interface InterventionRecord {
  record_id: string;
  classroom_id: string;
  student_refs: string[];
  observation: string;
  action_taken: string;
  outcome?: string;
  follow_up_needed: boolean;
  created_at: string;
  schema_version: string;
}
