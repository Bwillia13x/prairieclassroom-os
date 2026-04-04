/**
 * Orchestrator Router — maps prompt classes to model routes.
 *
 * This is the central routing table referenced by docs/prompt-contracts.md.
 * Each prompt class has a default route configuration that determines
 * which Gemma 4 tier handles it, whether thinking is enabled, etc.
 */

import type { PromptClass, RouteConfig, ModelTier } from "./types.js";

// ----- Routing table (Sprint 0 — provisional) -----

const ROUTING_TABLE: Record<PromptClass, RouteConfig> = {
  differentiate_material: {
    prompt_class: "differentiate_material",
    model_tier: "live",
    thinking_enabled: false,
    retrieval_required: false,
    tool_call_capable: true,
    output_schema_version: "0.1.0",
  },
  prepare_tomorrow_plan: {
    prompt_class: "prepare_tomorrow_plan",
    model_tier: "planning",
    thinking_enabled: true,
    retrieval_required: true,
    tool_call_capable: true,
    output_schema_version: "0.1.0",
  },
  draft_family_message: {
    prompt_class: "draft_family_message",
    model_tier: "live",
    thinking_enabled: false,
    retrieval_required: false,
    tool_call_capable: false,
    output_schema_version: "0.1.0",
  },
  log_intervention: {
    prompt_class: "log_intervention",
    model_tier: "live",
    thinking_enabled: false,
    retrieval_required: false,
    tool_call_capable: false,
    output_schema_version: "0.1.0",
  },
  simplify_for_student: {
    prompt_class: "simplify_for_student",
    model_tier: "live",
    thinking_enabled: false,
    retrieval_required: false,
    tool_call_capable: false,
    output_schema_version: "0.1.0",
  },
  generate_vocab_cards: {
    prompt_class: "generate_vocab_cards",
    model_tier: "live",
    thinking_enabled: false,
    retrieval_required: false,
    tool_call_capable: false,
    output_schema_version: "0.1.0",
  },
  detect_support_patterns: {
    prompt_class: "detect_support_patterns",
    model_tier: "planning",
    thinking_enabled: true,
    retrieval_required: true,
    tool_call_capable: false,
    output_schema_version: "0.1.0",
  },
  generate_ea_briefing: {
    prompt_class: "generate_ea_briefing",
    model_tier: "live",
    thinking_enabled: false,
    retrieval_required: true,
    tool_call_capable: false,
    output_schema_version: "0.1.0",
  },
  forecast_complexity: {
    prompt_class: "forecast_complexity",
    model_tier: "planning",
    thinking_enabled: true,
    retrieval_required: true,
    tool_call_capable: false,
    output_schema_version: "0.1.0",
  },
  detect_scaffold_decay: {
    prompt_class: "detect_scaffold_decay",
    model_tier: "planning",
    thinking_enabled: true,
    retrieval_required: true,
    tool_call_capable: false,
    output_schema_version: "0.1.0",
  },
};

/**
 * Get the route configuration for a prompt class.
 */
export function getRoute(promptClass: PromptClass): RouteConfig {
  const route = ROUTING_TABLE[promptClass];
  if (!route) {
    throw new Error(`Unknown prompt class: ${promptClass}`);
  }
  return route;
}

/**
 * Get the Gemma model identifier for a given tier.
 * These are provisional — will be updated when actual model access is confirmed.
 */
export function getModelId(tier: ModelTier): string {
  switch (tier) {
    case "live":
      return "google/gemma-4-4b-it";
    case "planning":
      return "google/gemma-4-27b-it";
    default:
      throw new Error(`Unknown model tier: ${tier}`);
  }
}

/**
 * List all registered prompt classes.
 */
export function listPromptClasses(): PromptClass[] {
  return Object.keys(ROUTING_TABLE) as PromptClass[];
}

/**
 * Get the full routing table (for diagnostics / eval).
 */
export function getRoutingTable(): Record<PromptClass, RouteConfig> {
  return { ...ROUTING_TABLE };
}
