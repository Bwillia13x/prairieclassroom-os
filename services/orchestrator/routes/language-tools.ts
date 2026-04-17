import { Router } from "express";
import { getRoute, getModelId } from "../router.js";
import {
  formatCurriculumSelectionForPrompt,
  resolveCurriculumSelection,
} from "../curriculum-registry.js";
import { buildSimplifyPrompt, parseSimplifyResponse } from "../simplify.js";
import type { SimplifyInput } from "../simplify.js";
import { buildVocabCardsPrompt, parseVocabCardsResponse } from "../vocab-cards.js";
import type { VocabCardsInput } from "../vocab-cards.js";
import { validateBody, SimplifyRequestSchema, VocabCardsRequestSchema } from "../validate.js";
import type { RouteDeps } from "../route-deps.js";
import { callInference } from "../inference-client.js";
import { inferenceResponseMeta } from "../response-meta.js";
import { handleRouteError, sendParseError, sendRouteError } from "../errors.js";

export function createLanguageToolsRouter(deps: RouteDeps): Router {
  const router = Router();

  router.post("/simplify", validateBody(SimplifyRequestSchema), async (req, res) => {
    try {
      const { source_text, grade_band, eal_level } = req.body;

      const route = getRoute("simplify_for_student");
      const modelId = getModelId(route.model_tier);

      const simplifyInput: SimplifyInput = { source_text, grade_band, eal_level };
      const prompt = buildSimplifyPrompt(simplifyInput);

      const inferenceData = await callInference({
        deps,
        req,
        res,
        route,
        prompt,
        maxTokens: 2048,
        safetyScanSource: simplifyInput,
      });

      let simplified;
      try {
        simplified = parseSimplifyResponse(inferenceData.text, simplifyInput);
      } catch (parseErr) {
        sendParseError(res, "Failed to parse model output as simplified text", inferenceData.text, parseErr);
        return;
      }

      res.json({
        simplified,
        ...inferenceResponseMeta(inferenceData, modelId),
      });
    } catch (err) {
      console.error("Simplify error:", err);
      handleRouteError(res, err);
    }
  });

  router.post("/vocab-cards", validateBody(VocabCardsRequestSchema), async (req, res) => {
    try {
      const { artifact_id, artifact_text, subject, target_language, grade_band, curriculum_selection } = req.body;

      const route = getRoute("generate_vocab_cards");
      const modelId = getModelId(route.model_tier);
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

      const vocabInput: VocabCardsInput = {
        artifact_id: artifact_id || "unknown",
        artifact_text,
        subject,
        target_language,
        grade_band,
        curriculumContext: formatCurriculumSelectionForPrompt(hydratedCurriculum),
      };
      const prompt = buildVocabCardsPrompt(vocabInput);

      const inferenceData = await callInference({
        deps,
        req,
        res,
        route,
        prompt,
        maxTokens: 2048,
        safetyScanSource: {
          ...vocabInput,
          curriculum_selection,
        },
      });

      let cardSet;
      try {
        cardSet = parseVocabCardsResponse(inferenceData.text, vocabInput);
      } catch (parseErr) {
        sendParseError(res, "Failed to parse model output as vocab cards", inferenceData.text, parseErr);
        return;
      }

      res.json({
        card_set: cardSet,
        ...inferenceResponseMeta(inferenceData, modelId),
      });
    } catch (err) {
      console.error("Vocab cards error:", err);
      handleRouteError(res, err);
    }
  });

  return router;
}
