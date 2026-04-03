/** Shared types mirroring packages/shared/schemas for the web layer. */

export type VariantType =
  | "core"
  | "eal_supported"
  | "chunked"
  | "ea_small_group"
  | "extension";

export interface LessonArtifact {
  artifact_id: string;
  title: string;
  subject: string;
  source_type: "text" | "image" | "pdf" | "voice";
  raw_text?: string;
  teacher_goal?: string;
}

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

export interface ClassroomProfile {
  classroom_id: string;
  grade_band: string;
  subject_focus: string;
  classroom_notes: string[];
}

export interface DifferentiateRequest {
  artifact: LessonArtifact;
  classroom_id: string;
  teacher_goal?: string;
}

export interface DifferentiateResponse {
  artifact_id: string;
  variants: DifferentiatedVariant[];
  model_id: string;
  latency_ms: number;
}

// ----- Tomorrow Plan types -----

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

export interface TomorrowPlanRequest {
  classroom_id: string;
  teacher_reflection: string;
  artifacts?: LessonArtifact[];
  teacher_goal?: string;
}

export interface TomorrowPlanResponse {
  plan: TomorrowPlan;
  thinking_summary: string | null;
  model_id: string;
  latency_ms: number;
}

// ----- Family Message types -----

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

export interface FamilyMessageRequest {
  classroom_id: string;
  student_refs: string[];
  message_type: "routine_update" | "missed_work" | "praise" | "low_stakes_concern";
  target_language: string;
  context?: string;
}

export interface FamilyMessageResponse {
  draft: FamilyMessageDraft;
  model_id: string;
  latency_ms: number;
}

export interface FamilyMessagePrefill {
  student_ref: string;
  reason: string;
  message_type: string;
}
