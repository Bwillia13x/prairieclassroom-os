import { Router } from "express";
import { getRoute, getModelId } from "../router.js";
import { buildComplexityForecastPrompt, parseComplexityForecastResponse } from "../complexity-forecast.js";
import type { ComplexityForecastInput } from "../complexity-forecast.js";
import { saveForecast } from "../../memory/store.js";
import { getLatestForecast, buildForecastContext } from "../../memory/retrieve.js";
import { validateBody, ComplexityForecastRequestSchema } from "../validate.js";
import type { RouteDeps } from "../route-deps.js";
import type { ComplexityForecast } from "../../../packages/shared/schemas/forecast.js";
import type { ClassroomId } from "../../../packages/shared/schemas/branded.js";
import { callInference } from "../inference-client.js";
import { inferenceResponseMeta } from "../response-meta.js";
import { handleRouteError, sendClassroomNotFound, sendParseError, sendRouteError } from "../errors.js";
import { maybeExposeThinkingSummary } from "../thinking-summary.js";
import { isValidClassroomId } from "../validate.js";

export function createForecastRouter(deps: RouteDeps): Router {
  const router = Router();

  router.post("/", validateBody(ComplexityForecastRequestSchema), async (req, res) => {
    try {
      const { classroom_id: raw_classroom_id, forecast_date, teacher_notes } = req.body;
      const classroom_id = raw_classroom_id as ClassroomId;

      const classroom = deps.loadClassroom(classroom_id);
      if (!classroom) {
        sendClassroomNotFound(res, classroom_id);
        return;
      }

      const route = getRoute("forecast_complexity");
      const modelId = getModelId(route.model_tier);

      const forecastInput: ComplexityForecastInput = {
        classroom_id,
        forecast_date,
        teacher_notes,
      };

      let forecastCtx = "";
      try {
        forecastCtx = buildForecastContext(classroom_id);
      } catch (memErr) {
        console.warn("Memory retrieval failed (forecast context):", memErr);
      }

      const prompt = buildComplexityForecastPrompt(classroom, forecastInput, forecastCtx || undefined);

      const inferenceData = await callInference({
        deps,
        req,
        res,
        route,
        prompt,
        maxTokens: 4096,
        mockContext: {
          classroom_id,
          forecast_date,
          teacher_notes,
        },
        safetyScanSource: { ...forecastInput, forecastCtx },
      });

      let forecast: ComplexityForecast;
      try {
        const allowedAliases = classroom.students.map((student) => student.alias).filter(Boolean);
        const knownStudentAliases = deps.loadClassrooms().flatMap((profile) =>
          profile.students.map((student) => student.alias).filter(Boolean),
        );
        forecast = parseComplexityForecastResponse(
          inferenceData.text,
          classroom_id,
          forecast_date,
          allowedAliases,
          knownStudentAliases,
        );
      } catch (parseErr) {
        sendParseError(res, "Failed to parse model output as complexity forecast", inferenceData.text, parseErr);
        return;
      }

      // Persist forecast to classroom memory
      try {
        saveForecast(classroom_id, forecast, inferenceData.model_id || modelId);
      } catch (memErr) {
        console.warn("Memory save failed (forecast):", memErr);
      }

      res.json({
        forecast,
        thinking_summary: maybeExposeThinkingSummary(inferenceData.thinking_text),
        ...inferenceResponseMeta(inferenceData, modelId),
      });
    } catch (err) {
      console.error("Complexity forecast error:", err);
      handleRouteError(res, err);
    }
  });

  // ----- Latest Forecast Retrieval -----

  router.get("/latest/:classroomId", deps.authMiddleware, (req, res) => {
    try {
      const rawId = req.params.classroomId as string;
      if (!isValidClassroomId(rawId)) {
        sendRouteError(res, 400, { error: "Invalid classroom ID format", category: "validation", retryable: false, detail_code: "invalid_classroom_id" });
        return;
      }
      const classroomId = rawId as ClassroomId;
      const forecast = getLatestForecast(classroomId);
      if (!forecast) {
        res.json({ forecast: null });
        return;
      }
      res.json({ forecast });
    } catch (err) {
      console.error("Forecast retrieval error:", err);
      handleRouteError(res, err);
    }
  });

  return router;
}
