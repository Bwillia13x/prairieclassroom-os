/**
 * StudentSummary — compact student state snapshot for dashboard display and decision support.
 * Captures student identification, pending actions, intervention timing, and alert status.
 */
import { z } from "zod";

export const StudentSummarySchema = z.object({
  alias: z.string(),
  pending_action_count: z.number().int().min(0),
  last_intervention_days: z.number().int().min(0).nullable(),
  active_pattern_count: z.number().int().min(0),
  pending_message_count: z.number().int().min(0),
  latest_priority_reason: z.string().nullable(),
  // NEW: daily intervention count for the last 14 days, oldest-first.
  // Index 0 is 13 days ago, index 13 is today. Always length 14.
  intervention_history_14d: z.array(z.number().int().min(0)).length(14),
});

export type StudentSummary = z.infer<typeof StudentSummarySchema>;
