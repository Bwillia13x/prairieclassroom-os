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

// Legacy identifier retained for backward compatibility: classrooms that
// pre-date the schema's `is_demo` field rely on this string to opt into
// auth bypass and the "Demo lane" badge. New demo classrooms should set
// `is_demo: true` in the profile instead.
const LEGACY_DEMO_CLASSROOM_ID = "demo-okafor-grade34";

export function isDemoClassroom(profile: { classroom_id: string; is_demo?: boolean } | undefined | null): boolean {
  if (!profile) return false;
  return profile.is_demo === true || profile.classroom_id === LEGACY_DEMO_CLASSROOM_ID;
}
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

    const classroom = loadClassroom(classroomId);

    // Demo classroom bypasses auth. Prefer the explicit `is_demo` field on
    // the profile; fall back to the legacy ID match for classrooms that
    // pre-date the schema field. If the classroom doesn't resolve, still
    // honor the legacy ID so early-boot / fixture-missing paths still work.
    if (isDemoClassroom(classroom ?? { classroom_id: classroomId })) {
      setClassroomAuthContext(res, { classroomId, role, demoBypass: true });
      next();
      return;
    }

    if (!classroom) {
      // Let the route handler return 404
      next();
      return;
    }

    // If classroom has no access_code set, auth is not required
    if (!classroom.access_code) {
      setClassroomAuthContext(res, { classroomId, role, demoBypass: false });
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
