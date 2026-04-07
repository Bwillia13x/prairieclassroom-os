import type { Request, Response, NextFunction } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Attach request ID for downstream use
  (req as Record<string, unknown>).requestId = requestId;

  res.on("finish", () => {
    const duration = Date.now() - start;
    const log = {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    };
    // Structured JSON log
    if (res.statusCode >= 400) {
      console.error(JSON.stringify(log));
    } else {
      console.log(JSON.stringify(log));
    }
  });

  next();
}
