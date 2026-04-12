/**
 * Shared dependency interface for all route modules.
 *
 * Route modules receive this via their factory function so they can
 * access inference, classroom data, and the data directory without
 * importing server-level singletons.
 */
import type { ClassroomProfile } from "../../packages/shared/schemas/classroom.js";
import type { Request, Response, NextFunction } from "express";

export interface RouteDeps {
  inferenceUrl: string;
  dataDir: string;
  loadClassroom: (id: string) => ClassroomProfile | undefined;
  loadClassrooms: () => ClassroomProfile[];
  authMiddleware: (req: Request, res: Response, next: NextFunction) => void;
}
