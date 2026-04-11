import { Router } from "express";
import { getClassroomHealth } from "../../memory/health.js";
import { createAuthMiddleware } from "../auth.js";
import type { RouteDeps } from "../route-deps.js";
import type { ClassroomId } from "../../../packages/shared/schemas/branded.js";

export function createClassroomHealthRouter(deps: RouteDeps): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(deps.loadClassroom);

  router.get("/:id/health", authMiddleware, (req, res) => {
    try {
      const classroomId = req.params.id as ClassroomId;
      const health = getClassroomHealth(classroomId);
      res.json(health);
    } catch (err) {
      console.error("Classroom health error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  return router;
}
