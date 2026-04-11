import { Router } from "express";
import { getRecentPlans, getRecentMessages, getRecentInterventions, getRecentPatternReports } from "../../memory/retrieve.js";
import { createAuthMiddleware } from "../auth.js";
import type { RouteDeps } from "../route-deps.js";
import type { ClassroomId } from "../../../packages/shared/schemas/branded.js";

function parseStudentRef(query: unknown): string | undefined {
  if (typeof query !== "string") return undefined;
  if (query.length > 100) return undefined;
  return query;
}

export function createHistoryRouter(deps: RouteDeps): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(deps.loadClassroom);

  router.get("/:id/plans", authMiddleware, (req, res) => {
    try {
      const classroomId = req.params.id as ClassroomId;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const plans = getRecentPlans(classroomId, limit);
      res.json({ plans });
    } catch (err) {
      console.error("Plans history error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  router.get("/:id/messages", authMiddleware, (req, res) => {
    try {
      const classroomId = req.params.id as ClassroomId;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const studentRef = parseStudentRef(req.query.student);
      const messages = getRecentMessages(classroomId, limit, studentRef);
      res.json({ messages });
    } catch (err) {
      console.error("Messages history error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  router.get("/:id/interventions", authMiddleware, (req, res) => {
    try {
      const classroomId = req.params.id as ClassroomId;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const studentRef = parseStudentRef(req.query.student);
      const interventions = getRecentInterventions(classroomId, limit, studentRef);
      res.json({ interventions });
    } catch (err) {
      console.error("Interventions history error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  router.get("/:id/patterns", authMiddleware, (req, res) => {
    try {
      const classroomId = req.params.id as ClassroomId;
      const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);
      const patterns = getRecentPatternReports(classroomId, limit);
      res.json({ patterns });
    } catch (err) {
      console.error("Patterns history error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  return router;
}
