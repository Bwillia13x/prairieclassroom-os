import { Router } from "express";
import { getRecentPlans, getRecentMessages, getRecentInterventions, getRecentPatternReports } from "../../memory/retrieve.js";
import { handleRouteError, sendRouteError } from "../errors.js";
import { isValidClassroomId } from "../validate.js";
import type { RouteDeps } from "../route-deps.js";
import type { ClassroomId } from "../../../packages/shared/schemas/branded.js";

function parseStudentRef(query: unknown): string | undefined {
  if (typeof query !== "string") return undefined;
  if (query.length > 100) return undefined;
  return query;
}

export function createHistoryRouter(deps: RouteDeps): Router {
  const router = Router();
  const authMiddleware = deps.authMiddleware;

  router.get("/:id/plans", authMiddleware, (req, res) => {
    try {
      const rawId = req.params.id as string;
      if (!isValidClassroomId(rawId)) {
        sendRouteError(res, 400, { error: "Invalid classroom ID format", category: "validation", retryable: false, detail_code: "invalid_classroom_id" });
        return;
      }
      const classroomId = rawId as ClassroomId;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const plans = getRecentPlans(classroomId, limit);
      res.json({ plans });
    } catch (err) {
      console.error("Plans history error:", err);
      handleRouteError(res, err);
    }
  });

  router.get("/:id/messages", authMiddleware, (req, res) => {
    try {
      const rawId = req.params.id as string;
      if (!isValidClassroomId(rawId)) {
        sendRouteError(res, 400, { error: "Invalid classroom ID format", category: "validation", retryable: false, detail_code: "invalid_classroom_id" });
        return;
      }
      const classroomId = rawId as ClassroomId;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const studentRef = parseStudentRef(req.query.student);
      const messages = getRecentMessages(classroomId, limit, studentRef);
      res.json({ messages });
    } catch (err) {
      console.error("Messages history error:", err);
      handleRouteError(res, err);
    }
  });

  router.get("/:id/interventions", authMiddleware, (req, res) => {
    try {
      const rawId = req.params.id as string;
      if (!isValidClassroomId(rawId)) {
        sendRouteError(res, 400, { error: "Invalid classroom ID format", category: "validation", retryable: false, detail_code: "invalid_classroom_id" });
        return;
      }
      const classroomId = rawId as ClassroomId;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const studentRef = parseStudentRef(req.query.student);
      const interventions = getRecentInterventions(classroomId, limit, studentRef);
      res.json({ interventions });
    } catch (err) {
      console.error("Interventions history error:", err);
      handleRouteError(res, err);
    }
  });

  router.get("/:id/patterns", authMiddleware, (req, res) => {
    try {
      const rawId = req.params.id as string;
      if (!isValidClassroomId(rawId)) {
        sendRouteError(res, 400, { error: "Invalid classroom ID format", category: "validation", retryable: false, detail_code: "invalid_classroom_id" });
        return;
      }
      const classroomId = rawId as ClassroomId;
      const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);
      const patterns = getRecentPatternReports(classroomId, limit);
      res.json({ patterns });
    } catch (err) {
      console.error("Patterns history error:", err);
      handleRouteError(res, err);
    }
  });

  return router;
}
