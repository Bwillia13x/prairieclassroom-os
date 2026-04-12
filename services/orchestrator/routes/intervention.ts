import { Router } from "express";
import { getRoute, getModelId } from "../router.js";
import { buildInterventionPrompt, parseInterventionResponse } from "../intervention.js";
import type { InterventionInput } from "../intervention.js";
import { saveIntervention } from "../../memory/store.js";
import { validateBody, InterventionRequestSchema } from "../validate.js";
import type { RouteDeps } from "../route-deps.js";
import type { InterventionRecord } from "../../../packages/shared/schemas/intervention.js";
import { callInference } from "../inference-client.js";
import { handleRouteError, sendClassroomNotFound, sendParseError } from "../errors.js";

export function createInterventionRouter(deps: RouteDeps): Router {
  const router = Router();

  router.post("/", validateBody(InterventionRequestSchema), async (req, res) => {
    try {
      const { classroom_id, student_refs, teacher_note, context } = req.body;

      const classroom = deps.loadClassroom(classroom_id);
      if (!classroom) {
        sendClassroomNotFound(res, classroom_id);
        return;
      }

      const route = getRoute("log_intervention");
      const modelId = getModelId(route.model_tier);

      const intInput: InterventionInput = {
        classroom_id,
        student_refs,
        teacher_note,
        context,
      };
      const prompt = buildInterventionPrompt(classroom, intInput);

      const inferenceData = await callInference({
        deps,
        req,
        res,
        route,
        prompt,
        maxTokens: 1024,
        mockContext: {
          classroom_id,
          student_refs,
        },
        safetyScanSource: intInput,
      });

      let record: InterventionRecord;
      try {
        record = parseInterventionResponse(inferenceData.text, classroom_id, intInput);
      } catch (parseErr) {
        sendParseError(res, "Failed to parse model output as intervention record", inferenceData.text, parseErr);
        return;
      }

      // Persist to classroom memory
      try {
        saveIntervention(classroom_id, record, inferenceData.model_id || modelId);
      } catch (memErr) {
        console.warn("Memory save failed (intervention):", memErr);
      }

      res.json({
        record,
        model_id: inferenceData.model_id || modelId,
        latency_ms: inferenceData.latency_ms,
      });
    } catch (err) {
      console.error("Intervention logging error:", err);
      handleRouteError(res, err);
    }
  });

  return router;
}
