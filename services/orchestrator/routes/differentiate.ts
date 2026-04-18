import { Router } from "express";
import { getRoute, getModelId } from "../router.js";
import { z } from "zod";
import { buildDifferentiationPrompt, parseVariantsResponse } from "../differentiate.js";
import { DifferentiatedVariantSchema } from "../../../packages/shared/schemas/artifact.js";
import { validateParsedResponse } from "../validate-parsed-response.js";
import {
  formatCurriculumSelectionForPrompt,
  resolveCurriculumSelection,
} from "../curriculum-registry.js";
import { saveVariants } from "../../memory/store.js";
import { validateBody, DifferentiateRequestSchema } from "../validate.js";
import type { RouteDeps } from "../route-deps.js";
import type { DifferentiatedVariant } from "../../../packages/shared/schemas/artifact.js";
import { callInference } from "../inference-client.js";
import { inferenceResponseMeta } from "../response-meta.js";
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
        const coerced = parseVariantsResponse(inferenceData.text, artifact.artifact_id);
        variants = validateParsedResponse(
          z.array(DifferentiatedVariantSchema),
          coerced,
          { promptClass: "differentiate_material", rawText: inferenceData.text },
        );
      } catch (parseErr) {
        sendParseError(res, "Failed to parse model output as variants", inferenceData.text, parseErr);
        return;
      }

      res.json({
        artifact_id: artifact.artifact_id,
        variants,
        ...inferenceResponseMeta(inferenceData, modelId),
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
