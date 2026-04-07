import { Router } from "express";
import { getRoute, getModelId } from "../router.js";
import { buildInterventionPrompt, parseInterventionResponse } from "../intervention.js";
import type { InterventionInput } from "../intervention.js";
import { saveIntervention } from "../../memory/store.js";
import { validateBody, InterventionRequestSchema } from "../validate.js";
import type { RouteDeps } from "../route-deps.js";
import type { InterventionRecord } from "../../../packages/shared/schemas/intervention.js";

export function createInterventionRouter(deps: RouteDeps): Router {
  const router = Router();

  router.post("/", validateBody(InterventionRequestSchema), async (req, res) => {
    try {
      const { classroom_id, student_refs, teacher_note, context } = req.body;

      const classroom = deps.loadClassroom(classroom_id);
      if (!classroom) {
        res.status(404).json({ error: `Classroom '${classroom_id}' not found` });
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

      const inferenceResp = await fetch(`${deps.inferenceUrl}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${prompt.system}\n\n${prompt.user}`,
          model_tier: route.model_tier,
          thinking: route.thinking_enabled,
          prompt_class: route.prompt_class,
          max_tokens: 1024,
          mock_context: {
            classroom_id,
            student_refs,
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

      let record: InterventionRecord;
      try {
        record = parseInterventionResponse(inferenceData.text, classroom_id, intInput);
      } catch (parseErr) {
        res.status(422).json({
          error: "Failed to parse model output as intervention record",
          raw_output: inferenceData.text,
          parse_error: parseErr instanceof Error ? parseErr.message : String(parseErr),
        });
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
      res.status(500).json({
        error: err instanceof Error ? err.message : "Internal server error",
      });
    }
  });

  return router;
}
