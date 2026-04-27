import { Router, type Request, type Response } from "express";
import { getRoute, getModelId } from "../router.js";
import { buildSupportPatternsPrompt, parseSupportPatternsResponse } from "../support-patterns.js";
import type { SupportPatternsInput } from "../support-patterns.js";
import { savePatternReport } from "../../memory/store.js";
import {
  buildPatternContext,
  getLatestPatternReport,
  getRelevantInterventions,
  getStudentInterventions,
  getRecentPlans,
  getFollowUpPending,
} from "../../memory/retrieve.js";
import { validateBody, SupportPatternsRequestSchema } from "../validate.js";
import { requireRoles, type RouteDeps } from "../route-deps.js";
import type { SupportPatternReport } from "../../../packages/shared/schemas/pattern.js";
import { callInference, callInferenceStream, type InferenceStreamEmitter } from "../inference-client.js";
import { inferenceResponseMeta } from "../response-meta.js";
import { handleRouteError, RouteError, sendClassroomNotFound, sendRouteError } from "../errors.js";
import { maybeExposeThinkingSummary } from "../thinking-summary.js";
import type { ClassroomId } from "../../../packages/shared/schemas/branded.js";
import { isValidClassroomId } from "../validate.js";
import {
  buildRetrievalTrace,
  planCitation,
  interventionCitation,
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

function shouldUseBufferedHostedStreamFallback(): boolean {
  return (process.env.PRAIRIE_INFERENCE_PROVIDER ?? "").trim().toLowerCase() === "gemini";
}

async function buildSupportPatternsPayload(
  deps: RouteDeps,
  req: Request,
  res: Response,
  emit?: InferenceStreamEmitter,
  abortSignal?: AbortSignal,
) {
  const { classroom_id: rawClassroomId, student_filter, time_window } = req.body;
  const classroom_id = rawClassroomId as ClassroomId;

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

  const route = getRoute("detect_support_patterns");
  const modelId = getModelId(route.model_tier);

  const window = time_window ?? 10;
  if (student_filter && !rosterScope.allowedAliases.has(student_filter)) {
    throw new RouteError(400, {
      error: "student_filter is not in this classroom roster",
      category: "validation",
      retryable: false,
      detail_code: "student_filter_not_in_roster",
    });
  }
  const patternInput: SupportPatternsInput = {
    classroom_id,
    student_filter,
    time_window: window,
  };

  let patternCtx = "";
  const citations: RetrievalCitation[] = [];
  const seenInterventionIds = new Set<string>();
  try {
    patternCtx = buildPatternContext(classroom_id, student_filter, window, rosterScope);
    // Mirror buildPatternContext's retrievals so the response trace matches
    // what was actually injected into the prompt.
    const interventions = filterRosterScoped(
      student_filter
        ? getStudentInterventions(classroom_id, student_filter, window)
        : getRelevantInterventions(classroom_id, {
          limit: window,
          candidateLimit: Math.max(window * 4, 20),
          query: "support pattern follow up transition confidence independence scaffold",
          rosterScope,
        }),
      rosterScope,
    );
    for (const record of interventions) {
      if (seenInterventionIds.has(record.record_id)) continue;
      seenInterventionIds.add(record.record_id);
      citations.push(interventionCitation(record));
    }
    for (const plan of filterRosterScoped(getRecentPlans(classroom_id, 5), rosterScope)) {
      citations.push(planCitation(plan));
    }
    for (const record of filterRosterScoped(getFollowUpPending(classroom_id), rosterScope)) {
      if (seenInterventionIds.has(record.record_id)) continue;
      seenInterventionIds.add(record.record_id);
      citations.push(interventionCitation(record));
    }
  } catch (memErr) {
    console.warn("Memory retrieval failed (patterns):", memErr);
  }
  const retrievalTrace = buildRetrievalTrace(citations);

  const prompt = buildSupportPatternsPrompt(classroom, patternInput, patternCtx);

  const inferenceOptions = {
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
    abortSignal,
  };
  const useBufferedStreamFallback = Boolean(emit) && shouldUseBufferedHostedStreamFallback();
  if (useBufferedStreamFallback && emit) {
    await emit({ type: "thinking", text: "Analyzing classroom records without live token streaming." });
  }
  const inferenceData = emit && !useBufferedStreamFallback
    ? await callInferenceStream(inferenceOptions, emit)
    : await callInference(inferenceOptions);

  let report: SupportPatternReport;
  try {
    report = parseSupportPatternsResponse(
      inferenceData.text,
      classroom_id,
      patternInput,
    );
  } catch (parseErr) {
    throw new RouteError(422, {
      error: "Failed to parse model output as support pattern report",
      category: "inference",
      retryable: false,
      detail_code: "model_output_parse_failed",
    }, {
      raw_output: inferenceData.text,
      parse_error: parseErr instanceof Error ? parseErr.message : String(parseErr),
    });
  }

  // Persist pattern report to classroom memory
  try {
    savePatternReport(classroom_id, report, inferenceData.model_id || modelId);
  } catch (memErr) {
    console.warn("Memory save failed (pattern report):", memErr);
  }

  return {
    report,
    thinking_summary: maybeExposeThinkingSummary(inferenceData.thinking_text),
    retrieval_trace: retrievalTrace,
    ...inferenceResponseMeta(inferenceData, modelId),
  };
}

export function createSupportPatternsRouter(deps: RouteDeps): Router {
  const router = Router();
  // Narrow scopes per route. The mount-level middleware allows the union
  // [teacher, reviewer]; the POST generation path excludes reviewer here.
  const teacherOnly = requireRoles(deps, ["teacher"]);
  const teacherOrReviewer = requireRoles(deps, ["teacher", "reviewer"]);

  router.post("/", teacherOnly, validateBody(SupportPatternsRequestSchema), async (req, res) => {
    try {
      res.json(await buildSupportPatternsPayload(deps, req, res));
    } catch (err) {
      console.error("Support patterns error:", err);
      handleRouteError(res, err);
    }
  });

  router.post("/stream", teacherOnly, validateBody(SupportPatternsRequestSchema), (req, res) => {
    const streamId = createStreamJob(req, res);
    res.status(202).json({
      stream_id: streamId,
      stream_url: `/api/support-patterns/stream/${streamId}/events`,
    });
  });

  router.get("/stream/:streamId/events", attachStreamJobRequest, teacherOnly, async (req, res) => {
    try {
      const abortSignal = getStreamAbortSignal(res);
      openSse(res);
      sendSse(res, "ready", { stream_id: req.params.streamId });
      const payload = await buildSupportPatternsPayload(
        deps,
        req,
        res,
        (event) => sendSse(res, event.type, { text: event.text }),
        abortSignal,
      );
      sendSse(res, "complete", payload);
    } catch (err) {
      console.error("Support patterns stream error:", err);
      if (res.headersSent) {
        sendSseError(res, err);
      } else {
        handleRouteError(res, err);
      }
    } finally {
      if (!res.writableEnded) res.end();
    }
  });

  // ----- Latest Pattern Report Retrieval -----

  router.get("/latest/:classroomId", deps.authMiddleware, teacherOrReviewer, (req, res) => {
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
      const report = getLatestPatternReport(classroomId);
      if (!report || !isRosterScopedValue(report, rosterScope)) {
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
