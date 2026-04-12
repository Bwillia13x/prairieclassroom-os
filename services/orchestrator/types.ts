/**
 * Orchestrator types for PrairieClassroom OS.
 *
 * Defines prompt classes, model routing, and the core
 * request/response flow through the orchestration layer.
 */

// ----- Prompt classes -----

export type PromptClass =
  | "differentiate_material"
  | "prepare_tomorrow_plan"
  | "draft_family_message"
  | "log_intervention"
  | "simplify_for_student"
  | "generate_vocab_cards"
  | "detect_support_patterns"
  | "generate_ea_briefing"
  | "forecast_complexity"
  | "detect_scaffold_decay"
  | "generate_survival_packet"
  | "extract_worksheet"
  | "balance_ea_load";

// ----- Model routing -----

export type ModelTier = "live" | "planning";

export interface RouteConfig {
  prompt_class: PromptClass;
  model_tier: ModelTier;
  thinking_enabled: boolean;
  retrieval_required: boolean;
  tool_call_capable: boolean;
  output_schema_version: string;
}

// ----- Orchestration request/response -----

export interface OrchestrationRequest {
  prompt_class: PromptClass;
  classroom_id: string;
  artifact_ids?: string[];
  teacher_note?: string;
  images?: string[];
  target_language?: string;
  student_refs?: string[];
}

export interface OrchestrationResponse {
  prompt_class: PromptClass;
  model_tier: ModelTier;
  raw_output: string;
  parsed_output: unknown;
  tool_calls: ToolCallRecord[];
  latency_ms: number;
  retrieval_used: boolean;
}

// ----- Tool call types -----

export interface ToolCallRecord {
  tool_name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  executed: boolean;
  timestamp: string;
}

// ----- Audit log entry -----

export interface AuditEntry {
  request_id: string;
  prompt_class: PromptClass;
  model_tier: ModelTier;
  tool_calls: ToolCallRecord[];
  safety_checks: string[];
  teacher_approved: boolean;
  timestamp: string;
}
