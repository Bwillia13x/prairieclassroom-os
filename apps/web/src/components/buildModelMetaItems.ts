/**
 * Build the standard "model + latency + tokens" trio of OutputMetaRow items
 * from any inference response. Each panel that surfaces an AI generation
 * should spread this into its OutputMetaRow items array so teachers can see
 * which Gemma tier produced the output, how long it took, and how many
 * tokens it consumed.
 *
 * Designed to degrade gracefully:
 *  - mock and local backends report no tokens — only model + latency render
 *  - planning-tier latencies render in seconds; live tier in milliseconds
 *  - unknown model_id ("unknown" or empty string) is suppressed entirely
 */

export interface ModelMetaInput {
  model_id?: string;
  latency_ms?: number;
  prompt_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
}

// StatusChip's `icon` prop is a ReactNode, not a registry key; passing a raw
// string would render the string verbatim. We rely on tone alone for visual
// distinction so the chip stays portable across all panels.
interface MetaItem {
  label: string;
  tone?: "accent" | "analysis" | "provenance" | "pending" | "success" | "warning" | "danger" | "muted" | "sun" | "sage" | "slate" | "forest";
}

export function buildModelMetaItems(input: ModelMetaInput): MetaItem[] {
  const items: MetaItem[] = [];

  if (input.model_id && input.model_id !== "unknown") {
    items.push({ label: formatModelId(input.model_id), tone: "slate" });
  }

  if (typeof input.latency_ms === "number" && input.latency_ms > 0) {
    items.push({ label: formatLatency(input.latency_ms), tone: "muted" });
  }

  if (typeof input.total_tokens === "number" && input.total_tokens > 0) {
    items.push({ label: `${formatTokens(input.total_tokens)} tokens`, tone: "muted" });
  }

  return items;
}

function formatModelId(modelId: string): string {
  // Map raw IDs to teacher-readable labels. Unknown IDs pass through
  // verbatim so operators can still grep the request log.
  if (modelId === "mock") return "Mock (offline)";
  if (modelId.includes("gemma-4-26b") || modelId === "gemma4:4b" || modelId.endsWith("gemma-4-4b-it")) {
    return "Gemma 4 · live";
  }
  if (modelId.includes("gemma-4-31b") || modelId === "gemma4:27b" || modelId.endsWith("gemma-4-27b-it")) {
    return "Gemma 4 · planning";
  }
  return modelId;
}

function formatLatency(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function formatTokens(n: number): string {
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(1)}k`;
}
