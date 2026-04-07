import { Router } from "express";
import { buildDebtRegister, getLatestPlan, getLatestForecast } from "../../memory/retrieve.js";
import type { RouteDeps } from "../route-deps.js";

export function createTodayRouter(deps: RouteDeps): Router {
  const router = Router();

  router.get("/:classroomId", (req, res) => {
    try {
      const classroomId = req.params.classroomId as string;
      const classroom = deps.loadClassroom(classroomId);
      if (!classroom) {
        res.status(404).json({ error: `Classroom '${classroomId}' not found` });
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
      res.status(500).json({
        error: err instanceof Error ? err.message : "Internal server error",
      });
    }
  });

  return router;
}
