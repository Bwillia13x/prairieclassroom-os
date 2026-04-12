import { Router } from "express";
import { getStudentSummaries } from "../../memory/student-summary.js";
import { handleRouteError, sendClassroomNotFound, sendRouteError } from "../errors.js";
import { isValidClassroomId } from "../validate.js";
import { requireRoles, type RouteDeps } from "../route-deps.js";
import type { ClassroomId } from "../../../packages/shared/schemas/branded.js";

export function createStudentSummaryRouter(deps: RouteDeps): Router {
  const router = Router();
  const authMiddleware = deps.authMiddleware;
  const teacherOnly = requireRoles(deps, ["teacher"]);

  router.get("/:id/student-summary", authMiddleware, teacherOnly, (req, res) => {
    try {
      const rawId = req.params.id as string;
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

      const raw = req.query.student;
      const studentFilter = typeof raw === "string" && raw.length <= 100 ? raw : undefined;
      const students = studentFilter
        ? classroom.students.filter((s) => s.alias === studentFilter)
        : classroom.students;

      const summaries = getStudentSummaries(classroomId, students);
      res.json({ summaries });
    } catch (err) {
      console.error("Student summary error:", err);
      handleRouteError(res, err);
    }
  });

  return router;
}
