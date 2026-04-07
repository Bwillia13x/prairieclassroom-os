import { Router } from "express";
import { buildDebtRegister } from "../../memory/retrieve.js";
import type { RouteDeps } from "../route-deps.js";

export function createDebtRegisterRouter(deps: RouteDeps): Router {
  const router = Router();

  router.get("/:classroomId", (req, res) => {
    try {
      const classroomId = req.params.classroomId as string;

      const classroom = deps.loadClassroom(classroomId);
      if (!classroom) {
        res.status(404).json({ error: `Classroom '${classroomId}' not found` });
        return;
      }

      // Parse and validate optional numeric query params (reject NaN)
      const parsePositiveInt = (v: unknown): number | undefined => {
        if (v === undefined || v === null || v === "") return undefined;
        const n = Number(v);
        return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
      };

      const thresholds = {
        stale_followup_days: parsePositiveInt(req.query.stale_followup_days),
        unapproved_message_days: parsePositiveInt(req.query.unapproved_message_days),
        recurring_plan_min: parsePositiveInt(req.query.recurring_plan_min),
        review_window_days: parsePositiveInt(req.query.review_window_days),
        review_min_records: parsePositiveInt(req.query.review_min_records),
      };

      const register = buildDebtRegister(classroomId, classroom, thresholds);
      res.json({ register });
    } catch (err) {
      console.error("Debt register error:", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Internal server error",
      });
    }
  });

  return router;
}
