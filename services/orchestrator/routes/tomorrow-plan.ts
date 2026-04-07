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

export function createTomorrowPlanRouter(deps: RouteDeps): Router {
  const router = Router();

  router.post("/", validateBody(TomorrowPlanRequestSchema), async (req, res) => {
    try {
      const { classroom_id, teacher_reflection, artifacts, teacher_goal } = req.body as z.infer<typeof TomorrowPlanRequestSchema>;

      // Load classroom profile
      const classroom = deps.loadClassroom(classroom_id);
      if (!classroom) {
        res.status(404).json({ error: `Classroom '${classroom_id}' not found` });
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

      // Call inference service
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

      // Parse plan from model output
      let plan: TomorrowPlan;
      try {
        const artifactIds = (artifacts ?? []).map((a) => a.artifact_id);
        plan = parseTomorrowPlanResponse(inferenceData.text, classroom_id, artifactIds);
      } catch (parseErr) {
        res.status(422).json({
          error: "Failed to parse model output as tomorrow plan",
          raw_output: inferenceData.text,
          parse_error: parseErr instanceof Error ? parseErr.message : String(parseErr),
        });
        return;
      }

      res.json({
        plan,
        thinking_summary: inferenceData.thinking_text ?? null,
        pattern_informed: patternInformed,
        model_id: inferenceData.model_id || modelId,
        latency_ms: inferenceData.latency_ms,
      });

      // Persist plan to classroom memory
      try {
        savePlan(classroom_id, plan, teacher_reflection, inferenceData.model_id || modelId);
      } catch (memErr) {
        console.warn("Memory save failed (plan):", memErr);
      }
    } catch (err) {
      console.error("Tomorrow plan error:", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Internal server error",
      });
    }
  });

  return router;
}
