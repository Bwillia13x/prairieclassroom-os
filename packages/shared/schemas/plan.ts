/**
 * TomorrowPlan — next-day support plan output.
 * Maps to data-contracts.md TomorrowPlan entity.
 */
import { z } from "zod";

export const TransitionWatchpointSchema = z.object({
  time_or_activity: z.string(),
  risk_description: z.string(),
  suggested_mitigation: z.string(),
});

export type TransitionWatchpoint = z.infer<typeof TransitionWatchpointSchema>;

export const SupportPrioritySchema = z.object({
  student_ref: z.string(),
  reason: z.string(),
  suggested_action: z.string(),
});

export type SupportPriority = z.infer<typeof SupportPrioritySchema>;

export const EAActionSchema = z.object({
  description: z.string(),
  student_refs: z.array(z.string()),
  timing: z.string(),
});

export type EAAction = z.infer<typeof EAActionSchema>;

export const FamilyFollowupSchema = z.object({
  student_ref: z.string(),
  reason: z.string(),
  message_type: z.string(),
});

export type FamilyFollowup = z.infer<typeof FamilyFollowupSchema>;

export const TomorrowPlanSchema = z.object({
  plan_id: z.string(),
  classroom_id: z.string(),
  source_artifact_ids: z.array(z.string()),
  transition_watchpoints: z.array(TransitionWatchpointSchema),
  support_priorities: z.array(SupportPrioritySchema),
  ea_actions: z.array(EAActionSchema),
  prep_checklist: z.array(z.string()),
  family_followups: z.array(FamilyFollowupSchema),
  schema_version: z.string(),
});

export type TomorrowPlan = z.infer<typeof TomorrowPlanSchema>;
