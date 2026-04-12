import { Router } from "express";
import { getRoute, getModelId } from "../router.js";
import { buildEABriefingPrompt, parseEABriefingResponse } from "../ea-briefing.js";
import type { EABriefingInput } from "../ea-briefing.js";
import { buildEABriefingContext } from "../../memory/retrieve.js";
import { validateBody, EABriefingRequestSchema } from "../validate.js";
import type { RouteDeps } from "../route-deps.js";
import type { EABriefing } from "../../../packages/shared/schemas/briefing.js";
import { callInference } from "../inference-client.js";
import { handleRouteError, sendClassroomNotFound, sendParseError } from "../errors.js";

export function createEABriefingRouter(deps: RouteDeps): Router {
  const router = Router();

  router.post("/", validateBody(EABriefingRequestSchema), async (req, res) => {
    try {
      const { classroom_id, ea_name } = req.body;

      const classroom = deps.loadClassroom(classroom_id);
      if (!classroom) {
        sendClassroomNotFound(res, classroom_id);
        return;
      }

      const route = getRoute("generate_ea_briefing");
      const modelId = getModelId(route.model_tier);

      const briefingInput: EABriefingInput = { classroom_id, ea_name };

      let briefingCtx = "";
      try {
        briefingCtx = buildEABriefingContext(classroom_id);
      } catch (memErr) {
        console.warn("Memory retrieval failed (ea briefing):", memErr);
      }

      const prompt = buildEABriefingPrompt(classroom, briefingInput, briefingCtx);

      const inferenceData = await callInference({
        deps,
        req,
        res,
        route,
        prompt,
        maxTokens: 768,
        mockContext: {
          classroom_id,
          ea_name,
        },
        safetyScanSource: { ...briefingInput, briefingCtx },
      });

      let briefing: EABriefing;
      try {
        briefing = parseEABriefingResponse(
          inferenceData.text,
          classroom_id,
          classroom.students.map((student) => student.alias),
        );
      } catch (parseErr) {
        sendParseError(res, "Failed to parse model output as EA briefing", inferenceData.text, parseErr);
        return;
      }

      // No persistence — briefings are ephemeral synthesis views

      res.json({
        briefing,
        model_id: inferenceData.model_id || modelId,
        latency_ms: inferenceData.latency_ms,
      });
    } catch (err) {
      console.error("EA briefing error:", err);
      handleRouteError(res, err);
    }
  });

  return router;
}
