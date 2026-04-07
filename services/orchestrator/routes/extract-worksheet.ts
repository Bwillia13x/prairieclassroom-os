import { Router } from "express";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { getRoute, getModelId } from "../router.js";
import { buildExtractionPrompt, parseExtractionResponse } from "../extract-worksheet.js";
import { validateBody, ExtractWorksheetRequestSchema } from "../validate.js";
import type { RouteDeps } from "../route-deps.js";

export function createExtractWorksheetRouter(deps: RouteDeps): Router {
  const router = Router();

  router.post("/", validateBody(ExtractWorksheetRequestSchema), async (req, res) => {
    let tempFilePath: string | null = null;

    try {
      const { classroom_id, image_base64, mime_type } = req.body;

      // Load classroom profile
      const classroom = deps.loadClassroom(classroom_id);
      if (!classroom) {
        res.status(404).json({ error: `Classroom '${classroom_id}' not found` });
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

      // Call inference service
      const inferenceResp = await fetch(`${deps.inferenceUrl}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${prompt.system}\n\n${prompt.user}`,
          images: [tempFilePath],
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

      // Parse extraction response from model output
      let extracted: { extracted_text: string; confidence_notes: string[] };
      try {
        extracted = parseExtractionResponse(inferenceData.text);
      } catch (parseErr) {
        res.status(422).json({
          error: "Failed to parse model output as worksheet extraction",
          raw_output: inferenceData.text,
          parse_error: parseErr instanceof Error ? parseErr.message : String(parseErr),
        });
        return;
      }

      res.json({
        extracted_text: extracted.extracted_text,
        confidence_notes: extracted.confidence_notes,
        model_id: inferenceData.model_id || modelId,
        latency_ms: inferenceData.latency_ms,
      });
    } catch (err) {
      console.error("Worksheet extraction error:", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Internal server error",
      });
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
