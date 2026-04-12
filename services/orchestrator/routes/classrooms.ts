import { Router } from "express";
import { readFileSync, readdirSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { handleRouteError, sendClassroomNotFound, sendRouteError } from "../errors.js";
import { validateBody, ScheduleUpdateRequestSchema, isValidClassroomId } from "../validate.js";
import type { RouteDeps } from "../route-deps.js";

export function createClassroomsRouter(deps: RouteDeps): Router {
  const router = Router();
  const authMiddleware = deps.authMiddleware;

  router.get("/", (_req, res) => {
    try {
      const classrooms = deps.loadClassrooms();
      res.json(
        classrooms.map((c) => ({
          classroom_id: c.classroom_id,
          grade_band: c.grade_band,
          subject_focus: c.subject_focus,
          classroom_notes: c.classroom_notes,
          requires_access_code: Boolean(c.access_code),
          is_demo: c.classroom_id === "demo-okafor-grade34",
          students: (c.students ?? []).map((s) => ({ alias: s.alias, family_language: s.family_language })),
        })),
      );
    } catch (err) {
      console.error("Classrooms list error:", err);
      handleRouteError(res, err);
    }
  });

  router.get("/:id/schedule", (req, res) => {
    try {
      const classroomId = req.params.id as string;
      if (!isValidClassroomId(classroomId)) {
        sendRouteError(res, 400, { error: "Invalid classroom ID format", category: "validation", retryable: false, detail_code: "invalid_classroom_id" });
        return;
      }
      const classroom = deps.loadClassroom(classroomId);
      if (!classroom) {
        sendClassroomNotFound(res, classroomId);
        return;
      }
      res.json({
        classroom_id: classroom.classroom_id,
        schedule: classroom.schedule ?? [],
        upcoming_events: classroom.upcoming_events ?? [],
        sub_ready: classroom.sub_ready ?? false,
      });
    } catch (err) {
      console.error("Classroom schedule error:", err);
      handleRouteError(res, err);
    }
  });

  router.put(
    "/:id/schedule",
    authMiddleware,
    validateBody(ScheduleUpdateRequestSchema),
    (req, res) => {
      try {
        const classroomId = req.params.id as string;
        if (!isValidClassroomId(classroomId)) {
          sendRouteError(res, 400, { error: "Invalid classroom ID format", category: "validation", retryable: false, detail_code: "invalid_classroom_id" });
          return;
        }
        const classroom = deps.loadClassroom(classroomId);
        if (!classroom) {
          sendClassroomNotFound(res, classroomId);
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
          const targetPath = join(deps.dataDir, matchingFile);
          const tmpPath = `${targetPath}.tmp`;
          writeFileSync(tmpPath, JSON.stringify(classroom, null, 2), "utf-8");
          renameSync(tmpPath, targetPath);
        }

        res.json({
          classroom_id: classroomId,
          schedule: classroom.schedule,
          upcoming_events: classroom.upcoming_events ?? [],
          updated: true,
        });
      } catch (err) {
        console.error("Schedule update error:", err);
        handleRouteError(res, err);
      }
    }
  );

  return router;
}
