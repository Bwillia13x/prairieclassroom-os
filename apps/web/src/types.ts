/**
 * Web layer types — re-exports domain models from shared schemas,
 * defines API response wrappers and UI-only types locally.
 *
 * Import everything from this file, not directly from @prairie/shared.
 */

import type {
  VariantType,
  LessonArtifact,
  DifferentiatedVariant,
  TomorrowPlan,
  TransitionWatchpoint,
  SupportPriority,
  EAAction,
  FamilyFollowup,
  FamilyMessageDraft,
  InterventionRecord,
  SimplifiedOutput,
  VocabCard,
  VocabCardSet,
  SupportPatternReport,
  RecurringTheme,
  FollowUpGap,
  PositiveTrend,
  SuggestedFocus,
  EABriefing,
  ScheduleBlock,
  StudentWatchItem,
  PendingFollowup,
  ComplexityForecast,
  ComplexityBlock,
  ScheduleBlockInput,
  UpcomingEvent,
  DebtItem,
  ComplexityDebtRegister,
  ClassroomHealth,
  StudentSummary,
  SurvivalPacket,
  EALoadProfile,
  EALoadBlock,
  EALoadLevel,
  CurriculumEntry,
  CurriculumSelection,
  CurriculumSubjectCode,
  CurriculumGrade,
} from "@prairie/shared";

// ── Domain model re-exports ─────────────────────────────────────────────────
// Single source of truth: adding a field to a shared schema
// automatically propagates to the web layer.

export type {
  VariantType,
  LessonArtifact,
  DifferentiatedVariant,
  TomorrowPlan,
  TransitionWatchpoint,
  SupportPriority,
  EAAction,
  FamilyFollowup,
  FamilyMessageDraft,
  InterventionRecord,
  SimplifiedOutput,
  VocabCard,
  VocabCardSet,
  SupportPatternReport,
  RecurringTheme,
  FollowUpGap,
  PositiveTrend,
  SuggestedFocus,
  EABriefing,
  ScheduleBlock,
  StudentWatchItem,
  PendingFollowup,
  ComplexityForecast,
  ComplexityBlock,
  ScheduleBlockInput,
  UpcomingEvent,
  DebtItem,
  ComplexityDebtRegister,
  ClassroomHealth,
  StudentSummary,
  SurvivalPacket,
  EALoadProfile,
  EALoadBlock,
  EALoadLevel,
  CurriculumEntry,
  CurriculumSelection,
  CurriculumSubjectCode,
  CurriculumGrade,
};

// ── Classroom profile (sanitized API view) ──────────────────────────────────
// The API strips access_code and replaces it with requires_access_code.
// Intentionally different from the server-side ClassroomProfile.

export interface ClassroomProfile {
  classroom_id: string;
  grade_band: string;
  subject_focus: string;
  classroom_notes: string[];
  students: { alias: string; family_language?: string; eal_flag?: boolean; support_tags?: string[] }[];
  requires_access_code?: boolean;
  is_demo?: boolean;
  schedule?: ScheduleBlockInput[];
  upcoming_events?: UpcomingEvent[];
}

// ── Request types ───────────────────────────────────────────────────────────

export interface DifferentiateRequest {
  artifact: LessonArtifact;
  classroom_id: string;
  teacher_goal?: string;
  curriculum_selection?: CurriculumSelection;
}

export interface TomorrowPlanRequest {
  classroom_id: string;
  teacher_reflection: string;
  artifacts?: LessonArtifact[];
  teacher_goal?: string;
}

export interface FamilyMessageRequest {
  classroom_id: string;
  student_refs: string[];
  message_type: "routine_update" | "missed_work" | "praise" | "low_stakes_concern";
  target_language: string;
  context?: string;
}

export interface InterventionRequest {
  classroom_id: string;
  student_refs: string[];
  teacher_note: string;
  context?: string;
}

export interface SimplifyRequest {
  source_text: string;
  grade_band: string;
  eal_level: "beginner" | "intermediate" | "advanced";
}

export interface VocabCardsRequest {
  artifact_id?: string;
  artifact_text: string;
  subject: string;
  target_language: string;
  grade_band: string;
  curriculum_selection?: CurriculumSelection;
}

export interface CurriculumSubjectSummary {
  subject_code: CurriculumSubjectCode;
  subject_label: string;
}

