import { Router } from "express";
import { getRoute, getModelId } from "../router.js";
import { buildFamilyMessagePrompt, parseFamilyMessageResponse } from "../family-message.js";
import type { FamilyMessageInput } from "../family-message.js";
import { saveFamilyMessage, approveFamilyMessage } from "../../memory/store.js";
import { validateBody, FamilyMessageRequestSchema, ApproveMessageRequestSchema } from "../validate.js";
import type { RouteDeps } from "../route-deps.js";
import type { FamilyMessageDraft } from "../../../packages/shared/schemas/message.js";
import { callInference } from "../inference-client.js";
import { inferenceResponseMeta } from "../response-meta.js";
import { handleRouteError, sendClassroomNotFound, sendParseError } from "../errors.js";

export function createFamilyMessageRouter(deps: RouteDeps): Router {
  const router = Router();

  router.post("/", validateBody(FamilyMessageRequestSchema), async (req, res) => {
    try {
      const { classroom_id, student_refs, message_type, target_language, context } = req.body;

      const classroom = deps.loadClassroom(classroom_id);
      if (!classroom) {
        sendClassroomNotFound(res, classroom_id);
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

      const inferenceData = await callInference({
        deps,
        req,
        res,
        route,
        prompt,
        maxTokens: 2048,
        mockContext: {
          classroom_id,
          student_refs,
          message_type,
          target_language,
        },
        safetyScanSource: msgInput,
      });

      let draft: FamilyMessageDraft;
      try {
        draft = parseFamilyMessageResponse(inferenceData.text, classroom_id, msgInput);
      } catch (parseErr) {
        sendParseError(res, "Failed to parse model output as family message", inferenceData.text, parseErr);
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
        ...inferenceResponseMeta(inferenceData, modelId),
      });
    } catch (err) {
      console.error("Family message error:", err);
      handleRouteError(res, err);
    }
  });

  router.post("/approve", validateBody(ApproveMessageRequestSchema), async (req, res) => {
    try {
      const { classroom_id, draft_id, edited_text } = req.body;

      approveFamilyMessage(classroom_id, draft_id, edited_text);
      res.json({ approved: true, draft_id, edited: edited_text !== undefined });
    } catch (err) {
      console.error("Approval error:", err);
      handleRouteError(res, err);
    }
  });

  return router;
}
