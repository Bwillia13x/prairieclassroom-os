import type { Response } from "express";
import { setRequestContext, type ErrorCategory } from "./request-context.js";

export interface RouteErrorPayload {
  error: string;
  category: ErrorCategory;
  retryable: boolean;
  detail_code?: string;
}

export class RouteError extends Error {
  readonly statusCode: number;
  readonly category: ErrorCategory;
  readonly retryable: boolean;
  readonly detailCode?: string;
  readonly extra?: Record<string, unknown>;

  constructor(
    statusCode: number,
    payload: RouteErrorPayload,
    extra?: Record<string, unknown>,
  ) {
    super(payload.error);
    this.name = "RouteError";
    this.statusCode = statusCode;
    this.category = payload.category;
    this.retryable = payload.retryable;
    this.detailCode = payload.detail_code;
    this.extra = extra;
  }
}

export function sendRouteError(
  res: Response,
  statusCode: number,
  payload: RouteErrorPayload,
  extra?: Record<string, unknown>,
) {
  setRequestContext(res, {
    category: payload.category,
    retryable: payload.retryable,
    detail_code: payload.detail_code,
  });
  return res.status(statusCode).json({
    ...payload,
    ...(extra ?? {}),
  });
}

export function sendParseError(
  res: Response,
  error: string,
  rawOutput: string,
  parseError: unknown,
) {
  return sendRouteError(
    res,
    422,
    {
      error,
      category: "inference",
      retryable: false,
      detail_code: "model_output_parse_failed",
    },
    {
      raw_output: rawOutput,
      parse_error: parseError instanceof Error ? parseError.message : String(parseError),
    },
  );
}

export function sendClassroomNotFound(res: Response, classroomId: string) {
  return sendRouteError(res, 404, {
    error: `Classroom '${classroomId}' not found`,
    category: "validation",
    retryable: false,
    detail_code: "classroom_not_found",
  });
}

export function handleRouteError(
  res: Response,
  err: unknown,
  fallbackMessage = "Internal server error",
) {
  if (err instanceof RouteError) {
    return sendRouteError(
      res,
      err.statusCode,
      {
        error: err.message,
        category: err.category,
        retryable: err.retryable,
        detail_code: err.detailCode,
      },
      err.extra,
    );
  }

  const message = err instanceof Error ? err.message : fallbackMessage;
  return sendRouteError(res, 500, {
    error: message || fallbackMessage,
    category: "inference",
    retryable: false,
    detail_code: "internal_error",
  });
}
