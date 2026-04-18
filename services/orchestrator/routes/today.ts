import { Router } from "express";
import { buildDebtRegister, getLatestPlan, getLatestForecast } from "../../memory/retrieve.js";
import { handleRouteError, sendClassroomNotFound, sendRouteError } from "../errors.js";
import { isValidClassroomId } from "../validate.js";
import { requireRoles, type RouteDeps } from "../route-deps.js";
import type { ClassroomId } from "../../../packages/shared/schemas/branded.js";
import { buildRosterScope, isRosterScopedValue } from "../../memory/roster-scope.js";

export function createTodayRouter(deps: RouteDeps): Router {
  const router = Router();
  const authMiddleware = deps.authMiddleware;
  // Today snapshot: teacher (owner), EA (coordination), substitute (covering
  // teacher). Reviewer is intentionally excluded — reviewers inspect history
  // surfaces (plans/messages/interventions), not the active operational view.
  const teacherEaOrSubstitute = requireRoles(deps, ["teacher", "ea", "substitute"]);

  router.get("/:classroomId", authMiddleware, teacherEaOrSubstitute, (req, res) => {
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

      const rosterScope = buildRosterScope(classroom, deps.loadClassrooms());
      const register = buildDebtRegister(classroomId, classroom, undefined, rosterScope);
      const latestPlan = getLatestPlan(classroomId);
      const latestForecast = getLatestForecast(classroomId);

      res.json({
        debt_register: register,
        latest_plan: isRosterScopedValue(latestPlan, rosterScope) ? latestPlan : null,
        latest_forecast: isRosterScopedValue(latestForecast, rosterScope) ? latestForecast : null,
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
