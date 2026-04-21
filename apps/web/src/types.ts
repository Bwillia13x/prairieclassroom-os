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
  ScaffoldDecayReport,
  EALoadProfile,
  EALoadBlock,
  EALoadLevel,
  CurriculumEntry,
  CurriculumSelection,
  CurriculumSubjectCode,
  CurriculumGrade,
  RetrievalTrace,
  RetrievalCitation,
  RetrievalSourceType,
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
  ScaffoldDecayReport,
  EALoadProfile,
  EALoadBlock,
  EALoadLevel,
  CurriculumEntry,
  CurriculumSelection,
  CurriculumSubjectCode,
  CurriculumGrade,
  RetrievalTrace,
  RetrievalCitation,
  RetrievalSourceType,
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
  /**
   * Teacher-authored coordination notes for today (e.g., "EA covering
   * blocks 2–3 only, focus on Brody during math"). Optional; when
   * present the prompt renders them in the same slot Forecast uses
   * for teacher_notes. 2026-04-19 OPS audit (phase 4).
   */
  coordination_notes?: string;
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
  retrieval_trace?: RetrievalTrace;
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
  retrieval_trace?: RetrievalTrace;
  model_id: string;
  latency_ms: number;
  prompt_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
}

export interface EABriefingResponse {
  briefing: EABriefing;
  retrieval_trace?: RetrievalTrace;
  model_id: string;
  latency_ms: number;
  prompt_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
}

export interface ComplexityForecastResponse {
  forecast: ComplexityForecast;
  thinking_summary: string | null;
  retrieval_trace?: RetrievalTrace;
  model_id: string;
  latency_ms: number;
  prompt_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
}

export interface EALoadResponse {
  profile: EALoadProfile;
  thinking_summary: string | null;
  retrieval_trace?: RetrievalTrace;
  model_id: string;
  latency_ms: number;
  prompt_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
}

export interface SurvivalPacketResponse {
  packet: SurvivalPacket;
  retrieval_trace?: RetrievalTrace;
  model_id: string;
  latency_ms: number;
  thinking_summary?: string;
  prompt_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
}

export interface ScaffoldDecayResponse {
  report: ScaffoldDecayReport | null;
  insufficient_records?: boolean;
  record_count?: number;
  message?: string;
  thinking_summary?: string | null;
  retrieval_trace?: RetrievalTrace;
  model_id?: string;
  latency_ms?: number;
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

export type PanelStatusState =
  | "needs_action"
  | "draft_ready"
  | "fresh"
  | "stale"
  | "not_applicable";

export type PanelDependencyState = "ready" | "waiting" | "stale";

export interface PanelStatus {
  panel_id: string;
  label: string;
  state: PanelStatusState;
  dependency_state: PanelDependencyState;
  pending_count: number;
  detail: string;
  last_run_at: string | null;
}

export interface StudentThreadAction {
  category: string;
  label: string;
  count: number;
  target_tab: string;
  state: Extract<PanelStatusState, "needs_action" | "draft_ready" | "fresh">;
}

export interface StudentThread {
  alias: string;
  priority_reason: string | null;
  last_intervention_days: number | null;
  pending_action_count: number;
  pending_message_count: number;
  active_pattern_count: number;
  thread_count: number;
  eal_flag?: boolean;
  family_language?: string;
  support_tags?: string[];
  actions: StudentThreadAction[];
}

export interface TodaySnapshot {
  debt_register: ComplexityDebtRegister;
  latest_plan: TomorrowPlan | null;
  latest_forecast: ComplexityForecast | null;
  student_count: number;
  last_activity_at: string | null;
  panel_statuses?: PanelStatus[];
  student_threads?: StudentThread[];
}

export type OperatingDashboardBlockLevel = ComplexityBlock["level"] | "unknown";
export type OperatingDashboardSource = "forecast" | "schedule" | "event" | "insufficient_data";

export interface OperatingDashboardWeekBlock {
  id: string;
  day_id: string;
  time_slot: string;
  activity: string;
  level: OperatingDashboardBlockLevel;
  source: OperatingDashboardSource;
  detail: string;
  forecast_index?: number | null;
  event_count?: number;
}

export interface OperatingDashboardDay {
  id: string;
  label: string;
  date_label: string;
  is_today: boolean;
  source: OperatingDashboardSource;
  blocks: OperatingDashboardWeekBlock[];
}

export type OperatingDashboardCoverageCategory =
  | "touchpoint"
  | "family"
  | "eal"
  | "support"
  | "plan";

export type OperatingDashboardCoverageState =
  | "open"
  | "watch"
  | "covered"
  | "not_applicable";

export interface OperatingDashboardCoverageCell {
  category: OperatingDashboardCoverageCategory;
  label: string;
  state: OperatingDashboardCoverageState;
  count: number;
  detail: string;
  target_tab: string | null;
}

export interface OperatingDashboardCoverageRow {
  alias: string;
  priority_reason: string | null;
  thread_count: number;
  eal_flag?: boolean;
  family_language?: string;
  support_tags?: string[];
  cells: OperatingDashboardCoverageCell[];
  thread?: StudentThread;
}

export interface OperatingDashboardQueue {
  id: string;
  label: string;
  count: number;
  state: PanelStatusState | "waiting" | "clear";
  target_tab: string | null;
  detail: string;
  status?: PanelStatus;
}

export interface OperatingDashboardTransitionRisk {
  id: string;
  time_slot: string;
  activity: string;
  level: OperatingDashboardBlockLevel;
  reason: string;
  mitigation: string;
  watchpoints: string[];
  target_tab: string | null;
  forecast_index?: number | null;
}

export interface OperatingDashboardSnapshot {
  week_overview: OperatingDashboardDay[];
  support_coverage: OperatingDashboardCoverageRow[];
  communication_queue: OperatingDashboardQueue[];
  prep_queue: OperatingDashboardQueue[];
  transition_risks: OperatingDashboardTransitionRisk[];
  outcome_metrics: {
    today_exits: number;
    return_loops: number;
    session_endings: number;
  };
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
  | { type: "ea-load-block"; blockIndex: number; block: EALoadBlock }
  | { type: "student"; alias: string; initialData?: StudentSummary }
  | { type: "student-thread"; thread: StudentThread }
  | { type: "week-day"; day: OperatingDashboardDay }
  | { type: "queue-state"; queue: OperatingDashboardQueue }
  | { type: "coverage-cell"; row: OperatingDashboardCoverageRow; cell: OperatingDashboardCoverageCell }
  | { type: "transition-risk"; risk: OperatingDashboardTransitionRisk }
  | { type: "debt-category"; category: string; items: DebtItem[] }
  | { type: "panel-status"; status: PanelStatus }
  | { type: "trend"; trendKey: "debt" | "plans" | "complexity"; data: number[]; label: string; highlightIndex?: number }
  | { type: "plan-coverage-section"; section: "watchpoints" | "priorities" | "ea_actions" | "prep_items" | "family_followups"; label: string; items: string[] }
  | { type: "student-tag-group"; groupKind: "eal" | "support_cluster" | "family_language"; tag: string; label: string; students: { alias: string; eal_flag?: boolean; support_tags?: string[]; family_language?: string }[] }
  | { type: "variant-lane"; variantType: string; label: string; variants: { variant_type: string; estimated_minutes: number; title: string }[] };
