/**
 * Shared configuration and HTTP helpers for eval runners.
 */

import type { EvalCase } from "./runner-types";

export const API_BASE = process.env.API_BASE ?? "http://localhost:3100";

export const CLASSROOM_CODES: Record<string, string> = {
  "alpha-grade4": "prairie-alpha-2026",
  "bravo-grade2": "prairie-bravo-2026",
};

export function authHeaders(classroomId?: string): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (classroomId && CLASSROOM_CODES[classroomId]) {
    headers["X-Classroom-Code"] = CLASSROOM_CODES[classroomId];
  }
  return headers;
}

export function evalHeaders(evalCase: EvalCase, classroomId?: string): Record<string, string> {
  const headers = authHeaders(classroomId);
  const input = evalCase.input as Record<string, unknown>;
  const behavior = input.eval_behavior;
  const timeoutMs = input.eval_timeout_ms;

  if (typeof behavior === "string" && behavior.trim()) {
    headers["X-Prairie-Eval-Behavior"] = behavior.trim();
  }
  if (typeof timeoutMs === "number" && Number.isFinite(timeoutMs) && timeoutMs > 0) {
    headers["X-Prairie-Eval-Timeout-Ms"] = String(timeoutMs);
  }

  return headers;
}
