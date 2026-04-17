import type { Request, Response } from "express";
import type { RouteDeps } from "./route-deps.js";
import type { RouteConfig, ToolCallRecord, ToolDefinition } from "./types.js";
import { RouteError } from "./errors.js";
import { setRequestContext } from "./request-context.js";
import { detectPromptInjectionInUnknown } from "./prompt-safety.js";
import {
  getBudgetUsd,
  getTodaySpendUsd,
  isBudgetExceeded,
  recordCallSpend,
} from "./cost-budget.js";
import {
  executeToolCalls,
  getToolsForPromptClass,
  toolDefinitions,
  type RegisteredTool,
} from "./tool-registry.js";
import { unsafeCastClassroomId } from "../../packages/shared/schemas/branded.js";

interface GenerateResponse {
  text: string;
  thinking_text?: string | null;
  model_id?: string;
  latency_ms?: number;
  tool_calls?: unknown[];
  prompt_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
}

interface InferenceOptions {
  deps: RouteDeps;
  req: Request;
  res: Response;
  route: RouteConfig;
  prompt: {
    system: string;
    user: string;
  };
  maxTokens: number;
  mockContext?: Record<string, unknown>;
  images?: string[];
  safetyScanSource?: unknown;
}

export interface InferenceResult {
  text: string;
  thinking_text: string | null;
  model_id: string;
  latency_ms: number;
  tool_calls: ToolCallRecord[];
  prompt_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
}

const MAX_RETRIES = 2;
const MAX_TOOL_TURNS = 1;
const DEFAULT_TIMEOUT_BY_TIER = {
  live: 30_000,
  planning: 60_000,
} as const;
const GEMINI_TIMEOUT_BY_TIER = {
  live: 100_000,
  planning: 130_000,
} as const;
const GEMINI_TIMEOUT_BY_PROMPT_CLASS: Partial<Record<RouteConfig["prompt_class"], number>> = {
  generate_ea_briefing: 130_000,
} as const;

