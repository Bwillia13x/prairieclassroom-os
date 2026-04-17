import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import type { ModelTier, PromptClass } from "./types.js";

// import.meta.dirname is undefined under tsx's CJS register hook; derive from URL as a fallback
const _dirname = import.meta.dirname ?? fileURLToPath(new URL(".", import.meta.url));

export type ErrorCategory = "inference" | "validation" | "memory" | "auth" | "cost_budget";

// Structural snapshot of auth.ts ClassroomAuthContext. Inlined to avoid a
// circular import through errors.ts; keep in sync with auth.ts.
interface ClassroomAuthSnapshot {
  classroomId: string;
  role: string;
  demoBypass: boolean;
}

// Stable vocabulary for the access-audit log's auth_outcome field. The values
// are intentionally matched to auth.ts detail_codes for denials so the two
// surfaces stay greppable together.
export type AuthOutcome =
  | "allowed"
  | "demo_bypass"
  | "classroom_code_missing"
  | "classroom_code_invalid"
  | "classroom_role_invalid"
  | "classroom_role_forbidden"
  | "none";

interface PromptSafetyState {
  injectionSuspected?: boolean;
  matchedRules?: string[];
}

interface RequestContextState {
  requestId: string;
  startedAt: number;
  prompt_class?: PromptClass;
  model_tier?: ModelTier;
  model_id?: string;
  timeout_ms?: number;
  retry_count?: number;
  latency_ms?: number;
  prompt_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
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
  return resolve(_dirname, "../..", "output", "request-logs");
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

function getClassroomAuth(res: Response): ClassroomAuthSnapshot | undefined {
  const locals = res.locals as Record<string, unknown>;
  const raw = locals.classroomAuth;
  if (!raw || typeof raw !== "object") return undefined;
  const auth = raw as Record<string, unknown>;
  if (
    typeof auth.classroomId === "string" &&
    typeof auth.role === "string" &&
    typeof auth.demoBypass === "boolean"
  ) {
    return {
      classroomId: auth.classroomId,
      role: auth.role,
      demoBypass: auth.demoBypass,
    };
  }
  return undefined;
}

function deriveAuthOutcome(
  req: Request,
  res: Response,
  context: RequestContextState,
  auth: ClassroomAuthSnapshot | undefined,
): AuthOutcome {
  // Auth denials set category="auth" + a stable detail_code; surface those
  // verbatim so the audit log uses the same vocabulary as the error payload.
  if (context.category === "auth" && res.statusCode >= 400) {
    const code = context.detail_code;
    if (
      code === "classroom_code_missing" ||
      code === "classroom_code_invalid" ||
      code === "classroom_role_invalid" ||
      code === "classroom_role_forbidden"
    ) {
      return code;
    }
  }
  if (auth?.demoBypass) return "demo_bypass";
  if (auth) return "allowed";
  // Routes without any classroom context (/health, /api/classrooms) report
  // "none" rather than null so audit filters can explicitly include or
  // exclude unauthenticated traffic.
  if (getClassroomId(req) === null) return "none";
  return "none";
}

/**
 * Pure builder for the request-log JSONL record. Separated from the I/O path
 * so tests can assert record shape without touching the filesystem.
 *
 * The record doubles as an access audit log: `classroom_id`, `classroom_role`,
 * `demo_bypass`, and `auth_outcome` together answer "who accessed which
 * classroom record, when, under which role, and was it allowed?" — the
 * governance question behind pilot readiness item G-14.
 */
export function buildRequestLogRecord(
  req: Request,
  res: Response,
): Record<string, unknown> {
  const context = getContext(res);
  const promptSafety = getPromptSafety(req, res);
  const debugEnabled = isPromptDebugEnabled();
  const auth = getClassroomAuth(res);

  const record: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    request_id: context.requestId,
    route: deriveRoute(req),
    classroom_id: getClassroomId(req),
    classroom_role: auth?.role ?? null,
    demo_bypass: auth?.demoBypass ?? null,
    auth_outcome: deriveAuthOutcome(req, res, context, auth),
    prompt_class: context.prompt_class ?? null,
    model_tier: context.model_tier ?? null,
    model_id: context.model_id ?? null,
    inference_provider: process.env.PRAIRIE_INFERENCE_PROVIDER ?? "mock",
    timeout_ms: context.timeout_ms ?? null,
    retry_count: context.retry_count ?? 0,
    latency_ms: context.latency_ms ?? null,
    prompt_tokens: context.prompt_tokens ?? null,
    output_tokens: context.output_tokens ?? null,
    total_tokens: context.total_tokens ?? null,
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

  return record;
}

export function writeRequestLog(req: Request, res: Response): void {
  const record = buildRequestLogRecord(req, res);

  mkdirSync(REQUEST_LOG_DIR, { recursive: true });
  const filePath = resolve(REQUEST_LOG_DIR, `${new Date().toISOString().slice(0, 10)}.jsonl`);
  appendFileSync(filePath, `${JSON.stringify(record)}\n`, "utf8");

  const sink = res.statusCode >= 400 ? console.error : console.log;
  sink(JSON.stringify(record));
}
