import { Router } from "express";
import { getRoute, getModelId } from "../router.js";
import { buildSupportPatternsPrompt, parseSupportPatternsResponse } from "../support-patterns.js";
import type { SupportPatternsInput } from "../support-patterns.js";
import { savePatternReport } from "../../memory/store.js";
import { buildPatternContext, getLatestPatternReport } from "../../memory/retrieve.js";
import { validateBody, SupportPatternsRequestSchema } from "../validate.js";
import type { RouteDeps } from "../route-deps.js";
import type { SupportPatternReport } from "../../../packages/shared/schemas/pattern.js";
import { callInference } from "../inference-client.js";
import { inferenceResponseMeta } from "../response-meta.js";
import { handleRouteError, sendClassroomNotFound, sendParseError, sendRouteError } from "../errors.js";
import { maybeExposeThinkingSummary } from "../thinking-summary.js";
import type { ClassroomId } from "../../../packages/shared/schemas/branded.js";
import { isValidClassroomId } from "../validate.js";

export function createSupportPatternsRouter(deps: RouteDeps): Router {
  const router = Router();

  router.post("/", validateBody(SupportPatternsRequestSchema), async (req, res) => {
    try {
      const { classroom_id: rawClassroomId, student_filter, time_window } = req.body;
      const classroom_id = rawClassroomId as ClassroomId;

      const classroom = deps.loadClassroom(classroom_id);
      if (!classroom) {
        sendClassroomNotFound(res, classroom_id);
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

      const inferenceData = await callInference({
        deps,
        req,
        res,
        route,
        prompt,
        maxTokens: 4096,
        mockContext: {
          classroom_id,
          student_filter,
          time_window: window,
        },
        safetyScanSource: { ...patternInput, patternCtx },
      });

      let report: SupportPatternReport;
      try {
        report = parseSupportPatternsResponse(
          inferenceData.text,
          classroom_id,
          patternInput,
        );
      } catch (parseErr) {
        sendParseError(res, "Failed to parse model output as support pattern report", inferenceData.text, parseErr);
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
        thinking_summary: maybeExposeThinkingSummary(inferenceData.thinking_text),
        ...inferenceResponseMeta(inferenceData, modelId),
      });
    } catch (err) {
      console.error("Support patterns error:", err);
      handleRouteError(res, err);
    }
  });

  // ----- Latest Pattern Report Retrieval -----

  router.get("/latest/:classroomId", deps.authMiddleware, (req, res) => {
    try {
      const rawId = req.params.classroomId as string;
      if (!isValidClassroomId(rawId)) {
        sendRouteError(res, 400, { error: "Invalid classroom ID format", category: "validation", retryable: false, detail_code: "invalid_classroom_id" });
        return;
      }
      const classroomId = rawId as ClassroomId;
      const report = getLatestPatternReport(classroomId);
      if (!report) {
        res.json({ report: null });
        return;
      }
      res.json({ report });
    } catch (err) {
      console.error("Pattern retrieval error:", err);
      handleRouteError(res, err);
    }
  });

  return router;
}
