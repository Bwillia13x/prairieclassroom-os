import { Router } from "express";
import { getStudentSummaries } from "../../memory/student-summary.js";
import { createAuthMiddleware } from "../auth.js";
import type { RouteDeps } from "../route-deps.js";
import type { ClassroomId } from "../../../packages/shared/schemas/branded.js";

export function createStudentSummaryRouter(deps: RouteDeps): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(deps.loadClassroom);

  router.get("/:id/student-summary", authMiddleware, (req, res) => {
    try {
      const classroomId = req.params.id as ClassroomId;
      const classroom = deps.loadClassroom(classroomId);
      if (!classroom) {
        res.status(404).json({ error: `Classroom '${classroomId}' not found` });
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
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  return router;
}
