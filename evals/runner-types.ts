/**
 * Shared types for the PrairieClassroom OS eval harness.
 */

export interface EvalCase {
  id: string;
  category: EvalCategory;
  description: string;
  prompt_class?: string | null;
  endpoint?: string;
  source_file?: string;
  input: Record<string, unknown>;
  expected: ExpectedOutput;
}

export type EvalCategory =
  | "content_quality"
  | "cross_feature_synthesis"
  | "differentiation_quality"
  | "latency_suitability"
  | "planning_usefulness"
  | "retrieval_relevance"
  | "schema_reliability"
  | "safety_correctness";

export interface ExpectedOutput {
  required_keys?: string[];
  must_contain?: string[];
  must_not_contain?: string[];
  schema_version?: string;
  max_latency_ms?: number;
  required_plan_keys?: string[];
  min_watchpoints?: number;
  min_priorities?: number;
  min_ea_actions?: number;
  min_prep_items?: number;
  required_message_keys?: string[];
  teacher_approved_must_be_false?: boolean;
  required_intervention_keys?: string[];
  required_simplified_keys?: string[];
  min_vocabulary?: number;
  min_visual_cues?: number;
  required_cardset_keys?: string[];
  required_card_keys?: string[];
  min_cards?: number;
  max_cards?: number;
  required_forecast_keys?: string[];
  min_blocks?: number;
  required_report_keys?: string[];
  min_themes?: number;
  min_gaps?: number;
  min_focus?: number;
  expected_status?: number;
  expected_error_category?: string;
  expected_detail_code?: string;
  expected_retryable?: boolean;
  expected_error_substring?: string;
  expected_report_null?: boolean;
}

export interface EvalResult {
  case_id: string;
  passed: boolean;
  failures: string[];
  latency_ms?: number;
  model_id?: string;
  category?: EvalCategory;
  description?: string;
  prompt_class?: string | null;
  endpoint?: string;
  source_file?: string;
}