function readEvalTimeoutOverride(req: Request): number | null {
  const raw = req.headers["x-prairie-eval-timeout-ms"];
  if (typeof raw !== "string" || !raw.trim()) {
    return null;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

// `?fast=true` opts out of thinking mode for this request, even when the route
// default has thinking_enabled=true. Useful for re-runs, demos, and any case
// where the operator wants the synthesis without the extra latency. Per the
// gemma-routing skill spec, thinking is opt-in, not default — so this query
// param is the per-call escape hatch from the tier-locked default.
function readFastModeOverride(req: Request): boolean {
  const raw = req.query?.fast;
  if (typeof raw !== "string") return false;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

function withTimeout(signal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort(new Error(`Timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  if (signal) {
    signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  }

  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(timeout);
    },
  };
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 503;
}

function isRetryableErrorBody(text: string): boolean {
  const normalized = text.toLowerCase();
  return [
    "nameresolutionerror",
    "failed to resolve",
    "temporary failure in name resolution",
    "httpsconnectionpool",
    "connection aborted",
    "connection reset",
    "read timed out",
    "temporarily unavailable",
  ].some((token) => normalized.includes(token));
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || /timed out/i.test(error.message));
}

function isTransportError(error: unknown): boolean {
  return error instanceof Error && /fetch|network|socket|econnrefused|econnreset|terminated/i.test(error.message.toLowerCase());
}

function looksResponseRepaired(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    return true;
  }
  if ((trimmed.startsWith("{") || trimmed.startsWith("[")) && (trimmed.endsWith("}") || trimmed.endsWith("]"))) {
    return false;
  }
  return /```|^\s*[A-Za-z]/.test(trimmed);
}

function resolveTimeoutForRoute(route: RouteConfig): number {
  const provider = (process.env.PRAIRIE_INFERENCE_PROVIDER ?? "mock").trim().toLowerCase();
  if (provider === "gemini") {
    return GEMINI_TIMEOUT_BY_PROMPT_CLASS[route.prompt_class] ?? GEMINI_TIMEOUT_BY_TIER[route.model_tier];
  }
  return DEFAULT_TIMEOUT_BY_TIER[route.model_tier];
}

function getRequestClassroomId(req: Request): string | undefined {
  const candidate =
    req.body?.classroom_id ??
    req.params?.classroomId ??
    req.params?.classroom_id;
  return typeof candidate === "string" && candidate ? candidate : undefined;
}

function sumNullable(values: Array<number | null>): number | null {
  const present = values.filter((value): value is number => value !== null);
  return present.length > 0 ? present.reduce((total, value) => total + value, 0) : null;
}

function appendToolResultsToPrompt(basePrompt: string, records: ToolCallRecord[]): string {
  const toolResults = records.map((record) => ({
    tool_name: record.tool_name,
    arguments: record.arguments,
    executed: record.executed,
    result: record.result,
  }));

  return [
    basePrompt,
    "",
    "TOOL RESULTS:",
    JSON.stringify(toolResults, null, 2),
    "",
    "Use these local tool results as grounded context. Produce the final response in the original JSON schema only. Do not include a tool_calls block in the final answer.",
  ].join("\n");
}

function requestBodyForGeneration(options: {
  route: RouteConfig;
  prompt: string;
  images?: string[];
  thinkingEnabled: boolean;
  maxTokens: number;
  mockContext: Record<string, unknown>;
  tools?: ToolDefinition[];
  toolInteractions?: ToolCallRecord[];
}): string {
  const body: Record<string, unknown> = {
    prompt: options.prompt,
    images: options.images,
    model_tier: options.route.model_tier,
    thinking: options.thinkingEnabled,
    prompt_class: options.route.prompt_class,
    max_tokens: options.maxTokens,
    mock_context: options.mockContext,
  };
  if (options.tools && options.tools.length > 0) {
    body.tools = options.tools;
  }
  if (options.toolInteractions && options.toolInteractions.length > 0) {
    body.tool_interactions = options.toolInteractions;
  }
  return JSON.stringify(body);
}

interface GenerationCallResult {
  parsed: GenerateResponse;
  retryCount: number;
  promptTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
}

async function performGenerationCall(options: {
  deps: RouteDeps;
  route: RouteConfig;
  prompt: string;
  images?: string[];
  thinkingEnabled: boolean;
  maxTokens: number;
  mockContext: Record<string, unknown>;
  timeoutMs: number;
  tools?: ToolDefinition[];
  toolInteractions?: ToolCallRecord[];
}): Promise<GenerationCallResult> {
  if (isBudgetExceeded()) {
    throw new RouteError(429, {
      error: `Daily Gemma spend cap reached: $${getTodaySpendUsd().toFixed(4)} of $${getBudgetUsd().toFixed(2)}. Raise PRAIRIE_DAILY_BUDGET_USD or wait until UTC midnight.`,
      category: "cost_budget",
      retryable: false,
      detail_code: "daily_budget_exceeded",
    });
  }

  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    const timeout = withTimeout(undefined, options.timeoutMs);
    try {
      const response = await fetch(`${options.deps.inferenceUrl}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBodyForGeneration({
          route: options.route,
          prompt: options.prompt,
          images: options.images,
          thinkingEnabled: options.thinkingEnabled,
          maxTokens: options.maxTokens,
          mockContext: options.mockContext,
          tools: options.tools,
          toolInteractions: options.toolInteractions,
        }),
        signal: timeout.signal,
      });

      const rawBody = await response.text();
      if (!response.ok) {
        const retryable = isRetryableStatus(response.status)
          || (response.status === 502 && isRetryableErrorBody(rawBody));
        if (retryable && attempt < MAX_RETRIES) {
          attempt += 1;
          continue;
        }

        throw new RouteError(502, {
          error: `Inference service error: ${rawBody}`,
          category: "inference",
          retryable,
          detail_code: retryable ? "inference_service_retryable" : "inference_service_error",
        });
      }

      let parsed: GenerateResponse;
      try {
        parsed = JSON.parse(rawBody) as GenerateResponse;
      } catch (error) {
        throw new RouteError(502, {
          error: "Inference service returned invalid JSON",
          category: "inference",
          retryable: false,
          detail_code: "inference_response_invalid",
        }, {
          raw_output: rawBody,
          parse_error: error instanceof Error ? error.message : String(error),
        });
      }

      if (typeof parsed.text !== "string") {
        throw new RouteError(502, {
          error: "Inference service response missing text",
          category: "inference",
          retryable: false,
          detail_code: "inference_response_missing_text",
        }, {
          raw_output: rawBody,
        });
      }

      const promptTokens = typeof parsed.prompt_tokens === "number" ? parsed.prompt_tokens : null;
      const outputTokens = typeof parsed.output_tokens === "number" ? parsed.output_tokens : null;
      const totalTokens =
        typeof parsed.total_tokens === "number"
          ? parsed.total_tokens
          : promptTokens !== null && outputTokens !== null
            ? promptTokens + outputTokens
            : null;

      recordCallSpend(parsed.model_id ?? null, promptTokens, outputTokens);

      return { parsed, retryCount: attempt, promptTokens, outputTokens, totalTokens };
    } catch (error) {
      if (error instanceof RouteError) {
        throw error;
      }

      const retryable = isAbortError(error) || isTransportError(error);
      if (retryable && attempt < MAX_RETRIES) {
        attempt += 1;
        continue;
      }

      throw new RouteError(502, {
        error: isAbortError(error)
          ? "Inference service timed out"
          : "Inference service unavailable",
        category: "inference",
        retryable,
        detail_code: isAbortError(error) ? "inference_timeout" : "inference_transport_error",
      });
    } finally {
      timeout.dispose();
    }
  }

  throw new RouteError(502, {
    error: "Inference service unavailable",
    category: "inference",
    retryable: true,
    detail_code: "inference_transport_error",
  });
}

export async function callInference(options: InferenceOptions): Promise<InferenceResult> {
  const timeoutMs = readEvalTimeoutOverride(options.req) ?? resolveTimeoutForRoute(options.route);
  const fastMode = readFastModeOverride(options.req);
  const thinkingEnabled = options.route.thinking_enabled && !fastMode;
  const basePrompt = `${options.prompt.system}\n\n${options.prompt.user}`;
  const safetyAnalysis = detectPromptInjectionInUnknown(options.safetyScanSource ?? options.req.body);
  const evalBehavior = options.req.headers["x-prairie-eval-behavior"];
  const mockContext = {
    ...(options.mockContext ?? {}),
    ...(typeof evalBehavior === "string" && evalBehavior ? { __test_behavior: evalBehavior } : {}),
  };
  const classroomId = getRequestClassroomId(options.req);
  const toolContext = {
    promptClass: options.route.prompt_class,
    classroomId: classroomId ? unsafeCastClassroomId(classroomId) : undefined,
  };
  const registeredTools: RegisteredTool[] = options.route.tool_call_capable
    ? getToolsForPromptClass(options.route.prompt_class, toolContext)
    : [];
  const definitions = toolDefinitions(registeredTools);

  setRequestContext(options.res, {
    prompt_class: options.route.prompt_class,
    model_tier: options.route.model_tier,
    timeout_ms: timeoutMs,
    promptSafety: safetyAnalysis,
  });

  let totalRetryCount = 0;
  let totalLatencyMs = 0;
  const promptTokenCounts: Array<number | null> = [];
  const outputTokenCounts: Array<number | null> = [];
  const totalTokenCounts: Array<number | null> = [];
  const executedToolCalls: ToolCallRecord[] = [];

  for (let toolTurn = 0; toolTurn <= MAX_TOOL_TURNS; toolTurn += 1) {
    const generation = await performGenerationCall({
      deps: options.deps,
      route: options.route,
      prompt: basePrompt,
      images: options.images,
      thinkingEnabled,
      maxTokens: options.maxTokens,
      mockContext,
      timeoutMs,
      tools: definitions,
      toolInteractions: toolTurn > 0 ? executedToolCalls : undefined,
    });

    const { parsed } = generation;
    totalRetryCount += generation.retryCount;
    totalLatencyMs += typeof parsed.latency_ms === "number" ? parsed.latency_ms : 0;
    promptTokenCounts.push(generation.promptTokens);
    outputTokenCounts.push(generation.outputTokens);
    totalTokenCounts.push(generation.totalTokens);

    const rawToolCalls = Array.isArray(parsed.tool_calls) ? parsed.tool_calls : [];
    if (rawToolCalls.length > 0) {
      if (registeredTools.length === 0 || toolTurn >= MAX_TOOL_TURNS) {
        throw new RouteError(502, {
          error: "Inference service returned unresolved tool calls",
          category: "inference",
          retryable: false,
          detail_code: "tool_call_unresolved",
        }, {
          tool_calls: rawToolCalls,
        });
      }

      const records = await executeToolCalls(rawToolCalls, registeredTools, toolContext);
      executedToolCalls.push(...records);
      continue;
    }

    const promptTokens = sumNullable(promptTokenCounts);
    const outputTokens = sumNullable(outputTokenCounts);
    const totalTokens = sumNullable(totalTokenCounts)
      ?? (promptTokens !== null && outputTokens !== null ? promptTokens + outputTokens : null);

    setRequestContext(options.res, {
      retry_count: totalRetryCount,
      latency_ms: totalLatencyMs || (typeof parsed.latency_ms === "number" ? parsed.latency_ms : undefined),
      response_repaired: looksResponseRepaired(parsed.text),
      prompt_tokens: promptTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      model_id: parsed.model_id ?? undefined,
      debug_prompt_body: executedToolCalls.length > 0
        ? appendToolResultsToPrompt(basePrompt, executedToolCalls)
        : basePrompt,
      debug_response_body: parsed.text,
    });

    return {
      text: parsed.text,
      thinking_text: parsed.thinking_text ?? null,
      model_id: parsed.model_id ?? "unknown",
      latency_ms: totalLatencyMs || parsed.latency_ms || 0,
      tool_calls: executedToolCalls,
      prompt_tokens: promptTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
    };
  }

  throw new RouteError(502, {
    error: "Inference service returned unresolved tool calls",
    category: "inference",
    retryable: false,
    detail_code: "tool_call_unresolved",
  });
}
