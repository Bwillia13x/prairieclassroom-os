import { Router } from "express";
import { getRoute, getModelId } from "../router.js";
import { buildSurvivalPacketPrompt, parseSurvivalPacketResponse } from "../survival-packet.js";
import type { SurvivalPacketInput } from "../survival-packet.js";
import { saveSurvivalPacket } from "../../memory/store.js";
import { buildSurvivalContext } from "../../memory/retrieve.js";
import { validateBody, SurvivalPacketRequestSchema } from "../validate.js";
import type { RouteDeps } from "../route-deps.js";
import type { SurvivalPacket } from "../../../packages/shared/schemas/survival-packet.js";

export function createSurvivalPacketRouter(deps: RouteDeps): Router {
  const router = Router();

  router.post("/", validateBody(SurvivalPacketRequestSchema), async (req, res) => {
    try {
      const { classroom_id, target_date, teacher_notes } = req.body;

      const classroom = deps.loadClassroom(classroom_id);
      if (!classroom) {
        res.status(404).json({ error: `Classroom '${classroom_id}' not found` });
        return;
      }

      // Check sub_ready gate
      if (!classroom.sub_ready) {
        res.status(403).json({
          error: "Survival packet generation requires sub_ready to be enabled for this classroom",
          hint: "Set sub_ready: true in the classroom profile or use PUT /api/classrooms/:id/schedule",
        });
        return;
      }

      const route = getRoute("generate_survival_packet");
      const modelId = getModelId(route.model_tier);

      // Build comprehensive retrieval context
      const survivalContext = buildSurvivalContext(classroom_id, classroom);

      const input: SurvivalPacketInput = { classroom_id, target_date, teacher_notes };
      const prompt = buildSurvivalPacketPrompt(classroom, input, survivalContext);

      const inferenceResp = await fetch(`${deps.inferenceUrl}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${prompt.system}\n\n${prompt.user}`,
          model_tier: route.model_tier,
          thinking: route.thinking_enabled,
          prompt_class: route.prompt_class,
          max_tokens: 8192,
          mock_context: {
            classroom_id,
            target_date,
            teacher_notes,
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
        thinking_summary?: string;
      };

      let packet: SurvivalPacket;
      try {
        packet = parseSurvivalPacketResponse(inferenceData.text, classroom_id, target_date);
      } catch (parseErr) {
        res.status(422).json({
          error: "Failed to parse model output as survival packet",
          raw_output: inferenceData.text,
          parse_error: parseErr instanceof Error ? parseErr.message : String(parseErr),
        });
        return;
      }

      saveSurvivalPacket(classroom_id, packet, inferenceData.model_id ?? modelId);

      res.json({
        packet,
        model_id: inferenceData.model_id,
        latency_ms: inferenceData.latency_ms,
        thinking_summary: inferenceData.thinking_summary,
      });
    } catch (err) {
      console.error("Survival packet generation failed:", err);
      res.status(500).json({
        error: "Survival packet generation failed",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  });

  return router;
}
