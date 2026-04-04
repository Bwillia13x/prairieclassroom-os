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
  students: { alias: string }[];
  schedule?: ScheduleBlockInput[];
  upcoming_events?: UpcomingEvent[];
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
  pattern_informed: boolean;
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

// ----- Intervention types -----

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

export interface InterventionRequest {
  classroom_id: string;
  student_refs: string[];
  teacher_note: string;
  context?: string;
}

export interface InterventionResponse {
  record: InterventionRecord;
  model_id: string;
  latency_ms: number;
}

export interface InterventionPrefill {
  student_ref: string;
  suggested_action: string;
  reason: string;
}

// ----- Language Tools types -----

export interface SimplifiedOutput {
  simplified_id: string;
  source_text: string;
  grade_band: string;
  eal_level: "beginner" | "intermediate" | "advanced";
  simplified_text: string;
  key_vocabulary: string[];
  visual_cue_suggestions: string[];
  schema_version: string;
}

export interface SimplifyRequest {
  source_text: string;
  grade_band: string;
  eal_level: "beginner" | "intermediate" | "advanced";
}

export interface SimplifyResponse {
  simplified: SimplifiedOutput;
  model_id: string;
  latency_ms: number;
}

export interface VocabCard {
  term: string;
  definition: string;
  target_translation: string;
  example_sentence: string;
  visual_hint: string;
}

export interface VocabCardSet {
  set_id: string;
  artifact_id: string;
  subject: string;
  target_language: string;
  grade_band: string;
  cards: VocabCard[];
  schema_version: string;
}

export interface VocabCardsRequest {
  artifact_id?: string;
  artifact_text: string;
  subject: string;
  target_language: string;
  grade_band: string;
}

export interface VocabCardsResponse {
  card_set: VocabCardSet;
  model_id: string;
  latency_ms: number;
}

// ----- Support Pattern types -----

export interface RecurringTheme {
  theme: string;
  student_refs: string[];
  evidence_count: number;
  example_observations: string[];
}

export interface FollowUpGap {
  original_record_id: string;
  student_refs: string[];
  observation: string;
  days_since: number;
}

export interface PositiveTrend {
  student_ref: string;
  description: string;
  evidence: string[];
}

export interface SuggestedFocus {
  student_ref: string;
  reason: string;
  suggested_action: string;
  priority: "high" | "medium" | "low";
}

export interface SupportPatternReport {
  report_id: string;
  classroom_id: string;
  student_filter: string | null;
  time_window: number;
  recurring_themes: RecurringTheme[];
  follow_up_gaps: FollowUpGap[];
  positive_trends: PositiveTrend[];
  suggested_focus: SuggestedFocus[];
  generated_at: string;
  schema_version: string;
}

export interface SupportPatternsRequest {
  classroom_id: string;
  student_filter?: string;
  time_window?: number;
}

export interface SupportPatternsResponse {
  report: SupportPatternReport;
  thinking_summary: string | null;
  model_id: string;
  latency_ms: number;
}

// ----- EA Briefing types -----

export interface ScheduleBlock {
  time_slot: string;
  student_refs: string[];
  task_description: string;
  materials_needed: string[];
}

export interface StudentWatchItem {
  student_ref: string;
  context_summary: string;
  suggested_approach: string;
}

export interface PendingFollowup {
  student_ref: string;
  original_observation: string;
  days_since: number;
  suggested_action: string;
}

export interface EABriefing {
  briefing_id: string;
  classroom_id: string;
  date: string;
  schedule_blocks: ScheduleBlock[];
  student_watch_list: StudentWatchItem[];
  pending_followups: PendingFollowup[];
  teacher_notes_for_ea: string;
  schema_version: string;
}

export interface EABriefingRequest {
  classroom_id: string;
  ea_name?: string;
}

export interface EABriefingResponse {
  briefing: EABriefing;
  model_id: string;
  latency_ms: number;
}

// ----- Complexity Forecast -----

export interface ScheduleBlockInput {
  time_slot: string;
  activity: string;
  ea_available: boolean;
  notes?: string;
}

export interface UpcomingEvent {
  description: string;
  time_slot?: string;
  impacts?: string;
}

export interface ComplexityBlock {
  time_slot: string;
  activity: string;
  level: "low" | "medium" | "high";
  contributing_factors: string[];
  suggested_mitigation: string;
}

export interface ComplexityForecast {
  forecast_id: string;
  classroom_id: string;
  forecast_date: string;
  blocks: ComplexityBlock[];
  overall_summary: string;
  highest_risk_block: string;
  schema_version: string;
}

export interface ComplexityForecastRequest {
  classroom_id: string;
  forecast_date: string;
  teacher_notes?: string;
}

export interface ComplexityForecastResponse {
  forecast: ComplexityForecast;
  thinking_summary: string | null;
  model_id: string;
  latency_ms: number;
}

// ----- Survival Packet types -----

export interface SurvivalPacketResponse {
  packet: {
    packet_id: string;
    classroom_id: string;
    generated_for_date: string;
    routines: Array<{ time_or_label: string; description: string; recent_changes?: string }>;
    student_support: Array<{ student_ref: string; current_scaffolds: string[]; key_strategies: string; things_to_avoid?: string }>;
    ea_coordination: { ea_name?: string; schedule_summary: string; primary_students: string[]; if_ea_absent: string };
    simplified_day_plan: Array<{ time_slot: string; activity: string; sub_instructions: string; materials_location?: string }>;
    family_comms: Array<{ student_ref: string; status: string; language_preference?: string; notes: string }>;
    complexity_peaks: Array<{ time_slot: string; level: string; reason: string; mitigation: string }>;
    heads_up: string[];
    schema_version: string;
  };
  model_id: string;
  latency_ms: number;
  thinking_summary?: string;
}
