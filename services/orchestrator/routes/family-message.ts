import { Router } from "express";
import { getRoute, getModelId } from "../router.js";
import { buildFamilyMessagePrompt, parseFamilyMessageResponse } from "../family-message.js";
import type { FamilyMessageInput } from "../family-message.js";
import { saveFamilyMessage, approveFamilyMessage } from "../../memory/store.js";
import { validateBody, FamilyMessageRequestSchema, ApproveMessageRequestSchema } from "../validate.js";
import type { RouteDeps } from "../route-deps.js";
import type { FamilyMessageDraft } from "../../../packages/shared/schemas/message.js";

export function createFamilyMessageRouter(deps: RouteDeps): Router {
  const router = Router();

  router.post("/", validateBody(FamilyMessageRequestSchema), async (req, res) => {
    try {
      const { classroom_id, student_refs, message_type, target_language, context } = req.body;

      const classroom = deps.loadClassroom(classroom_id);
      if (!classroom) {
        res.status(404).json({ error: `Classroom '${classroom_id}' not found` });
        return;
      }

      const route = getRoute("draft_family_message");
      const modelId = getModelId(route.model_tier);

      const msgInput: FamilyMessageInput = {
        classroom_id,
        student_refs,
        message_type,
        target_language,
        context,
      };
      const prompt = buildFamilyMessagePrompt(classroom, msgInput);

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
            student_refs,
            message_type,
            target_language,
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

      let draft: FamilyMessageDraft;
      try {
        draft = parseFamilyMessageResponse(inferenceData.text, classroom_id, msgInput);
      } catch (parseErr) {
        res.status(422).json({
          error: "Failed to parse model output as family message",
          raw_output: inferenceData.text,
          parse_error: parseErr instanceof Error ? parseErr.message : String(parseErr),
        });
        return;
      }

      // Persist to classroom memory
      try {
        saveFamilyMessage(classroom_id, draft, inferenceData.model_id || modelId);
      } catch (memErr) {
        console.warn("Memory save failed (family message):", memErr);
      }

      res.json({
        draft,
        model_id: inferenceData.model_id || modelId,
        latency_ms: inferenceData.latency_ms,
      });
    } catch (err) {
      console.error("Family message error:", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Internal server error",
      });
    }
  });

  router.post("/approve", validateBody(ApproveMessageRequestSchema), async (req, res) => {
    try {
      const { classroom_id, draft_id } = req.body;

      approveFamilyMessage(classroom_id, draft_id);
      res.json({ approved: true, draft_id });
    } catch (err) {
      console.error("Approval error:", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Internal server error",
      });
    }
  });

  return router;
}
