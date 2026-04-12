import { Router } from "express";
import { getClassroomHealth } from "../../memory/health.js";
import { handleRouteError, sendRouteError } from "../errors.js";
import { isValidClassroomId } from "../validate.js";
import type { RouteDeps } from "../route-deps.js";
import type { ClassroomId } from "../../../packages/shared/schemas/branded.js";

export function createClassroomHealthRouter(deps: RouteDeps): Router {
  const router = Router();
  const authMiddleware = deps.authMiddleware;

  router.get("/:id/health", authMiddleware, (req, res) => {
    try {
      const rawId = req.params.id as string;
      if (!isValidClassroomId(rawId)) {
        sendRouteError(res, 400, { error: "Invalid classroom ID format", category: "validation", retryable: false, detail_code: "invalid_classroom_id" });
        return;
      }
      const classroomId = rawId as ClassroomId;
      const health = getClassroomHealth(classroomId);
      res.json(health);
    } catch (err) {
      console.error("Classroom health error:", err);
      handleRouteError(res, err);
    }
  });

  return router;
}
