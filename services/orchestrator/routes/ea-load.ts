import { Router } from "express";
import { getRoute, getModelId } from "../router.js";
import { buildEALoadPrompt, parseEALoadResponse } from "../ea-load.js";
import type { EALoadInput } from "../ea-load.js";
import { buildForecastContext } from "../../memory/retrieve.js";
import { validateBody, EALoadRequestSchema } from "../validate.js";
import type { RouteDeps } from "../route-deps.js";
import type { EALoadProfile } from "../../../packages/shared/schemas/ea-load.js";
import type { ClassroomId } from "../../../packages/shared/schemas/branded.js";
import { callInference } from "../inference-client.js";
import { inferenceResponseMeta } from "../response-meta.js";
import { handleRouteError, sendClassroomNotFound, sendParseError } from "../errors.js";
import { maybeExposeThinkingSummary } from "../thinking-summary.js";

export function createEALoadRouter(deps: RouteDeps): Router {
  const router = Router();

  router.post("/", validateBody(EALoadRequestSchema), async (req, res) => {
    try {
      const { classroom_id: raw_classroom_id, target_date, teacher_notes } = req.body;
      const classroom_id = raw_classroom_id as ClassroomId;

      const classroom = deps.loadClassroom(classroom_id);
      if (!classroom) {
        sendClassroomNotFound(res, classroom_id);
        return;
      }

      const route = getRoute("balance_ea_load");
      const modelId = getModelId(route.model_tier);

      const loadInput: EALoadInput = {
        classroom_id,
        target_date,
        teacher_notes,
      };

      // Reuse the forecast context builder: it surfaces the same intervention
      // frequency + recent pattern data EA load analysis needs, without
      // duplicating retrieval logic.
      let loadCtx = "";
      try {
        loadCtx = buildForecastContext(classroom_id);
      } catch (memErr) {
        console.warn("Memory retrieval failed (ea_load context):", memErr);
      }

      const prompt = buildEALoadPrompt(classroom, loadInput, loadCtx || undefined);

      const inferenceData = await callInference({
        deps,
        req,
        res,
        route,
        prompt,
        maxTokens: 4096,
        mockContext: {
          classroom_id,
          target_date,
          teacher_notes,
        },
        safetyScanSource: { ...loadInput, loadCtx },
      });

      let profile: EALoadProfile;
      try {
        const allowedAliases = classroom.students.map((s) => s.alias).filter(Boolean);
        const knownStudentAliases = deps.loadClassrooms().flatMap((p) =>
          p.students.map((s) => s.alias).filter(Boolean),
        );
        profile = parseEALoadResponse(
          inferenceData.text,
          classroom_id,
          target_date,
          allowedAliases,
          knownStudentAliases,
        );
      } catch (parseErr) {
        sendParseError(res, "Failed to parse model output as EA load profile", inferenceData.text, parseErr);
        return;
      }

      res.json({
        profile,
        thinking_summary: maybeExposeThinkingSummary(inferenceData.thinking_text),
        ...inferenceResponseMeta(inferenceData, modelId),
      });
    } catch (err) {
      console.error("EA load error:", err);
      handleRouteError(res, err);
    }
  });

  return router;
}
