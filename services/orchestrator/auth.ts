/**
 * Classroom-code authentication middleware.
 *
 * Simple shared-secret model: each classroom profile has an optional access_code.
 * API requests that include a classroom_id must provide the matching code
 * in the X-Classroom-Code header. Demo classroom bypasses auth.
 */
import type { Request, Response, NextFunction } from "express";
import type { ClassroomProfile } from "../../packages/shared/schemas/classroom.js";
import { sendRouteError } from "./errors.js";

const DEMO_CLASSROOM_ID = "demo-okafor-grade34";

/**
 * Create auth middleware that validates classroom codes.
 * Pass a function that resolves classroom_id → ClassroomProfile.
 */
export function createAuthMiddleware(
  loadClassroom: (id: string) => ClassroomProfile | undefined,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip auth for non-classroom routes
    const classroomId =
      req.body?.classroom_id ?? req.params?.classroomId ?? req.params?.id;

    if (!classroomId) {
      next();
      return;
    }

    // Demo classroom bypasses auth
    if (classroomId === DEMO_CLASSROOM_ID) {
      next();
      return;
    }

    const classroom = loadClassroom(classroomId);
    if (!classroom) {
      // Let the route handler return 404
      next();
      return;
    }

    // If classroom has no access_code set, auth is not required
    if (!classroom.access_code) {
      next();
      return;
    }

    const providedCode = req.headers["x-classroom-code"] as string | undefined;
    if (!providedCode) {
      sendRouteError(res, 401, {
        error: "Authentication required. Provide X-Classroom-Code header.",
        category: "auth",
        retryable: false,
        detail_code: "classroom_code_missing",
      });
      return;
    }

    if (providedCode !== classroom.access_code) {
      sendRouteError(res, 403, {
        error: "Invalid classroom code.",
        category: "auth",
        retryable: false,
        detail_code: "classroom_code_invalid",
      });
      return;
    }

    next();
  };
}
