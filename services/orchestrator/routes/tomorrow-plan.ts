import { Router } from "express";
import { z } from "zod";
import { getRoute, getModelId } from "../router.js";
import { buildTomorrowPlanPrompt, parseTomorrowPlanResponse } from "../tomorrow-plan.js";
import type { TomorrowPlanInput } from "../tomorrow-plan.js";
import { savePlan } from "../../memory/store.js";
import { getRecentPlans, summarizeRecentPlans, getRecentInterventions, summarizeRecentInterventions, getLatestPatternReport, summarizePatternInsights } from "../../memory/retrieve.js";
import { validateBody, TomorrowPlanRequestSchema } from "../validate.js";
import type { RouteDeps } from "../route-deps.js";
import type { TomorrowPlan } from "../../../packages/shared/schemas/plan.js";
import { callInference } from "../inference-client.js";
import { inferenceResponseMeta } from "../response-meta.js";
import { handleRouteError, sendClassroomNotFound, sendParseError } from "../errors.js";
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

export function createTomorrowPlanRouter(deps: RouteDeps): Router {
  const router = Router();

  router.post("/", validateBody(TomorrowPlanRequestSchema), async (req, res) => {
    try {
      const body = req.body as z.infer<typeof TomorrowPlanRequestSchema>;
      const classroom_id = body.classroom_id as ClassroomId;
      const { teacher_reflection, artifacts, teacher_goal } = body;

      // Load classroom profile
      const classroom = deps.loadClassroom(classroom_id);
      if (!classroom) {
        sendClassroomNotFound(res, classroom_id);
        return;
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

      const inferenceData = await callInference({
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
      });

      // Parse plan from model output
      let plan: TomorrowPlan;
      try {
        const artifactIds = (artifacts ?? []).map((a) => a.artifact_id);
        plan = parseTomorrowPlanResponse(inferenceData.text, classroom_id, artifactIds);
      } catch (parseErr) {
        sendParseError(res, "Failed to parse model output as tomorrow plan", inferenceData.text, parseErr);
        return;
      }

      res.json({
        plan,
        thinking_summary: maybeExposeThinkingSummary(inferenceData.thinking_text),
        pattern_informed: patternInformed,
        retrieval_trace: retrievalTrace,
        ...inferenceResponseMeta(inferenceData, modelId),
      });

      // Persist plan to classroom memory
      try {
        savePlan(classroom_id, plan, teacher_reflection, inferenceData.model_id || modelId);
      } catch (memErr) {
        console.warn("Memory save failed (plan):", memErr);
      }
    } catch (err) {
      console.error("Tomorrow plan error:", err);
      handleRouteError(res, err);
    }
  });

  return router;
}
