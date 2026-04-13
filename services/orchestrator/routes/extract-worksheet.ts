import { Router } from "express";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { getRoute, getModelId } from "../router.js";
import { buildExtractionPrompt, parseExtractionResponse } from "../extract-worksheet.js";
import { suggestCurriculumEntries } from "../curriculum-registry.js";
import { validateBody, ExtractWorksheetRequestSchema } from "../validate.js";
import type { RouteDeps } from "../route-deps.js";
import { callInference } from "../inference-client.js";
import { handleRouteError, sendClassroomNotFound, sendParseError } from "../errors.js";

export function createExtractWorksheetRouter(deps: RouteDeps): Router {
  const router = Router();

  router.post("/", validateBody(ExtractWorksheetRequestSchema), async (req, res) => {
    let tempFilePath: string | null = null;

    try {
      const { classroom_id, image_base64, mime_type } = req.body;

      // Load classroom profile
      const classroom = deps.loadClassroom(classroom_id);
      if (!classroom) {
        sendClassroomNotFound(res, classroom_id);
        return;
      }

      // Get route config
      const route = getRoute("extract_worksheet");
      const modelId = getModelId(route.model_tier);

      // Build prompt
      const prompt = buildExtractionPrompt();

      // Write base64 image to a temp file — inference harness expects file paths
      const ext = mime_type.split("/")[1] ?? "jpg";
      const tempFileName = `worksheet-${randomUUID()}.${ext}`;
      tempFilePath = join(tmpdir(), tempFileName);
      writeFileSync(tempFilePath, Buffer.from(image_base64, "base64"));

      const inferenceData = await callInference({
        deps,
        req,
        res,
        route,
        prompt,
        maxTokens: 4096,
        mockContext: { classroom_id },
        images: [tempFilePath],
      });

      // Parse extraction response from model output
      let extracted: { extracted_text: string; confidence_notes: string[] };
      try {
        extracted = parseExtractionResponse(inferenceData.text);
      } catch (parseErr) {
        sendParseError(res, "Failed to parse model output as worksheet extraction", inferenceData.text, parseErr);
        return;
      }

      const curriculumSuggestions = suggestCurriculumEntries(classroom, extracted.extracted_text);

      res.json({
        extracted_text: extracted.extracted_text,
        confidence_notes: extracted.confidence_notes,
        curriculum_suggestions: curriculumSuggestions,
        model_id: inferenceData.model_id || modelId,
        latency_ms: inferenceData.latency_ms,
      });
    } catch (err) {
      console.error("Worksheet extraction error:", err);
      handleRouteError(res, err);
    } finally {
      // Clean up temp file
      if (tempFilePath) {
        try {
          unlinkSync(tempFilePath);
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  });

  return router;
}
