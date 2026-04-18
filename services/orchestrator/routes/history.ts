import { Router } from "express";
import { getRecentPlans, getRecentMessages, getRecentInterventions, getRecentPatternReports } from "../../memory/retrieve.js";
import { handleRouteError, sendRouteError } from "../errors.js";
import { isValidClassroomId } from "../validate.js";
import { requireRoles, type RouteDeps } from "../route-deps.js";
import type { ClassroomId } from "../../../packages/shared/schemas/branded.js";
import { buildRosterScope, filterRosterScoped } from "../../memory/roster-scope.js";

function parseStudentRef(query: unknown): string | undefined {
  if (typeof query !== "string") return undefined;
  if (query.length > 100) return undefined;
  return query;
}

export function createHistoryRouter(deps: RouteDeps): Router {
  const router = Router();
  const authMiddleware = deps.authMiddleware;
  // History surfaces are the reviewer's primary entry point (plan,
  // message, intervention, and pattern history scoped to this classroom).
  // Teacher retains full access; EA, substitute are intentionally excluded
  // from raw history because their workflows consume the operational views
  // (today, ea-briefing, debt-register), not the full archive.
  const teacherOrReviewer = requireRoles(deps, ["teacher", "reviewer"]);

  router.get("/:id/plans", authMiddleware, teacherOrReviewer, (req, res) => {
    try {
      const rawId = req.params.id as string;
      if (!isValidClassroomId(rawId)) {
        sendRouteError(res, 400, { error: "Invalid classroom ID format", category: "validation", retryable: false, detail_code: "invalid_classroom_id" });
        return;
      }
      const classroomId = rawId as ClassroomId;
      const classroom = deps.loadClassroom(classroomId);
      if (!classroom) {
        sendRouteError(res, 404, { error: "Classroom not found", category: "validation", retryable: false, detail_code: "classroom_not_found" });
        return;
      }
      const rosterScope = buildRosterScope(classroom, deps.loadClassrooms());
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const plans = filterRosterScoped(getRecentPlans(classroomId, limit), rosterScope);
      res.json({ plans });
    } catch (err) {
      console.error("Plans history error:", err);
      handleRouteError(res, err);
    }
  });

  router.get("/:id/messages", authMiddleware, teacherOrReviewer, (req, res) => {
    try {
      const rawId = req.params.id as string;
      if (!isValidClassroomId(rawId)) {
        sendRouteError(res, 400, { error: "Invalid classroom ID format", category: "validation", retryable: false, detail_code: "invalid_classroom_id" });
        return;
      }
      const classroomId = rawId as ClassroomId;
      const classroom = deps.loadClassroom(classroomId);
      if (!classroom) {
        sendRouteError(res, 404, { error: "Classroom not found", category: "validation", retryable: false, detail_code: "classroom_not_found" });
        return;
      }
      const rosterScope = buildRosterScope(classroom, deps.loadClassrooms());
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const studentRef = parseStudentRef(req.query.student);
      const messages = filterRosterScoped(getRecentMessages(classroomId, limit, studentRef), rosterScope);
      res.json({ messages });
    } catch (err) {
      console.error("Messages history error:", err);
      handleRouteError(res, err);
    }
  });

  router.get("/:id/interventions", authMiddleware, teacherOrReviewer, (req, res) => {
    try {
      const rawId = req.params.id as string;
      if (!isValidClassroomId(rawId)) {
        sendRouteError(res, 400, { error: "Invalid classroom ID format", category: "validation", retryable: false, detail_code: "invalid_classroom_id" });
        return;
      }
      const classroomId = rawId as ClassroomId;
      const classroom = deps.loadClassroom(classroomId);
      if (!classroom) {
        sendRouteError(res, 404, { error: "Classroom not found", category: "validation", retryable: false, detail_code: "classroom_not_found" });
        return;
      }
      const rosterScope = buildRosterScope(classroom, deps.loadClassrooms());
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const studentRef = parseStudentRef(req.query.student);
      const interventions = filterRosterScoped(getRecentInterventions(classroomId, limit, studentRef), rosterScope);
      res.json({ interventions });
    } catch (err) {
      console.error("Interventions history error:", err);
      handleRouteError(res, err);
    }
  });

  router.get("/:id/patterns", authMiddleware, teacherOrReviewer, (req, res) => {
    try {
      const rawId = req.params.id as string;
      if (!isValidClassroomId(rawId)) {
        sendRouteError(res, 400, { error: "Invalid classroom ID format", category: "validation", retryable: false, detail_code: "invalid_classroom_id" });
        return;
      }
      const classroomId = rawId as ClassroomId;
      const classroom = deps.loadClassroom(classroomId);
      if (!classroom) {
        sendRouteError(res, 404, { error: "Classroom not found", category: "validation", retryable: false, detail_code: "classroom_not_found" });
        return;
      }
      const rosterScope = buildRosterScope(classroom, deps.loadClassrooms());
      const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);
      const patterns = filterRosterScoped(getRecentPatternReports(classroomId, limit), rosterScope);
      res.json({ patterns });
    } catch (err) {
      console.error("Patterns history error:", err);
      handleRouteError(res, err);
    }
  });

  return router;
}
