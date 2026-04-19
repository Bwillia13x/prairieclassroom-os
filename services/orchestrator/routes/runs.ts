import { Router } from "express";
import { validateBody } from "../validate.js";
import {
  RUN_TOOLS,
  SaveRunRequestSchema,
  type RunTool,
} from "../../../packages/shared/schemas/run.js";
import { isValidClassroomId } from "../validate.js";
import { saveRun } from "../../memory/store.js";
import { getRecentRuns } from "../../memory/retrieve.js";
import {
  handleRouteError,
  sendRouteError,
  sendClassroomNotFound,
} from "../errors.js";
import { requireRoles, type RouteDeps } from "../route-deps.js";
import type { ClassroomId } from "../../../packages/shared/schemas/branded.js";

const MAX_RUN_LIMIT = 10;
const DEFAULT_RUN_LIMIT = 3;

function parseTool(value: unknown): RunTool | null {
  if (typeof value !== "string") return null;
  return (RUN_TOOLS as readonly string[]).includes(value) ? (value as RunTool) : null;
}

function parseLimit(value: unknown): number {
  if (typeof value !== "string") return DEFAULT_RUN_LIMIT;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_RUN_LIMIT;
  return Math.min(parsed, MAX_RUN_LIMIT);
}

/**
 * Prep run history — lightweight metadata about recent differentiate /
 * simplify / vocab generations. See docs/database-schema.md for the table
 * shape and RUN_RETENTION_LIMIT for retention.
 */
export function createRunsRouter(deps: RouteDeps): Router {
  const router = Router();
  const authMiddleware = deps.authMiddleware;
  // Writes come from the teacher who just generated the artifact.
  const teacherOnly = requireRoles(deps, ["teacher"]);
  // Reads populate the chip row for both the teacher and the EA who's
  // previewing the same classroom.
  const teacherOrEa = requireRoles(deps, ["teacher", "ea"]);

  // POST /api/classrooms/:id/runs — record a single run.
  router.post(
    "/:id/runs",
    authMiddleware,
    teacherOnly,
    validateBody(SaveRunRequestSchema),
    (req, res) => {
      try {
        const rawId = req.params.id as string;
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
        const body = req.body as import("../../../packages/shared/schemas/run.js").SaveRunRequest;

        saveRun(classroomId, {
          run_id: body.run_id,
          tool: body.tool,
          label: body.label,
          created_at: body.created_at,
          metadata: body.metadata,
        });

        res.json({ run_id: body.run_id, created_at: body.created_at });
      } catch (err) {
        console.error("Save run error:", err);
        handleRouteError(res, err);
      }
    },
  );

  // GET /api/classrooms/:id/runs?tool=differentiate&limit=3 — list newest-first.
  router.get("/:id/runs", authMiddleware, teacherOrEa, (req, res) => {
    try {
      const rawId = req.params.id as string;
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

      const tool = parseTool(req.query.tool);
      if (!tool) {
        sendRouteError(res, 400, {
          error: `tool query param must be one of: ${RUN_TOOLS.join(", ")}`,
          category: "validation",
          retryable: false,
          detail_code: "run_tool_invalid",
        });
        return;
      }

      const limit = parseLimit(req.query.limit);
      const classroomId = rawId as ClassroomId;
      const runs = getRecentRuns(classroomId, tool, limit);
      res.json({ runs });
    } catch (err) {
      console.error("List runs error:", err);
      handleRouteError(res, err);
    }
  });

  return router;
}
