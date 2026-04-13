import { Router } from "express";
import { validateBody } from "../validate.js";
import { SessionRequestSchema } from "../../../packages/shared/schemas/session.js";
import { isValidClassroomId } from "../validate.js";
import { saveSession, getSessionSummary } from "../../memory/store.js";
import { handleRouteError, sendRouteError, sendClassroomNotFound } from "../errors.js";
import { requireRoles, type RouteDeps } from "../route-deps.js";
import type { ClassroomId } from "../../../packages/shared/schemas/branded.js";

export function createSessionsRouter(deps: RouteDeps): Router {
  const router = Router();
  const authMiddleware = deps.authMiddleware;
  const teacherOrEa = requireRoles(deps, ["teacher", "ea"]);

  // POST / — record a session summary (flushed on visibilitychange or classroom switch)
  router.post("/", authMiddleware, teacherOrEa, validateBody(SessionRequestSchema), (req, res) => {
    try {
      const body = req.body;
      const rawId = body.classroom_id as string;

      if (!isValidClassroomId(rawId)) {
        sendRouteError(res, 400, {
          error: "Invalid classroom ID format",
          category: "validation",
          retryable: false,
          detail_code: "invalid_classroom_id",
        });
        return;
      }

      const classroom = deps.loadClassroom(rawId);
      if (!classroom) {
        sendClassroomNotFound(res, rawId);
        return;
      }

      const classroomId = rawId as ClassroomId;
      // Use session_id from the body (client-generated) as the record id
      const id = body.session_id as string;

      saveSession(classroomId, { ...body, id });

      res.json({ id });
    } catch (err) {
      console.error("Session save error:", err);
      handleRouteError(res, err);
    }
  });

  // GET /summary/:classroomId — aggregated session usage summary
  router.get("/summary/:classroomId", authMiddleware, teacherOrEa, (req, res) => {
    try {
      const rawId = req.params.classroomId as string;

      if (!isValidClassroomId(rawId)) {
        sendRouteError(res, 400, {
          error: "Invalid classroom ID format",
          category: "validation",
          retryable: false,
          detail_code: "invalid_classroom_id",
        });
        return;
      }

      const classroom = deps.loadClassroom(rawId);
      if (!classroom) {
        sendClassroomNotFound(res, rawId);
        return;
      }

      const classroomId = rawId as ClassroomId;
      const summary = getSessionSummary(classroomId);
      res.json(summary);
    } catch (err) {
      console.error("Session summary error:", err);
      handleRouteError(res, err);
    }
  });

  return router;
}
