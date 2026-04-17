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

      // Get route config (planning tier, thinking enabled)
      const route = getRoute("prepare_tomorrow_plan");
      const modelId = getModelId(route.model_tier);

      // Retrieve recent plans for memory injection
      let memorySummary = "";
      try {
        const recentPlans = getRecentPlans(classroom_id, 3);
        memorySummary = summarizeRecentPlans(recentPlans);
      } catch (memErr) {
        console.warn("Memory retrieval failed (plans):", memErr);
      }

      // Retrieve recent interventions for memory injection
      let interventionSummary = "";
      try {
        const recentInterventions = getRecentInterventions(classroom_id, 5);
        interventionSummary = summarizeRecentInterventions(recentInterventions);
      } catch (memErr) {
        console.warn("Memory retrieval failed (interventions):", memErr);
      }

      // Retrieve latest pattern report for pattern-informed planning
      let patternInsightsSummary = "";
      let patternInformed = false;
      try {
        const latestPattern = getLatestPatternReport(classroom_id);
        if (latestPattern) {
          patternInsightsSummary = summarizePatternInsights(latestPattern);
          patternInformed = true;
        }
      } catch (memErr) {
        console.warn("Memory retrieval failed (patterns):", memErr);
      }

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
