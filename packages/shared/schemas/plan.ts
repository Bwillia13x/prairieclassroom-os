/**
 * TomorrowPlan — next-day support plan output.
 * Maps to data-contracts.md TomorrowPlan entity.
 */
export interface TomorrowPlan {
  plan_id: string;
  classroom_id: string;
  source_artifact_ids: string[];
  transition_watchpoints: TransitionWatchpoint[];
  support_priorities: SupportPriority[];
  ea_actions: EAAction[];
  prep_checklist: string[];
  family_followups: FamilyFollowup[];
  schema_version: string;
}

export interface TransitionWatchpoint {
  time_or_activity: string;
  risk_description: string;
  suggested_mitigation: string;
}

export interface SupportPriority {
  student_ref: string;
  reason: string;
  suggested_action: string;
}

export interface EAAction {
  description: string;
  student_refs: string[];
  timing: string;
}

export interface FamilyFollowup {
  student_ref: string;
  reason: string;
  message_type: string;
}
