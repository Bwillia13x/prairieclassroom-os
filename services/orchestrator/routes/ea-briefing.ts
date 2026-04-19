import { Router } from "express";
import { getRoute, getModelId } from "../router.js";
import { buildEABriefingPrompt, parseEABriefingResponse } from "../ea-briefing.js";
import type { EABriefingInput } from "../ea-briefing.js";
import {
  buildEABriefingContext,
  getRecentPlans,
  getRecentInterventions,
  getFollowUpPending,
  getLatestPatternReport,
} from "../../memory/retrieve.js";
import { validateBody, EABriefingRequestSchema } from "../validate.js";
import type { RouteDeps } from "../route-deps.js";
import type { EABriefing } from "../../../packages/shared/schemas/briefing.js";
import { callInference } from "../inference-client.js";
import { inferenceResponseMeta } from "../response-meta.js";
import { handleRouteError, sendClassroomNotFound, sendParseError } from "../errors.js";
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

export function createEABriefingRouter(deps: RouteDeps): Router {
  const router = Router();

  router.post("/", validateBody(EABriefingRequestSchema), async (req, res) => {
    try {
      const { classroom_id, ea_name, coordination_notes } = req.body;

      const classroom = deps.loadClassroom(classroom_id);
      if (!classroom) {
        sendClassroomNotFound(res, classroom_id);
        return;
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
        // Mirror the records buildEABriefingContext pulls so the response trace
        // matches what was actually injected into the prompt.
        for (const plan of filterRosterScoped(getRecentPlans(classroom_id, 1), rosterScope)) {
          citations.push(planCitation(plan));
        }
        for (const record of filterRosterScoped(getFollowUpPending(classroom_id), rosterScope).slice(0, 5)) {
          if (seenInterventionIds.has(record.record_id)) continue;
          seenInterventionIds.add(record.record_id);
          citations.push(interventionCitation(record));
        }
        for (const record of filterRosterScoped(getRecentInterventions(classroom_id, 5), rosterScope)) {
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

      const inferenceData = await callInference({
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
      });

      let briefing: EABriefing;
      try {
        briefing = parseEABriefingResponse(
          inferenceData.text,
          classroom_id,
          classroom.students.map((student) => student.alias),
        );
      } catch (parseErr) {
        sendParseError(res, "Failed to parse model output as EA briefing", inferenceData.text, parseErr);
        return;
      }

      // No persistence — briefings are ephemeral synthesis views

      res.json({
        briefing,
        retrieval_trace: retrievalTrace,
        ...inferenceResponseMeta(inferenceData, modelId),
      });
    } catch (err) {
      console.error("EA briefing error:", err);
      handleRouteError(res, err);
    }
  });

  return router;
}
