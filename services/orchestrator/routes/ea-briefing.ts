import { Router } from "express";
import { getRoute, getModelId } from "../router.js";
import { buildEABriefingPrompt, parseEABriefingResponse } from "../ea-briefing.js";
import type { EABriefingInput } from "../ea-briefing.js";
import { buildEABriefingContext } from "../../memory/retrieve.js";
import { validateBody, EABriefingRequestSchema } from "../validate.js";
import type { RouteDeps } from "../route-deps.js";
import type { EABriefing } from "../../../packages/shared/schemas/briefing.js";

export function createEABriefingRouter(deps: RouteDeps): Router {
  const router = Router();

  router.post("/", validateBody(EABriefingRequestSchema), async (req, res) => {
    try {
      const { classroom_id, ea_name } = req.body;

      const classroom = deps.loadClassroom(classroom_id);
      if (!classroom) {
        res.status(404).json({ error: `Classroom '${classroom_id}' not found` });
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

      const inferenceResp = await fetch(`${deps.inferenceUrl}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${prompt.system}\n\n${prompt.user}`,
          model_tier: route.model_tier,
          thinking: route.thinking_enabled,
          prompt_class: route.prompt_class,
          max_tokens: 2048,
          mock_context: {
            classroom_id,
            ea_name,
          },
        }),
      });

      if (!inferenceResp.ok) {
        const errText = await inferenceResp.text();
        res.status(502).json({ error: `Inference service error: ${errText}` });
        return;
      }

      const inferenceData = (await inferenceResp.json()) as {
        text: string;
        model_id: string;
        latency_ms: number;
      };

      let briefing: EABriefing;
      try {
        briefing = parseEABriefingResponse(inferenceData.text, classroom_id);
      } catch (parseErr) {
        res.status(422).json({
          error: "Failed to parse model output as EA briefing",
          raw_output: inferenceData.text,
          parse_error: parseErr instanceof Error ? parseErr.message : String(parseErr),
        });
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
      res.status(500).json({
        error: err instanceof Error ? err.message : "Internal server error",
      });
    }
  });

  return router;
}
