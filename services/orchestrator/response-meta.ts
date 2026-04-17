import type { InferenceResult } from "./inference-client.js";

/**
 * Build the standard inference-meta block that every model-routed route
 * returns to the orchestrator client. Centralizing the shape keeps all 13
 * routes consistent and makes it cheap to add new fields (e.g. tool_calls,
 * cost_usd) later without touching every handler.
 */
export interface InferenceResponseMeta {
  model_id: string;
  latency_ms: number;
  prompt_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
}

export function inferenceResponseMeta(
  inferenceData: InferenceResult,
  fallbackModelId: string,
): InferenceResponseMeta {
  return {
    model_id: inferenceData.model_id || fallbackModelId,
    latency_ms: inferenceData.latency_ms,
    prompt_tokens: inferenceData.prompt_tokens,
    output_tokens: inferenceData.output_tokens,
    total_tokens: inferenceData.total_tokens,
  };
}
