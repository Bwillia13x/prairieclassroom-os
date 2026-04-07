import { Router } from "express";
import { getRoute, getModelId } from "../router.js";
import { buildSimplifyPrompt, parseSimplifyResponse } from "../simplify.js";
import type { SimplifyInput } from "../simplify.js";
import { buildVocabCardsPrompt, parseVocabCardsResponse } from "../vocab-cards.js";
import type { VocabCardsInput } from "../vocab-cards.js";
import { validateBody, SimplifyRequestSchema, VocabCardsRequestSchema } from "../validate.js";
import type { RouteDeps } from "../route-deps.js";

export function createLanguageToolsRouter(deps: RouteDeps): Router {
  const router = Router();

  router.post("/simplify", validateBody(SimplifyRequestSchema), async (req, res) => {
    try {
      const { source_text, grade_band, eal_level } = req.body;

      const route = getRoute("simplify_for_student");
      const modelId = getModelId(route.model_tier);

      const simplifyInput: SimplifyInput = { source_text, grade_band, eal_level };
      const prompt = buildSimplifyPrompt(simplifyInput);

      const inferenceResp = await fetch(`${deps.inferenceUrl}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${prompt.system}\n\n${prompt.user}`,
          model_tier: route.model_tier,
          thinking: route.thinking_enabled,
          prompt_class: "simplify_for_student",
          max_tokens: 2048,
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

      let simplified;
      try {
        simplified = parseSimplifyResponse(inferenceData.text, simplifyInput);
      } catch (parseErr) {
        res.status(422).json({
          error: "Failed to parse model output as simplified text",
          raw_output: inferenceData.text,
          parse_error: parseErr instanceof Error ? parseErr.message : String(parseErr),
        });
        return;
      }

      res.json({
        simplified,
        model_id: inferenceData.model_id || modelId,
        latency_ms: inferenceData.latency_ms,
      });
    } catch (err) {
      console.error("Simplify error:", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Internal server error",
      });
    }
  });

  router.post("/vocab-cards", validateBody(VocabCardsRequestSchema), async (req, res) => {
    try {
      const { artifact_id, artifact_text, subject, target_language, grade_band } = req.body;

      const route = getRoute("generate_vocab_cards");
      const modelId = getModelId(route.model_tier);

      const vocabInput: VocabCardsInput = {
        artifact_id: artifact_id || "unknown",
        artifact_text,
        subject,
        target_language,
        grade_band,
      };
      const prompt = buildVocabCardsPrompt(vocabInput);

      const inferenceResp = await fetch(`${deps.inferenceUrl}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${prompt.system}\n\n${prompt.user}`,
          model_tier: route.model_tier,
          thinking: route.thinking_enabled,
          prompt_class: "generate_vocab_cards",
          max_tokens: 2048,
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

      let cardSet;
      try {
        cardSet = parseVocabCardsResponse(inferenceData.text, vocabInput);
      } catch (parseErr) {
        res.status(422).json({
          error: "Failed to parse model output as vocab cards",
          raw_output: inferenceData.text,
          parse_error: parseErr instanceof Error ? parseErr.message : String(parseErr),
        });
        return;
      }

      res.json({
        card_set: cardSet,
        model_id: inferenceData.model_id || modelId,
        latency_ms: inferenceData.latency_ms,
      });
    } catch (err) {
      console.error("Vocab cards error:", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Internal server error",
      });
    }
  });

  return router;
}
