import { Router, type Request, type Response } from "express";
import { getRoute, getModelId } from "../router.js";
import { buildSurvivalPacketPrompt, parseSurvivalPacketResponse } from "../survival-packet.js";
import type { SurvivalPacketInput } from "../survival-packet.js";
import { saveSurvivalPacket } from "../../memory/store.js";
import {
  buildSurvivalContext,
  getRecentPlans,
  getRecentInterventions,
  getLatestPatternReport,
  getRecentFamilyMessages,
  getLatestForecast,
} from "../../memory/retrieve.js";
import { validateBody, SurvivalPacketRequestSchema } from "../validate.js";
import { requireRoles, type RouteDeps } from "../route-deps.js";
import type { SurvivalPacket } from "../../../packages/shared/schemas/survival-packet.js";
import { callInference, callInferenceStream, type InferenceStreamEmitter } from "../inference-client.js";
import { inferenceResponseMeta } from "../response-meta.js";
import { handleRouteError, RouteError } from "../errors.js";
import { maybeExposeThinkingSummary } from "../thinking-summary.js";
import {
  buildRetrievalTrace,
  planCitation,
  interventionCitation,
  patternReportCitation,
  familyMessageCitation,
  forecastCitation,
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

async function buildSurvivalPacketPayload(
  deps: RouteDeps,
  req: Request,
  res: Response,
  emit?: InferenceStreamEmitter,
  abortSignal?: AbortSignal,
) {
  const { classroom_id, target_date, teacher_notes } = req.body;

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

  // Check sub_ready gate
  if (!classroom.sub_ready) {
    throw new RouteError(403, {
      error: "Survival packet generation requires sub_ready to be enabled for this classroom",
      category: "validation",
      retryable: false,
      detail_code: "survival_packet_sub_ready_required",
    }, {
      hint: "Set sub_ready: true in the classroom profile or use PUT /api/classrooms/:id/schedule",
    });
  }

  const route = getRoute("generate_survival_packet");
  const modelId = getModelId(route.model_tier);

  // Build comprehensive retrieval context
  const survivalContext = buildSurvivalContext(classroom_id, classroom, rosterScope);

  // Mirror the records buildSurvivalContext pulls so the response trace
  // matches what was actually injected into the prompt.
  const citations: RetrievalCitation[] = [];
  try {
    for (const plan of filterRosterScoped(getRecentPlans(classroom_id, 1), rosterScope)) {
      citations.push(planCitation(plan));
    }
    for (const record of filterRosterScoped(getRecentInterventions(classroom_id, 10), rosterScope)) {
      citations.push(interventionCitation(record));
    }
    const latestPattern = getLatestPatternReport(classroom_id);
    if (latestPattern && isRosterScopedValue(latestPattern, rosterScope)) citations.push(patternReportCitation(latestPattern));
    for (const { draft } of getRecentFamilyMessages(classroom_id, 10).filter(({ draft }) => isRosterScopedValue(draft, rosterScope))) {
      citations.push(familyMessageCitation(draft));
    }
    const latestForecast = getLatestForecast(classroom_id);
    if (latestForecast && isRosterScopedValue(latestForecast, rosterScope)) citations.push(forecastCitation(latestForecast));
  } catch (memErr) {
    console.warn("Memory retrieval failed (survival packet citations):", memErr);
  }
  const retrievalTrace = buildRetrievalTrace(citations);

  const input: SurvivalPacketInput = { classroom_id, target_date, teacher_notes };
  const prompt = buildSurvivalPacketPrompt(classroom, input, survivalContext);

  const inferenceOptions = {
    deps,
    req,
    res,
    route,
    prompt,
    maxTokens: 8192,
    mockContext: {
      classroom_id,
      target_date,
      teacher_notes,
    },
    safetyScanSource: { classroom_id, target_date, teacher_notes, survivalContext },
    abortSignal,
  };
  const inferenceData = emit
    ? await callInferenceStream(inferenceOptions, emit)
    : await callInference(inferenceOptions);

  let packet: SurvivalPacket;
  try {
    const allowedAliases = classroom.students.map((student) => student.alias).filter(Boolean);
    const knownStudentAliases = deps.loadClassrooms().flatMap((profile) =>
      profile.students.map((student) => student.alias).filter(Boolean),
    );
    packet = parseSurvivalPacketResponse(
      inferenceData.text,
      classroom_id,
      target_date,
      allowedAliases,
      knownStudentAliases,
    );
  } catch (parseErr) {
    throw new RouteError(422, {
      error: "Failed to parse model output as survival packet",
      category: "inference",
      retryable: false,
      detail_code: "model_output_parse_failed",
    }, {
      raw_output: inferenceData.text,
      parse_error: parseErr instanceof Error ? parseErr.message : String(parseErr),
    });
  }

  saveSurvivalPacket(classroom_id, packet, inferenceData.model_id ?? modelId);

  return {
    packet,
    thinking_summary: maybeExposeThinkingSummary(inferenceData.thinking_text),
    retrieval_trace: retrievalTrace,
    ...inferenceResponseMeta(inferenceData, modelId),
  };
}

export function createSurvivalPacketRouter(deps: RouteDeps): Router {
  const router = Router();
  const teacherOnly = requireRoles(deps, ["teacher"]);

  router.post("/", validateBody(SurvivalPacketRequestSchema), async (req, res) => {
    try {
      res.json(await buildSurvivalPacketPayload(deps, req, res));
    } catch (err) {
      console.error("Survival packet generation failed:", err);
      handleRouteError(res, err, "Survival packet generation failed");
    }
  });

  router.post("/stream", validateBody(SurvivalPacketRequestSchema), (req, res) => {
    const streamId = createStreamJob(req, res);
    res.status(202).json({
      stream_id: streamId,
      stream_url: `/api/survival-packet/stream/${streamId}/events`,
    });
  });

  router.get("/stream/:streamId/events", attachStreamJobRequest, teacherOnly, async (req, res) => {
    try {
      const abortSignal = getStreamAbortSignal(res);
      openSse(res);
      sendSse(res, "ready", { stream_id: req.params.streamId });
      const payload = await buildSurvivalPacketPayload(
        deps,
        req,
        res,
        (event) => sendSse(res, event.type, { text: event.text }),
        abortSignal,
      );
      sendSse(res, "complete", payload);
    } catch (err) {
      console.error("Survival packet stream error:", err);
      if (res.headersSent) {
        sendSseError(res, err);
      } else {
        handleRouteError(res, err, "Survival packet generation failed");
      }
    } finally {
      if (!res.writableEnded) res.end();
    }
  });

  return router;
}
