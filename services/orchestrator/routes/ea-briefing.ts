import { Router, type Request, type Response } from "express";
import { getRoute, getModelId } from "../router.js";
import { buildEABriefingPrompt, parseEABriefingResponse } from "../ea-briefing.js";
import type { EABriefingInput } from "../ea-briefing.js";
import {
  buildEABriefingContext,
  getRecentPlans,
  getRelevantInterventions,
  getFollowUpPending,
  getLatestPatternReport,
} from "../../memory/retrieve.js";
import { validateBody, EABriefingRequestSchema } from "../validate.js";
import { requireRoles, type RouteDeps } from "../route-deps.js";
import type { EABriefing } from "../../../packages/shared/schemas/briefing.js";
import { callInference, callInferenceStream, type InferenceStreamEmitter } from "../inference-client.js";
import { inferenceResponseMeta } from "../response-meta.js";
import { handleRouteError, RouteError, sendClassroomNotFound, sendParseError } from "../errors.js";
import {
  buildRetrievalTrace,
  planCitation,
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

async function buildEABriefingPayload(
  deps: RouteDeps,
  req: Request,
  res: Response,
  emit?: InferenceStreamEmitter,
  abortSignal?: AbortSignal,
) {
  const { classroom_id, ea_name, coordination_notes } = req.body;

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

  const route = getRoute("generate_ea_briefing");
  const modelId = getModelId(route.model_tier);

  const briefingInput: EABriefingInput = { classroom_id, ea_name, coordination_notes };

  let briefingCtx = "";
  const citations: RetrievalCitation[] = [];
  const seenInterventionIds = new Set<string>();
  try {
    briefingCtx = buildEABriefingContext(classroom_id, rosterScope);
    for (const plan of filterRosterScoped(getRecentPlans(classroom_id, 1), rosterScope)) {
      citations.push(planCitation(plan));
    }
    for (const record of filterRosterScoped(getFollowUpPending(classroom_id), rosterScope).slice(0, 5)) {
      if (seenInterventionIds.has(record.record_id)) continue;
      seenInterventionIds.add(record.record_id);
      citations.push(interventionCitation(record));
    }
    for (const record of getRelevantInterventions(classroom_id, {
      limit: 5,
      query: "ea briefing support priority schedule transition follow up",
      rosterScope,
    })) {
      if (seenInterventionIds.has(record.record_id)) continue;
      seenInterventionIds.add(record.record_id);
      citations.push(interventionCitation(record));
    }
    const latestPattern = getLatestPatternReport(classroom_id);
    if (latestPattern && isRosterScopedValue(latestPattern, rosterScope)) citations.push(patternReportCitation(latestPattern));
  } catch (memErr) {
    console.warn("Memory retrieval failed (ea briefing):", memErr);
  }
  const retrievalTrace = buildRetrievalTrace(citations);

  const prompt = buildEABriefingPrompt(classroom, briefingInput, briefingCtx);

  const inferenceOptions = {
    deps,
    req,
    res,
    route,
    prompt,
    maxTokens: 768,
    mockContext: {
      classroom_id,
      ea_name,
      coordination_notes,
    },
    safetyScanSource: { ...briefingInput, briefingCtx },
    abortSignal,
  };
  const inferenceData = emit
    ? await callInferenceStream(inferenceOptions, emit)
    : await callInference(inferenceOptions);

  let briefing: EABriefing;
  try {
    briefing = parseEABriefingResponse(
      inferenceData.text,
      classroom_id,
      classroom.students.map((student) => student.alias),
    );
  } catch (parseErr) {
    // Use a typed parse error so streaming callers surface the same
    // detail_code as the non-stream path. Non-stream callers continue
    // to use sendParseError via handleRouteError below.
    throw new RouteError(422, {
      error: "Failed to parse model output as EA briefing",
      category: "inference",
      retryable: false,
      detail_code: "model_output_parse_failed",
    }, {
      raw_output: inferenceData.text,
      parse_error: parseErr instanceof Error ? parseErr.message : String(parseErr),
    });
  }

  return {
    briefing,
    retrieval_trace: retrievalTrace,
    ...inferenceResponseMeta(inferenceData, modelId),
  };
}

export function createEABriefingRouter(deps: RouteDeps): Router {
  const router = Router();
  const teacherEaOrSubstitute = requireRoles(deps, ["teacher", "ea", "substitute"]);

  router.post("/", validateBody(EABriefingRequestSchema), async (req, res) => {
    try {
      const { classroom_id } = req.body;
      const classroom = deps.loadClassroom(classroom_id);
      if (!classroom) {
        sendClassroomNotFound(res, classroom_id);
        return;
      }
      res.json(await buildEABriefingPayload(deps, req, res));
    } catch (err) {
      // Map the structured parse error back to the existing wire shape so
      // existing non-stream callers keep their error contract.
      if (err instanceof RouteError && err.detailCode === "model_output_parse_failed") {
        const extras = err.extra ?? {};
        sendParseError(
          res,
          err.message,
          typeof extras.raw_output === "string" ? extras.raw_output : "",
          typeof extras.parse_error === "string" ? new Error(extras.parse_error) : undefined,
        );
        return;
      }
      console.error("EA briefing error:", err);
      handleRouteError(res, err);
    }
  });

  router.post("/stream", validateBody(EABriefingRequestSchema), (req, res) => {
    const streamId = createStreamJob(req, res);
    res.status(202).json({
      stream_id: streamId,
      stream_url: `/api/ea-briefing/stream/${streamId}/events`,
    });
  });

  router.get("/stream/:streamId/events", attachStreamJobRequest, teacherEaOrSubstitute, async (req, res) => {
    try {
      const abortSignal = getStreamAbortSignal(res);
      openSse(res);
      sendSse(res, "ready", { stream_id: req.params.streamId });
      const payload = await buildEABriefingPayload(
        deps,
        req,
        res,
        (event) => sendSse(res, event.type, { text: event.text }),
        abortSignal,
      );
      sendSse(res, "complete", payload);
    } catch (err) {
      console.error("EA briefing stream error:", err);
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
