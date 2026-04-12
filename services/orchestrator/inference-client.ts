import type { Request, Response } from "express";
import type { RouteDeps } from "./route-deps.js";
import type { RouteConfig } from "./types.js";
import { RouteError } from "./errors.js";
import { setRequestContext } from "./request-context.js";
import { detectPromptInjectionInUnknown } from "./prompt-safety.js";

interface GenerateResponse {
  text: string;
  thinking_text?: string | null;
  model_id?: string;
  latency_ms?: number;
  tool_calls?: unknown[];
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
  tool_calls: unknown[];
}

const MAX_RETRIES = 2;
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

export async function callInference(options: InferenceOptions): Promise<InferenceResult> {
  const timeoutMs = readEvalTimeoutOverride(options.req) ?? resolveTimeoutForRoute(options.route);
  const prompt = `${options.prompt.system}\n\n${options.prompt.user}`;
  const safetyAnalysis = detectPromptInjectionInUnknown(options.safetyScanSource ?? options.req.body);
  const evalBehavior = options.req.headers["x-prairie-eval-behavior"];
  const mockContext = {
    ...(options.mockContext ?? {}),
    ...(typeof evalBehavior === "string" && evalBehavior ? { __test_behavior: evalBehavior } : {}),
  };

  setRequestContext(options.res, {
    prompt_class: options.route.prompt_class,
    model_tier: options.route.model_tier,
    timeout_ms: timeoutMs,
    promptSafety: safetyAnalysis,
  });

  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    const timeout = withTimeout(undefined, timeoutMs);
    try {
      const response = await fetch(`${options.deps.inferenceUrl}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          images: options.images,
          model_tier: options.route.model_tier,
          thinking: options.route.thinking_enabled,
          prompt_class: options.route.prompt_class,
          max_tokens: options.maxTokens,
          mock_context: mockContext,
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

      setRequestContext(options.res, {
        retry_count: attempt,
        latency_ms: typeof parsed.latency_ms === "number" ? parsed.latency_ms : undefined,
        response_repaired: looksResponseRepaired(parsed.text),
        debug_prompt_body: prompt,
        debug_response_body: parsed.text,
      });

      return {
        text: parsed.text,
        thinking_text: parsed.thinking_text ?? null,
        model_id: parsed.model_id ?? "unknown",
        latency_ms: parsed.latency_ms ?? 0,
        tool_calls: Array.isArray(parsed.tool_calls) ? parsed.tool_calls : [],
      };
    } catch (error) {
      timeout.dispose();

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
