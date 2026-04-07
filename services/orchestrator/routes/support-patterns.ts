import { Router } from "express";
import { getRoute, getModelId } from "../router.js";
import { buildSupportPatternsPrompt, parseSupportPatternsResponse } from "../support-patterns.js";
import type { SupportPatternsInput } from "../support-patterns.js";
import { savePatternReport } from "../../memory/store.js";
import { buildPatternContext, getLatestPatternReport } from "../../memory/retrieve.js";
import { validateBody, SupportPatternsRequestSchema } from "../validate.js";
import type { RouteDeps } from "../route-deps.js";
import type { SupportPatternReport } from "../../../packages/shared/schemas/pattern.js";

export function createSupportPatternsRouter(deps: RouteDeps): Router {
  const router = Router();

  router.post("/", validateBody(SupportPatternsRequestSchema), async (req, res) => {
    try {
      const { classroom_id, student_filter, time_window } = req.body;

      const classroom = deps.loadClassroom(classroom_id);
      if (!classroom) {
        res.status(404).json({ error: `Classroom '${classroom_id}' not found` });
        return;
      }

      const route = getRoute("detect_support_patterns");
      const modelId = getModelId(route.model_tier);

      const window = time_window ?? 10;
      const patternInput: SupportPatternsInput = {
        classroom_id,
        student_filter,
        time_window: window,
      };

      let patternCtx = "";
      try {
        patternCtx = buildPatternContext(classroom_id, student_filter, window);
      } catch (memErr) {
        console.warn("Memory retrieval failed (patterns):", memErr);
      }

      const prompt = buildSupportPatternsPrompt(classroom, patternInput, patternCtx);

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
            student_filter,
            time_window: window,
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
        thinking_text: string | null;
        model_id: string;
        latency_ms: number;
      };

      let report: SupportPatternReport;
      try {
        report = parseSupportPatternsResponse(
          inferenceData.text,
          classroom_id,
          patternInput,
        );
      } catch (parseErr) {
        res.status(422).json({
          error: "Failed to parse model output as support pattern report",
          raw_output: inferenceData.text,
          parse_error: parseErr instanceof Error ? parseErr.message : String(parseErr),
        });
        return;
      }

      // Persist pattern report to classroom memory
      try {
        savePatternReport(classroom_id, report, inferenceData.model_id || modelId);
      } catch (memErr) {
        console.warn("Memory save failed (pattern report):", memErr);
      }

      res.json({
        report,
        thinking_summary: inferenceData.thinking_text ?? null,
        model_id: inferenceData.model_id || modelId,
        latency_ms: inferenceData.latency_ms,
      });
    } catch (err) {
      console.error("Support patterns error:", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Internal server error",
      });
    }
  });

  // ----- Latest Pattern Report Retrieval -----

  router.get("/latest/:classroomId", (req, res) => {
    try {
      const classroomId = req.params.classroomId as string;
      const report = getLatestPatternReport(classroomId);
      if (!report) {
        res.json({ report: null });
        return;
      }
      res.json({ report });
    } catch (err) {
      console.error("Pattern retrieval error:", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Internal server error",
      });
    }
  });

  return router;
}
