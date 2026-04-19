import { Router, type Request, type Response } from "express";
import { getRoute, getModelId } from "../router.js";
import { buildEALoadPrompt, parseEALoadResponse } from "../ea-load.js";
import type { EALoadInput } from "../ea-load.js";
import {
  buildForecastContext,
  getRecentInterventions,
  getFollowUpPending,
  getLatestPatternReport,
} from "../../memory/retrieve.js";
import { validateBody, EALoadRequestSchema } from "../validate.js";
import { requireRoles, type RouteDeps } from "../route-deps.js";
import type { EALoadProfile } from "../../../packages/shared/schemas/ea-load.js";
import type { ClassroomId } from "../../../packages/shared/schemas/branded.js";
import { callInference, callInferenceStream, type InferenceStreamEmitter } from "../inference-client.js";
import { inferenceResponseMeta } from "../response-meta.js";
import { handleRouteError, RouteError } from "../errors.js";
import { maybeExposeThinkingSummary } from "../thinking-summary.js";
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

async function buildEALoadPayload(
  deps: RouteDeps,
  req: Request,
  res: Response,
  emit?: InferenceStreamEmitter,
  abortSignal?: AbortSignal,
) {
  const { classroom_id: raw_classroom_id, target_date, teacher_notes } = req.body;
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

  const route = getRoute("balance_ea_load");
  const modelId = getModelId(route.model_tier);

  const loadInput: EALoadInput = {
    classroom_id,
    target_date,
    teacher_notes,
  };

  // Reuse the forecast context builder: it surfaces the same intervention
  // frequency + recent pattern data EA load analysis needs, without
  // duplicating retrieval logic.
  let loadCtx = "";
  const citations: RetrievalCitation[] = [];
  const seenInterventionIds = new Set<string>();
  try {
    loadCtx = buildForecastContext(classroom_id, rosterScope);
    // Mirror buildForecastContext's citable retrievals.
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
    console.warn("Memory retrieval failed (ea_load context):", memErr);
  }
  const retrievalTrace = buildRetrievalTrace(citations);

  const prompt = buildEALoadPrompt(classroom, loadInput, loadCtx || undefined);

  const inferenceOptions = {
    deps,
    req,
    res,
    route,
    prompt,
    maxTokens: 4096,
    mockContext: {
      classroom_id,
      target_date,
      teacher_notes,
    },
    safetyScanSource: { ...loadInput, loadCtx },
    abortSignal,
  };
  const inferenceData = emit
    ? await callInferenceStream(inferenceOptions, emit)
    : await callInference(inferenceOptions);

  let profile: EALoadProfile;
  try {
    const allowedAliases = classroom.students.map((s) => s.alias).filter(Boolean);
    const knownStudentAliases = deps.loadClassrooms().flatMap((p) =>
      p.students.map((s) => s.alias).filter(Boolean),
    );
    profile = parseEALoadResponse(
      inferenceData.text,
      classroom_id,
      target_date,
      allowedAliases,
      knownStudentAliases,
    );
  } catch (parseErr) {
    throw new RouteError(422, {
      error: "Failed to parse model output as EA load profile",
      category: "inference",
      retryable: false,
      detail_code: "model_output_parse_failed",
    }, {
      raw_output: inferenceData.text,
      parse_error: parseErr instanceof Error ? parseErr.message : String(parseErr),
    });
  }

  return {
    profile,
    thinking_summary: maybeExposeThinkingSummary(inferenceData.thinking_text),
    retrieval_trace: retrievalTrace,
    ...inferenceResponseMeta(inferenceData, modelId),
  };
}

export function createEALoadRouter(deps: RouteDeps): Router {
  const router = Router();
  const teacherOrEa = requireRoles(deps, ["teacher", "ea"]);

  router.post("/", validateBody(EALoadRequestSchema), async (req, res) => {
    try {
      res.json(await buildEALoadPayload(deps, req, res));
    } catch (err) {
      console.error("EA load error:", err);
      handleRouteError(res, err);
    }
  });

  router.post("/stream", validateBody(EALoadRequestSchema), (req, res) => {
    const streamId = createStreamJob(req, res);
    res.status(202).json({
      stream_id: streamId,
      stream_url: `/api/ea-load/stream/${streamId}/events`,
    });
  });

  router.get("/stream/:streamId/events", attachStreamJobRequest, teacherOrEa, async (req, res) => {
    try {
      const abortSignal = getStreamAbortSignal(res);
      openSse(res);
      sendSse(res, "ready", { stream_id: req.params.streamId });
      const payload = await buildEALoadPayload(
        deps,
        req,
        res,
        (event) => sendSse(res, event.type, { text: event.text }),
        abortSignal,
      );
      sendSse(res, "complete", payload);
    } catch (err) {
      console.error("EA load stream error:", err);
      if (res.headersSent) {
        sendSseError(res, err);
      } else {
        handleRouteError(res, err);
      }
    } finally {
      if (!res.writableEnded) res.end();
    }
  });

  return router;
}
