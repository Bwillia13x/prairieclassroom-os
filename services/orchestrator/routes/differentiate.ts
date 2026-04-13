import { Router } from "express";
import { getRoute, getModelId } from "../router.js";
import { buildDifferentiationPrompt, parseVariantsResponse } from "../differentiate.js";
import {
  formatCurriculumSelectionForPrompt,
  resolveCurriculumSelection,
} from "../curriculum-registry.js";
import { saveVariants } from "../../memory/store.js";
import { validateBody, DifferentiateRequestSchema } from "../validate.js";
import type { RouteDeps } from "../route-deps.js";
import type { DifferentiatedVariant } from "../../../packages/shared/schemas/artifact.js";
import { callInference } from "../inference-client.js";
import {
  handleRouteError,
  sendClassroomNotFound,
  sendParseError,
  sendRouteError,
} from "../errors.js";

export function createDifferentiateRouter(deps: RouteDeps): Router {
  const router = Router();

  router.post("/", validateBody(DifferentiateRequestSchema), async (req, res) => {
    try {
      const { artifact, classroom_id, teacher_goal, curriculum_selection } = req.body;

      // Load classroom profile
      const classroom = deps.loadClassroom(classroom_id);
      if (!classroom) {
        sendClassroomNotFound(res, classroom_id);
        return;
      }

      const hydratedCurriculum = resolveCurriculumSelection(curriculum_selection);
      if (curriculum_selection && !hydratedCurriculum) {
        sendRouteError(res, 400, {
          error: "Curriculum selection is invalid for the Alberta curriculum catalog",
          category: "validation",
          retryable: false,
          detail_code: "curriculum_selection_invalid",
        });
        return;
      }

      // Get route config
      const route = getRoute("differentiate_material");
      const modelId = getModelId(route.model_tier);

      // Build prompt
      const prompt = buildDifferentiationPrompt(
        artifact,
        classroom,
        teacher_goal,
        formatCurriculumSelectionForPrompt(hydratedCurriculum),
      );
      const inferenceData = await callInference({
        deps,
        req,
        res,
        route,
        prompt,
        maxTokens: 4096,
        mockContext: { classroom_id },
        safetyScanSource: { teacher_goal, artifact, curriculum_selection },
      });

      // Parse variants from model output — retry once on parse failure
      let variants: DifferentiatedVariant[];
      try {
        variants = parseVariantsResponse(inferenceData.text, artifact.artifact_id);
      } catch (parseErr) {
        sendParseError(res, "Failed to parse model output as variants", inferenceData.text, parseErr);
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
      handleRouteError(res, err);
    }
  });

  return router;
}
