import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import type { ModelTier, PromptClass } from "./types.js";

export type ErrorCategory = "inference" | "validation" | "memory" | "auth";

interface PromptSafetyState {
  injectionSuspected?: boolean;
  matchedRules?: string[];
}

interface RequestContextState {
  requestId: string;
  startedAt: number;
  prompt_class?: PromptClass;
  model_tier?: ModelTier;
  timeout_ms?: number;
  retry_count?: number;
  latency_ms?: number;
  category?: ErrorCategory;
  retryable?: boolean;
  detail_code?: string;
  response_repaired?: boolean;
  promptSafety?: PromptSafetyState;
  debug_prompt_body?: string;
  debug_response_body?: string;
}

const CONTEXT_KEY = "__prairie_request_context";

export function getRequestLogDir(): string {
  return resolve(import.meta.dirname, "../..", "output", "request-logs");
}

const REQUEST_LOG_DIR = getRequestLogDir();

function isPromptDebugEnabled(): boolean {
  const raw = (process.env.PRAIRIE_DEBUG_PROMPTS ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(raw);
}

function getContext(res: Response): RequestContextState {
  const locals = res.locals as Record<string, unknown>;
  if (!locals[CONTEXT_KEY]) {
    locals[CONTEXT_KEY] = {
      requestId: `req-${randomUUID()}`,
      startedAt: Date.now(),
    } satisfies RequestContextState;
  }
  return locals[CONTEXT_KEY] as RequestContextState;
}

export function initializeRequestContext(_req: Request, res: Response): RequestContextState {
  const context = getContext(res);
  res.setHeader("X-Request-Id", context.requestId);
  return context;
}

export function getRequestId(res: Response): string {
  return getContext(res).requestId;
}

export function setRequestContext(
  res: Response,
  patch: Partial<Omit<RequestContextState, "requestId" | "startedAt">>,
): void {
  Object.assign(getContext(res), patch);
}

export function getRequestContext(res: Response): RequestContextState {
  return { ...getContext(res) };
}

function getPromptSafety(req: Request, res: Response): PromptSafetyState {
  const locals = res.locals as Record<string, unknown>;
  const promptSafety = locals.promptSafety as PromptSafetyState | undefined;
  return promptSafety ?? getContext(res).promptSafety ?? {};
}

function deriveRoute(req: Request): string {
  const routePath =
    typeof req.route?.path === "string"
      ? req.route.path
      : req.route?.path
        ? String(req.route.path)
        : req.path;
  const base = req.baseUrl || "";
  return `${req.method} ${base}${routePath}`;
}

function inferDefaultCategory(statusCode: number): ErrorCategory | undefined {
  if (statusCode === 401 || statusCode === 403) {
    return "auth";
  }
  if (statusCode >= 400 && statusCode < 500) {
    return "validation";
  }
  if (statusCode >= 500) {
    return "inference";
  }
  return undefined;
}

function getClassroomId(req: Request): string | null {
  const candidate =
    req.body?.classroom_id ??
    req.params?.classroomId ??
    req.params?.classroom_id ??
    null;
  return typeof candidate === "string" ? candidate : null;
}

export function writeRequestLog(req: Request, res: Response): void {
  const context = getContext(res);
  const promptSafety = getPromptSafety(req, res);
  const debugEnabled = isPromptDebugEnabled();

  const record: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    request_id: context.requestId,
    route: deriveRoute(req),
    classroom_id: getClassroomId(req),
    prompt_class: context.prompt_class ?? null,
    model_tier: context.model_tier ?? null,
    inference_provider: process.env.PRAIRIE_INFERENCE_PROVIDER ?? "mock",
    timeout_ms: context.timeout_ms ?? null,
    retry_count: context.retry_count ?? 0,
    latency_ms: context.latency_ms ?? null,
    status_code: res.statusCode,
    category: context.category ?? inferDefaultCategory(res.statusCode) ?? null,
    retryable: context.retryable ?? false,
    detail_code: context.detail_code ?? null,
    response_repaired: context.response_repaired ?? false,
    injection_suspected: promptSafety.injectionSuspected ?? false,
    injection_rules: promptSafety.matchedRules ?? [],
    request_duration_ms: Date.now() - context.startedAt,
  };

  if (debugEnabled) {
    record.debug_prompt_body = context.debug_prompt_body ?? null;
    record.debug_response_body = context.debug_response_body ?? null;
  }

  mkdirSync(REQUEST_LOG_DIR, { recursive: true });
  const filePath = resolve(REQUEST_LOG_DIR, `${new Date().toISOString().slice(0, 10)}.jsonl`);
  appendFileSync(filePath, `${JSON.stringify(record)}\n`, "utf8");

  const sink = res.statusCode >= 400 ? console.error : console.log;
  sink(JSON.stringify(record));
}