export interface SupportPatternsRequest {
  classroom_id: string;
  student_filter?: string;
  time_window?: number;
}

export interface EABriefingRequest {
  classroom_id: string;
  ea_name?: string;
}

export interface ComplexityForecastRequest {
  classroom_id: string;
  forecast_date: string;
  teacher_notes?: string;
}

export interface EALoadRequest {
  classroom_id: string;
  target_date: string;
  teacher_notes?: string;
}

// ── Response wrapper types ──────────────────────────────────────────────────

export interface DifferentiateResponse {
  artifact_id: string;
  variants: DifferentiatedVariant[];
  model_id: string;
  latency_ms: number;
  prompt_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
}

export interface TomorrowPlanResponse {
  plan: TomorrowPlan;
  thinking_summary: string | null;
  pattern_informed: boolean;
  model_id: string;
  latency_ms: number;
  prompt_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
}

export interface FamilyMessageResponse {
  draft: FamilyMessageDraft;
  model_id: string;
  latency_ms: number;
  prompt_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
}

export interface InterventionResponse {
  record: InterventionRecord;
  model_id: string;
  latency_ms: number;
  prompt_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
}

export interface SimplifyResponse {
  simplified: SimplifiedOutput;
  model_id: string;
  latency_ms: number;
  prompt_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
}

export interface VocabCardsResponse {
  card_set: VocabCardSet;
  model_id: string;
  latency_ms: number;
  prompt_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
}

export interface SupportPatternsResponse {
  report: SupportPatternReport;
  thinking_summary: string | null;
  model_id: string;
  latency_ms: number;
  prompt_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
}

export interface EABriefingResponse {
  briefing: EABriefing;
  model_id: string;
  latency_ms: number;
  prompt_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
}

export interface ComplexityForecastResponse {
  forecast: ComplexityForecast;
  thinking_summary: string | null;
  model_id: string;
  latency_ms: number;
  prompt_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
}

export interface EALoadResponse {
  profile: EALoadProfile;
  thinking_summary: string | null;
  model_id: string;
  latency_ms: number;
  prompt_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
}

export interface SurvivalPacketResponse {
  packet: SurvivalPacket;
  model_id: string;
  latency_ms: number;
  thinking_summary?: string;
  prompt_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
}

export interface ExtractWorksheetResponse {
  extracted_text: string;
  confidence_notes: string[];
  curriculum_suggestions: CurriculumEntry[];
  model_id: string;
  latency_ms: number;
  prompt_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
}

// ── Composite API types ─────────────────────────────────────────────────────

export interface TodaySnapshot {
  debt_register: ComplexityDebtRegister;
  latest_plan: TomorrowPlan | null;
  latest_forecast: ComplexityForecast | null;
  student_count: number;
  last_activity_at: string | null;
}

// ── UI-only types ───────────────────────────────────────────────────────────

export type TomorrowNoteSource =
  | "differentiate"
  | "tomorrow-plan"
  | "support-patterns"
  | "ea-briefing"
  | "complexity-forecast"
  | "survival-packet"
  | "language-tools"
  | "family-message";

export interface TomorrowNote {
  id: string;
  sourcePanel: TomorrowNoteSource;
  sourceType: string; // e.g. "differentiate_material"
  summary: string;
  createdAt: string; // ISO-8601
}

export interface FamilyMessagePrefill {
  student_ref: string;
  reason: string;
  message_type: string;
}

export interface InterventionPrefill {
  student_ref: string;
  suggested_action: string;
  reason: string;
}

export type DrillDownContext =
  | { type: "forecast-block"; blockIndex: number; block: ComplexityBlock }
  | { type: "student"; alias: string; initialData?: StudentSummary }
  | { type: "debt-category"; category: string; items: DebtItem[] }
  | { type: "trend"; trendKey: "debt" | "plans" | "complexity"; data: number[]; label: string; highlightIndex?: number }
  | { type: "plan-coverage-section"; section: "watchpoints" | "priorities" | "ea_actions" | "prep_items" | "family_followups"; label: string; items: string[] }
  | { type: "student-tag-group"; groupKind: "eal" | "support_cluster" | "family_language"; tag: string; label: string; students: { alias: string; eal_flag?: boolean; support_tags?: string[]; family_language?: string }[] }
  | { type: "variant-lane"; variantType: string; label: string; variants: { variant_type: string; estimated_minutes: number; title: string }[] };
