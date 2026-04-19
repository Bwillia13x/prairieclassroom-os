import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { handleRouteError, RouteError } from "./errors.js";

interface ClassroomAuthSnapshot {
  classroomId: string;
  role: string;
  demoBypass: boolean;
}

interface PendingStreamJob {
  body: unknown;
  query: Request["query"];
  headers: Record<string, string | string[] | undefined>;
  classroomAuth?: ClassroomAuthSnapshot;
  createdAt: number;
}

const STREAM_JOB_TTL_MS = 60_000;
const jobs = new Map<string, PendingStreamJob>();

function cleanupExpiredJobs(now = Date.now()): void {
  for (const [id, job] of jobs) {
    if (now - job.createdAt > STREAM_JOB_TTL_MS) {
      jobs.delete(id);
    }
  }
}

function snapshotHeaders(req: Request): Record<string, string | string[] | undefined> {
  return {
    "x-prairie-eval-timeout-ms": req.headers["x-prairie-eval-timeout-ms"],
    "x-prairie-eval-behavior": req.headers["x-prairie-eval-behavior"],
    "x-classroom-role": req.headers["x-classroom-role"],
  };
}

function snapshotAuth(res: Response): ClassroomAuthSnapshot | undefined {
  const auth = res.locals.classroomAuth;
  if (!auth || typeof auth !== "object") return undefined;
  const raw = auth as Record<string, unknown>;
  if (
    typeof raw.classroomId === "string" &&
    typeof raw.role === "string" &&
    typeof raw.demoBypass === "boolean"
  ) {
    return {
      classroomId: raw.classroomId,
      role: raw.role,
      demoBypass: raw.demoBypass,
    };
  }
  return undefined;
}

export function createStreamJob(req: Request, res: Response): string {
  cleanupExpiredJobs();
  const streamId = randomUUID();
  jobs.set(streamId, {
    body: req.body,
    query: req.query,
    headers: snapshotHeaders(req),
    classroomAuth: snapshotAuth(res),
    createdAt: Date.now(),
  });
  return streamId;
}

export function attachStreamJob(req: Request, res: Response, streamId: string): AbortSignal {
  cleanupExpiredJobs();
  const job = jobs.get(streamId);
  jobs.delete(streamId);
  if (!job) {
    throw new RouteError(404, {
      error: "Streaming request was not found or has expired.",
      category: "validation",
      retryable: false,
      detail_code: "stream_job_not_found",
    });
  }

  Object.assign(req, {
    body: job.body,
    query: job.query,
    headers: {
      ...req.headers,
      ...job.headers,
    },
  });
  if (job.classroomAuth) {
    res.locals.classroomAuth = job.classroomAuth;
  }

  const controller = new AbortController();
  req.on("close", () => {
    controller.abort(new Error("Client closed SSE connection"));
  });
  return controller.signal;
}

export function attachStreamJobRequest(req: Request, res: Response, next: NextFunction): void {
  try {
    const rawStreamId = req.params.streamId;
    const streamId = Array.isArray(rawStreamId) ? rawStreamId[0] : rawStreamId;
    if (!streamId) {
      throw new RouteError(400, {
        error: "Streaming request id is required.",
        category: "validation",
        retryable: false,
        detail_code: "stream_job_id_missing",
      });
    }
    res.locals.streamAbortSignal = attachStreamJob(req, res, streamId);
    next();
  } catch (error) {
    handleRouteError(res, error);
  }
}

export function getStreamAbortSignal(res: Response): AbortSignal {
  const signal = res.locals.streamAbortSignal as AbortSignal | undefined;
  if (!signal) {
    throw new RouteError(500, {
      error: "Streaming request was not attached.",
      category: "validation",
      retryable: false,
      detail_code: "stream_job_not_attached",
    });
  }
  return signal;
}

export function openSse(res: Response): void {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
}

export function sendSse(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function sendSseError(res: Response, error: unknown): void {
  if (error instanceof RouteError) {
    sendSse(res, "stream_error", {
      status: error.statusCode,
      error: error.message,
      category: error.category,
      retryable: error.retryable,
      detail_code: error.detailCode,
      ...(error.extra ?? {}),
    });
    return;
  }
  sendSse(res, "stream_error", {
    status: 500,
    error: error instanceof Error ? error.message : "Streaming request failed.",
    category: "inference",
    retryable: false,
    detail_code: "internal_error",
  });
}
