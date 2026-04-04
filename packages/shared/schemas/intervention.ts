/**
 * InterventionRecord — structured documentation of a classroom intervention.
 * Maps to data-contracts.md InterventionRecord entity.
 */
import { z } from "zod";

export const InterventionRecordSchema = z.object({
  record_id: z.string(),
  classroom_id: z.string(),
  student_refs: z.array(z.string()),
  observation: z.string(),
  action_taken: z.string(),
  outcome: z.string().optional(),
  follow_up_needed: z.boolean(),
  created_at: z.string(),
  schema_version: z.string(),
});

export type InterventionRecord = z.infer<typeof InterventionRecordSchema>;
