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
export const CLASSROOM_ROLES = ["teacher", "ea", "substitute", "reviewer"] as const;
export type ClassroomRole = typeof CLASSROOM_ROLES[number];

export interface ClassroomAuthContext {
  classroomId: string;
  role: ClassroomRole;
  demoBypass: boolean;
}

function parseClassroomRole(req: Request, res: Response): ClassroomRole | null {
  const rawHeader = req.headers["x-classroom-role"];
  const rawRole = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  if (!rawRole) return "teacher";
  const normalized = rawRole.trim().toLowerCase();
  if ((CLASSROOM_ROLES as readonly string[]).includes(normalized)) {
    return normalized as ClassroomRole;
  }
  sendRouteError(res, 400, {
    error: `Invalid classroom role. Supported roles: ${CLASSROOM_ROLES.join(", ")}.`,
    category: "auth",
    retryable: false,
    detail_code: "classroom_role_invalid",
  });
  return null;
}

function setClassroomAuthContext(
  res: Response,
  context: ClassroomAuthContext,
): void {
  res.locals.classroomAuth = context;
}

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

    const role = parseClassroomRole(req, res);
    if (!role) return;

    // Demo classroom bypasses auth
    if (classroomId === DEMO_CLASSROOM_ID) {
      setClassroomAuthContext(res, { classroomId, role, demoBypass: true });
      next();
      return;
    }

    const classroom = loadClassroom(classroomId);
    if (!classroom) {
      // Let the route handler return 404
      next();
      return;
    }

    // TODO: Classroom locks temporarily disabled for development access.
    // Re-enable the access_code check before any pilot or production use.
    setClassroomAuthContext(res, { classroomId, role, demoBypass: false });
    next();
  };
}

export function requireClassroomRole(allowedRoles: readonly ClassroomRole[]) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const context = res.locals.classroomAuth as ClassroomAuthContext | undefined;
    const role = context?.role ?? "teacher";
    if (allowedRoles.includes(role)) {
      next();
      return;
    }

    sendRouteError(res, 403, {
      error: `Classroom role '${role}' cannot access this endpoint.`,
      category: "auth",
      retryable: false,
      detail_code: "classroom_role_forbidden",
    }, {
      details: {
        role,
        allowed_roles: [...allowedRoles],
      },
    });
  };
}
