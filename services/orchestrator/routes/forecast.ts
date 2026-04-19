import { Router, type Request, type Response } from "express";
import { getRoute, getModelId } from "../router.js";
import { buildComplexityForecastPrompt, parseComplexityForecastResponse } from "../complexity-forecast.js";
import type { ComplexityForecastInput } from "../complexity-forecast.js";
import { saveForecast } from "../../memory/store.js";
import {
  getLatestForecast,
  buildForecastContext,
  getRecentInterventions,
  getFollowUpPending,
  getLatestPatternReport,
} from "../../memory/retrieve.js";
import { validateBody, ComplexityForecastRequestSchema } from "../validate.js";
import { requireRoles, type RouteDeps } from "../route-deps.js";
import type { ComplexityForecast } from "../../../packages/shared/schemas/forecast.js";
import type { ClassroomId } from "../../../packages/shared/schemas/branded.js";
import { callInference, callInferenceStream, type InferenceStreamEmitter } from "../inference-client.js";
import { inferenceResponseMeta } from "../response-meta.js";
import { handleRouteError, RouteError, sendClassroomNotFound, sendRouteError } from "../errors.js";
import { maybeExposeThinkingSummary } from "../thinking-summary.js";
import { isValidClassroomId } from "../validate.js";
import {
  buildRetrievalTrace,
  interventionCitation,
  patternReportCitation,
} from "../retrieval-trace.js";
import type { RetrievalCitation } from "../../../packages/shared/schemas/retrieval-trace.js";
import {
  buildRosterScope,
  filterRosterScoped,
  isRosterScopedValue,
} from "../../memory/roster-scope.js";
import {
  attachStreamJobRequest,
  createStreamJob,
  getStreamAbortSignal,
  openSse,
  sendSse,
  sendSseError,
} from "../streaming.js";

async function buildForecastPayload(
  deps: RouteDeps,
  req: Request,
  res: Response,
  emit?: InferenceStreamEmitter,
  abortSignal?: AbortSignal,
) {
  const { classroom_id: raw_classroom_id, forecast_date, teacher_notes } = req.body;
  const classroom_id = raw_classroom_id as ClassroomId;

  const classroom = deps.loadClassroom(classroom_id);
  if (!classroom) {
    throw new RouteError(404, {
      error: `Classroom '${classroom_id}' not found`,
      category: "validation",
      retryable: false,
      detail_code: "classroom_not_found",
    });
  }
  const rosterScope = buildRosterScope(classroom, deps.loadClassrooms());

  const route = getRoute("forecast_complexity");
  const modelId = getModelId(route.model_tier);

  const forecastInput: ComplexityForecastInput = {
    classroom_id,
    forecast_date,
    teacher_notes,
  };

  let forecastCtx = "";
  const citations: RetrievalCitation[] = [];
  const seenInterventionIds = new Set<string>();
  try {
    forecastCtx = buildForecastContext(classroom_id, rosterScope);
    // Mirror the records buildForecastContext pulls so the response trace
    // matches what was actually injected into the prompt.
    for (const record of filterRosterScoped(getRecentInterventions(classroom_id, 5), rosterScope)) {
      if (seenInterventionIds.has(record.record_id)) continue;
      seenInterventionIds.add(record.record_id);
      citations.push(interventionCitation(record));
    }
    for (const record of filterRosterScoped(getFollowUpPending(classroom_id), rosterScope).slice(0, 5)) {
      if (seenInterventionIds.has(record.record_id)) continue;
      seenInterventionIds.add(record.record_id);
      citations.push(interventionCitation(record));
    }
    const latestPattern = getLatestPatternReport(classroom_id);
    if (latestPattern && isRosterScopedValue(latestPattern, rosterScope)) citations.push(patternReportCitation(latestPattern));
  } catch (memErr) {
    console.warn("Memory retrieval failed (forecast context):", memErr);
  }
  const retrievalTrace = buildRetrievalTrace(citations);

  const prompt = buildComplexityForecastPrompt(classroom, forecastInput, forecastCtx || undefined);

  const inferenceOptions = {
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
    abortSignal,
  };
  const inferenceData = emit
    ? await callInferenceStream(inferenceOptions, emit)
    : await callInference(inferenceOptions);

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
    throw new RouteError(422, {
      error: "Failed to parse model output as complexity forecast",
      category: "inference",
      retryable: false,
      detail_code: "model_output_parse_failed",
    }, {
      raw_output: inferenceData.text,
      parse_error: parseErr instanceof Error ? parseErr.message : String(parseErr),
    });
  }

  // Persist forecast to classroom memory
  try {
    saveForecast(classroom_id, forecast, inferenceData.model_id || modelId);
  } catch (memErr) {
    console.warn("Memory save failed (forecast):", memErr);
  }

  return {
    forecast,
    thinking_summary: maybeExposeThinkingSummary(inferenceData.thinking_text),
    retrieval_trace: retrievalTrace,
    ...inferenceResponseMeta(inferenceData, modelId),
  };
}

export function createForecastRouter(deps: RouteDeps): Router {
  const router = Router();
  // Narrow scopes per route. The mount-level middleware allows the union
  // [teacher, substitute, reviewer]; generation is teacher-only, and the
  // read-only GET latest surface is open to substitutes and reviewers.
  const teacherOnly = requireRoles(deps, ["teacher"]);
  const teacherSubstituteOrReviewer = requireRoles(deps, ["teacher", "substitute", "reviewer"]);

  router.post("/", teacherOnly, validateBody(ComplexityForecastRequestSchema), async (req, res) => {
    try {
      res.json(await buildForecastPayload(deps, req, res));
    } catch (err) {
      console.error("Complexity forecast error:", err);
      handleRouteError(res, err);
    }
  });

  router.post("/stream", teacherOnly, validateBody(ComplexityForecastRequestSchema), (req, res) => {
    const streamId = createStreamJob(req, res);
    res.status(202).json({
      stream_id: streamId,
      stream_url: `/api/complexity-forecast/stream/${streamId}/events`,
    });
  });

  router.get("/stream/:streamId/events", attachStreamJobRequest, teacherOnly, async (req, res) => {
    try {
      const abortSignal = getStreamAbortSignal(res);
      openSse(res);
      sendSse(res, "ready", { stream_id: req.params.streamId });
      const payload = await buildForecastPayload(
        deps,
        req,
        res,
        (event) => sendSse(res, event.type, { text: event.text }),
        abortSignal,
      );
      sendSse(res, "complete", payload);
    } catch (err) {
      console.error("Complexity forecast stream error:", err);
      if (res.headersSent) {
        sendSseError(res, err);
      } else {
        handleRouteError(res, err);
      }
    } finally {
      if (!res.writableEnded) res.end();
    }
  });

  // ----- Latest Forecast Retrieval -----

  router.get("/latest/:classroomId", deps.authMiddleware, teacherSubstituteOrReviewer, (req, res) => {
    try {
      const rawId = req.params.classroomId as string;
      if (!isValidClassroomId(rawId)) {
        sendRouteError(res, 400, { error: "Invalid classroom ID format", category: "validation", retryable: false, detail_code: "invalid_classroom_id" });
        return;
      }
      const classroomId = rawId as ClassroomId;
      const classroom = deps.loadClassroom(classroomId);
      if (!classroom) {
        sendClassroomNotFound(res, classroomId);
        return;
      }
      const rosterScope = buildRosterScope(classroom, deps.loadClassrooms());
      const forecast = getLatestForecast(classroomId);
      if (!forecast || !isRosterScopedValue(forecast, rosterScope)) {
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
