import { Router } from "express";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createAuthMiddleware } from "../auth.js";
import { validateBody, ScheduleUpdateRequestSchema } from "../validate.js";
import type { RouteDeps } from "../route-deps.js";

export function createClassroomsRouter(deps: RouteDeps): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(deps.loadClassroom);

  router.get("/", (_req, res) => {
    const classrooms = deps.loadClassrooms();
    res.json(
      classrooms.map((c) => ({
        classroom_id: c.classroom_id,
        grade_band: c.grade_band,
        subject_focus: c.subject_focus,
        classroom_notes: c.classroom_notes,
        students: (c.students ?? []).map((s) => ({ alias: s.alias, family_language: s.family_language })),
      })),
    );
  });

  router.get("/:id/schedule", (req, res) => {
    const classroom = deps.loadClassroom(req.params.id);
    if (!classroom) {
      res.status(404).json({ error: `Classroom '${req.params.id}' not found` });
      return;
    }
    res.json({
      classroom_id: classroom.classroom_id,
      schedule: classroom.schedule ?? [],
      upcoming_events: classroom.upcoming_events ?? [],
      sub_ready: classroom.sub_ready ?? false,
    });
  });

  router.put(
    "/:id/schedule",
    authMiddleware,
    validateBody(ScheduleUpdateRequestSchema),
    (req, res) => {
      const classroomId = req.params.id as string;
      const classroom = deps.loadClassroom(classroomId);
      if (!classroom) {
        res.status(404).json({ error: `Classroom '${classroomId}' not found` });
        return;
      }

      classroom.schedule = req.body.schedule;
      if (req.body.upcoming_events !== undefined) {
        classroom.upcoming_events = req.body.upcoming_events;
      }

      // Persist to the JSON file that loadClassroom reads from
      const files = readdirSync(deps.dataDir).filter((f) => f.startsWith("classroom_") && f.endsWith(".json"));
      const matchingFile = files.find((f) => {
        const content = JSON.parse(readFileSync(join(deps.dataDir, f), "utf-8"));
        return content.classroom_id === classroomId;
      });

      if (matchingFile) {
        writeFileSync(join(deps.dataDir, matchingFile), JSON.stringify(classroom, null, 2), "utf-8");
      }

      res.json({
        classroom_id: classroomId,
        schedule: classroom.schedule,
        upcoming_events: classroom.upcoming_events ?? [],
        updated: true,
      });
    }
  );

  return router;
}
