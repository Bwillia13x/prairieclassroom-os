import { Router } from "express";
import { buildDebtRegister, getLatestPlan, getLatestForecast } from "../../memory/retrieve.js";
import { handleRouteError, sendClassroomNotFound, sendRouteError } from "../errors.js";
import { isValidClassroomId } from "../validate.js";
import type { RouteDeps } from "../route-deps.js";
import type { ClassroomId } from "../../../packages/shared/schemas/branded.js";

export function createTodayRouter(deps: RouteDeps): Router {
  const router = Router();
  const authMiddleware = deps.authMiddleware;

  router.get("/:classroomId", authMiddleware, (req, res) => {
    try {
      const rawId = req.params.classroomId as string;
      if (!isValidClassroomId(rawId)) {
        sendRouteError(res, 400, { error: "Invalid classroom ID format", category: "validation", retryable: false, detail_code: "invalid_classroom_id" });
        return;
      }
      const classroomId = rawId as ClassroomId;
      const classroom = deps.loadClassroom(classroomId);
      if (!classroom) {
        sendClassroomNotFound(res, classroomId);
        return;
      }

      const register = buildDebtRegister(classroomId, classroom);
      const latestPlan = getLatestPlan(classroomId);
      const latestForecast = getLatestForecast(classroomId);

      res.json({
        debt_register: register,
        latest_plan: latestPlan,
        latest_forecast: latestForecast,
        student_count: classroom.students.length,
        last_activity_at: register.items.length > 0
          ? register.generated_at
          : null,
      });
    } catch (err) {
      console.error("Today snapshot error:", err);
      handleRouteError(res, err);
    }
  });

  return router;
}
