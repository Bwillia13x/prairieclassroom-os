import type { Request, Response, NextFunction } from "express";
import { initializeRequestContext, writeRequestLog } from "../request-context.js";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  initializeRequestContext(req, res);

  res.on("finish", () => {
    writeRequestLog(req, res);
  });

  next();
}
