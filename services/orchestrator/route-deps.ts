/**
 * Shared dependency interface for all route modules.
 *
 * Route modules receive this via their factory function so they can
 * access inference, classroom data, and the data directory without
 * importing server-level singletons.
 */
import type { ClassroomProfile } from "../../packages/shared/schemas/classroom.js";
import type { Request, Response, NextFunction } from "express";
import type { ClassroomRole } from "./auth.js";

export type RouteMiddleware = (req: Request, res: Response, next: NextFunction) => void;

export interface RouteDeps {
  inferenceUrl: string;
  dataDir: string;
  loadClassroom: (id: string) => ClassroomProfile | undefined;
  loadClassrooms: () => ClassroomProfile[];
  authMiddleware: RouteMiddleware;
  requireClassroomRole?: (allowedRoles: readonly ClassroomRole[]) => RouteMiddleware;
}

const passThroughMiddleware: RouteMiddleware = (_req, _res, next) => {
  next();
};

export function requireRoles(
  deps: Pick<RouteDeps, "requireClassroomRole">,
  allowedRoles: readonly ClassroomRole[],
): RouteMiddleware {
  return deps.requireClassroomRole?.(allowedRoles) ?? passThroughMiddleware;
}
