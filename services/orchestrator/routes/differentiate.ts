import { Router } from "express";
import { getRoute, getModelId } from "../router.js";
import { buildDifferentiationPrompt, parseVariantsResponse } from "../differentiate.js";
import { saveVariants } from "../../memory/store.js";
import { validateBody, DifferentiateRequestSchema } from "../validate.js";
import type { RouteDeps } from "../route-deps.js";
import type { DifferentiatedVariant } from "../../../packages/shared/schemas/artifact.js";

export function createDifferentiateRouter(deps: RouteDeps): Router {
  const router = Router();

  router.post("/", validateBody(DifferentiateRequestSchema), async (req, res) => {
    try {
      const { artifact, classroom_id, teacher_goal } = req.body;

      // Load classroom profile
      const classroom = deps.loadClassroom(classroom_id);
      if (!classroom) {
        res.status(404).json({ error: `Classroom '${classroom_id}' not found` });
        return;
      }

      // Get route config
      const route = getRoute("differentiate_material");
      const modelId = getModelId(route.model_tier);

      // Build prompt
      const prompt = buildDifferentiationPrompt(artifact, classroom, teacher_goal);

      // Call inference service
      const inferenceResp = await fetch(`${deps.inferenceUrl}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${prompt.system}\n\n${prompt.user}`,
          model_tier: route.model_tier,
          thinking: route.thinking_enabled,
          prompt_class: route.prompt_class,
          max_tokens: 4096,
          mock_context: {
            classroom_id,
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

      // Parse variants from model output
      let variants: DifferentiatedVariant[];
      try {
        variants = parseVariantsResponse(inferenceData.text, artifact.artifact_id);
      } catch (parseErr) {
        res.status(422).json({
          error: "Failed to parse model output as variants",
          raw_output: inferenceData.text,
          parse_error: parseErr instanceof Error ? parseErr.message : String(parseErr),
        });
        return;
      }

      res.json({
        artifact_id: artifact.artifact_id,
        variants,
        model_id: inferenceData.model_id || modelId,
        latency_ms: inferenceData.latency_ms,
      });

      // Persist variants to classroom memory
      try {
        saveVariants(classroom_id, variants, inferenceData.model_id || modelId);
      } catch (memErr) {
        console.warn("Memory save failed (variants):", memErr);
      }
    } catch (err) {
      console.error("Differentiation error:", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Internal server error",
      });
    }
  });

  return router;
}
