import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { getRoute, getModelId } from "../router.js";
import { buildTomorrowPlanPrompt, parseTomorrowPlanResponse } from "../tomorrow-plan.js";
import { TomorrowPlanSchema } from "../../../packages/shared/schemas/plan.js";
import { validateParsedResponse } from "../validate-parsed-response.js";
import type { TomorrowPlanInput } from "../tomorrow-plan.js";
import { savePlan } from "../../memory/store.js";
import { getRecentPlans, summarizeRecentPlans, getRecentInterventions, summarizeRecentInterventions, getLatestPatternReport, summarizePatternInsights } from "../../memory/retrieve.js";
import { validateBody, TomorrowPlanRequestSchema } from "../validate.js";
import { requireRoles, type RouteDeps } from "../route-deps.js";
import type { TomorrowPlan } from "../../../packages/shared/schemas/plan.js";
import { callInference, callInferenceStream, type InferenceStreamEmitter } from "../inference-client.js";
import { inferenceResponseMeta } from "../response-meta.js";
import { handleRouteError, RouteError } from "../errors.js";
import { maybeExposeThinkingSummary } from "../thinking-summary.js";
import type { ClassroomId } from "../../../packages/shared/schemas/branded.js";
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

async function buildTomorrowPlanPayload(
  deps: RouteDeps,
  req: Request,
  res: Response,
  emit?: InferenceStreamEmitter,
  abortSignal?: AbortSignal,
) {
  const body = req.body as z.infer<typeof TomorrowPlanRequestSchema>;
  const classroom_id = body.classroom_id as ClassroomId;
  const { teacher_reflection, artifacts, teacher_goal } = body;

  // Load classroom profile
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

  // Get route config (planning tier, thinking enabled)
  const route = getRoute("prepare_tomorrow_plan");
  const modelId = getModelId(route.model_tier);

  // Retrieval trace — collect citations as we pull memory so the response
  // payload can answer "did the system actually read my classroom memory?"
  const citations: RetrievalCitation[] = [];

  // Retrieve recent plans for memory injection
  let memorySummary = "";
  try {
    const recentPlans = filterRosterScoped(getRecentPlans(classroom_id, 3), rosterScope);
    memorySummary = summarizeRecentPlans(recentPlans);
    for (const plan of recentPlans) citations.push(planCitation(plan));
  } catch (memErr) {
    console.warn("Memory retrieval failed (plans):", memErr);
  }

  // Retrieve recent interventions for memory injection
  let interventionSummary = "";
  try {
    const recentInterventions = filterRosterScoped(getRecentInterventions(classroom_id, 5), rosterScope);
    interventionSummary = summarizeRecentInterventions(recentInterventions);
    for (const record of recentInterventions) citations.push(interventionCitation(record));
  } catch (memErr) {
    console.warn("Memory retrieval failed (interventions):", memErr);
  }

  // Retrieve latest pattern report for pattern-informed planning
  let patternInsightsSummary = "";
  let patternInformed = false;
  try {
    const latestPattern = getLatestPatternReport(classroom_id);
    if (latestPattern && isRosterScopedValue(latestPattern, rosterScope)) {
      patternInsightsSummary = summarizePatternInsights(latestPattern);
      patternInformed = true;
      citations.push(patternReportCitation(latestPattern));
    }
  } catch (memErr) {
    console.warn("Memory retrieval failed (patterns):", memErr);
  }

  const retrievalTrace = buildRetrievalTrace(citations);

  // Build prompt
  const planInput: TomorrowPlanInput = {
    classroom_id,
    teacher_reflection,
    artifacts,
    teacher_goal,
  };
  const prompt = buildTomorrowPlanPrompt(classroom, planInput, memorySummary, interventionSummary, patternInsightsSummary || undefined);

  const inferenceOptions = {
    deps,
    req,
    res,
    route,
    prompt,
    maxTokens: 4096,
    mockContext: { classroom_id },
    safetyScanSource: {
      teacher_reflection,
      teacher_goal,
      artifacts,
      memorySummary,
      interventionSummary,
      patternInsightsSummary,
    },
    abortSignal,
  };
  const inferenceData = emit
    ? await callInferenceStream(inferenceOptions, emit)
    : await callInference(inferenceOptions);

  // Parse plan from model output
  let plan: TomorrowPlan;
  try {
    const artifactIds = (artifacts ?? []).map((a) => a.artifact_id);
    const coerced = parseTomorrowPlanResponse(inferenceData.text, classroom_id, artifactIds);
    plan = validateParsedResponse(
      TomorrowPlanSchema,
      coerced,
      { promptClass: "prepare_tomorrow_plan", rawText: inferenceData.text },
    );
  } catch (parseErr) {
    throw new RouteError(422, {
      error: "Failed to parse model output as tomorrow plan",
      category: "inference",
      retryable: false,
      detail_code: "model_output_parse_failed",
    }, {
      raw_output: inferenceData.text,
      parse_error: parseErr instanceof Error ? parseErr.message : String(parseErr),
    });
  }

  // Persist plan to classroom memory
  try {
    savePlan(classroom_id, plan, teacher_reflection, inferenceData.model_id || modelId);
  } catch (memErr) {
    console.warn("Memory save failed (plan):", memErr);
  }

  return {
    plan,
    thinking_summary: maybeExposeThinkingSummary(inferenceData.thinking_text),
    pattern_informed: patternInformed,
    retrieval_trace: retrievalTrace,
    ...inferenceResponseMeta(inferenceData, modelId),
  };
}

export function createTomorrowPlanRouter(deps: RouteDeps): Router {
  const router = Router();
  const teacherOnly = requireRoles(deps, ["teacher"]);

  router.post("/", validateBody(TomorrowPlanRequestSchema), async (req, res) => {
    try {
      const payload = await buildTomorrowPlanPayload(deps, req, res);
      if (payload) res.json(payload);
    } catch (err) {
      console.error("Tomorrow plan error:", err);
      handleRouteError(res, err);
    }
  });

  router.post("/stream", validateBody(TomorrowPlanRequestSchema), (req, res) => {
    const streamId = createStreamJob(req, res);
    res.status(202).json({
      stream_id: streamId,
      stream_url: `/api/tomorrow-plan/stream/${streamId}/events`,
    });
  });

  router.get("/stream/:streamId/events", attachStreamJobRequest, teacherOnly, async (req, res) => {
    try {
      const abortSignal = getStreamAbortSignal(res);
      openSse(res);
      sendSse(res, "ready", { stream_id: req.params.streamId });
      const payload = await buildTomorrowPlanPayload(
        deps,
        req,
        res,
        (event) => sendSse(res, event.type, { text: event.text }),
        abortSignal,
      );
      if (payload) sendSse(res, "complete", payload);
    } catch (err) {
      console.error("Tomorrow plan stream error:", err);
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
