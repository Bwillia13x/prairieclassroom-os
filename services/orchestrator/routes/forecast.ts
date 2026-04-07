import { Router } from "express";
import { getRoute, getModelId } from "../router.js";
import { buildComplexityForecastPrompt, parseComplexityForecastResponse } from "../complexity-forecast.js";
import type { ComplexityForecastInput } from "../complexity-forecast.js";
import { saveForecast } from "../../memory/store.js";
import { getLatestForecast, buildForecastContext } from "../../memory/retrieve.js";
import { validateBody, ComplexityForecastRequestSchema } from "../validate.js";
import type { RouteDeps } from "../route-deps.js";
import type { ComplexityForecast } from "../../../packages/shared/schemas/forecast.js";

export function createForecastRouter(deps: RouteDeps): Router {
  const router = Router();

  router.post("/", validateBody(ComplexityForecastRequestSchema), async (req, res) => {
    try {
      const { classroom_id, forecast_date, teacher_notes } = req.body;

      const classroom = deps.loadClassroom(classroom_id);
      if (!classroom) {
        res.status(404).json({ error: `Classroom '${classroom_id}' not found` });
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
            forecast_date,
            teacher_notes,
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

      let forecast: ComplexityForecast;
      try {
        forecast = parseComplexityForecastResponse(inferenceData.text, classroom_id, forecast_date);
      } catch (parseErr) {
        res.status(422).json({
          error: "Failed to parse model output as complexity forecast",
          raw_output: inferenceData.text,
          parse_error: parseErr instanceof Error ? parseErr.message : String(parseErr),
        });
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
        thinking_summary: inferenceData.thinking_text ?? null,
        model_id: inferenceData.model_id || modelId,
        latency_ms: inferenceData.latency_ms,
      });
    } catch (err) {
      console.error("Complexity forecast error:", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Internal server error",
      });
    }
  });

  // ----- Latest Forecast Retrieval -----

  router.get("/latest/:classroomId", (req, res) => {
    try {
      const classroomId = req.params.classroomId as string;
      const forecast = getLatestForecast(classroomId);
      if (!forecast) {
        res.json({ forecast: null });
        return;
      }
      res.json({ forecast });
    } catch (err) {
      console.error("Forecast retrieval error:", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Internal server error",
      });
    }
  });

  return router;
}
