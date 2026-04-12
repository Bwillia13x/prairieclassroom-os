import { Router } from "express";
import { randomUUID } from "node:crypto";
import { validateBody } from "../validate.js";
import { FeedbackRequestSchema } from "../../../packages/shared/schemas/feedback.js";
import { isValidClassroomId } from "../validate.js";
import { saveFeedback, getFeedbackSummary } from "../../memory/store.js";
import { handleRouteError, sendRouteError, sendClassroomNotFound } from "../errors.js";
import type { RouteDeps } from "../route-deps.js";
import type { ClassroomId } from "../../../packages/shared/schemas/branded.js";

export function createFeedbackRouter(deps: RouteDeps): Router {
  const router = Router();

  // POST / — submit teacher feedback on generated panel content
  router.post("/", validateBody(FeedbackRequestSchema), (req, res) => {
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
      const id = randomUUID();
      const created_at = new Date().toISOString();

      saveFeedback(classroomId, { ...body, id });

      res.json({ id, created_at });
    } catch (err) {
      console.error("Feedback submit error:", err);
      handleRouteError(res, err);
    }
  });

  // GET /summary/:classroomId — aggregated feedback summary
  router.get("/summary/:classroomId", (req, res) => {
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

      const classroomId = rawId as ClassroomId;
      const summary = getFeedbackSummary(classroomId);
      res.json(summary);
    } catch (err) {
      console.error("Feedback summary error:", err);
      handleRouteError(res, err);
    }
  });

  return router;
}
