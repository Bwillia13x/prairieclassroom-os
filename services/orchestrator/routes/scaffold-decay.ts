import { Router } from "express";
import { getRoute, getModelId } from "../router.js";
import { buildScaffoldDecayPrompt, parseScaffoldDecayResponse } from "../scaffold-decay.js";
import type { ScaffoldDecayInput } from "../scaffold-decay.js";
import { saveScaffoldReview } from "../../memory/store.js";
import { buildScaffoldDecayContext, getLatestScaffoldReview, getStudentInterventions } from "../../memory/retrieve.js";
import { validateBody, ScaffoldDecayRequestSchema } from "../validate.js";
import type { RouteDeps } from "../route-deps.js";
import type { ScaffoldDecayReport } from "../../../packages/shared/schemas/scaffold-decay.js";

export function createScaffoldDecayRouter(deps: RouteDeps): Router {
  const router = Router();

  router.post("/", validateBody(ScaffoldDecayRequestSchema), async (req, res) => {
    try {
      const { classroom_id, student_ref, time_window } = req.body;

      const classroom = deps.loadClassroom(classroom_id);
      if (!classroom) {
        res.status(404).json({ error: `Classroom '${classroom_id}' not found` });
        return;
      }

      // Check minimum record threshold (query student-specific records, not classroom-wide)
      const studentInterventions = getStudentInterventions(classroom_id, student_ref, time_window);
      if (studentInterventions.length < 10) {
        res.json({
          report: null,
          insufficient_records: true,
          record_count: studentInterventions.length,
          message: "Not enough intervention history to detect scaffold usage trends. Continue documenting and try again after more records are logged.",
        });
        return;
      }

      const route = getRoute("detect_scaffold_decay");
      const modelId = getModelId(route.model_tier);

      const decayInput: ScaffoldDecayInput = {
        classroom_id,
        student_ref,
        time_window,
      };

      let decayCtx = "";
      try {
        decayCtx = buildScaffoldDecayContext(classroom_id, student_ref, time_window);
      } catch (memErr) {
        console.warn("Memory retrieval failed (scaffold decay):", memErr);
      }

      const prompt = buildScaffoldDecayPrompt(classroom, decayInput, decayCtx);

      const inferenceResp = await fetch(`${deps.inferenceUrl}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${prompt.system}\n\n${prompt.user}`,
          model_tier: route.model_tier,
          thinking: route.thinking_enabled,
          prompt_class: "detect_scaffold_decay",
          max_tokens: 4096,
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

      let report: ScaffoldDecayReport;
      try {
        report = parseScaffoldDecayResponse(inferenceData.text, classroom_id, student_ref);
      } catch (parseErr) {
        res.status(422).json({
          error: "Failed to parse model output as scaffold decay report",
          raw_output: inferenceData.text,
          parse_error: parseErr instanceof Error ? parseErr.message : String(parseErr),
        });
        return;
      }

      // Persist scaffold review to classroom memory
      try {
        saveScaffoldReview(classroom_id, report, inferenceData.model_id || modelId);
      } catch (memErr) {
        console.warn("Memory save failed (scaffold review):", memErr);
      }

      res.json({
        report,
        thinking_summary: inferenceData.thinking_text ?? null,
        model_id: inferenceData.model_id || modelId,
        latency_ms: inferenceData.latency_ms,
      });
    } catch (err) {
      console.error("Scaffold decay error:", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Internal server error",
      });
    }
  });

  // ----- Latest Scaffold Review Retrieval -----

  router.get("/latest/:classroomId/:studentRef", (req, res) => {
    try {
      const classroomId = req.params.classroomId as string;
      const studentRef = req.params.studentRef as string;
      const review = getLatestScaffoldReview(classroomId, studentRef);
      if (!review) {
        res.json({ review: null });
        return;
      }
      res.json({ review });
    } catch (err) {
      console.error("Scaffold review retrieval error:", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Internal server error",
      });
    }
  });

  return router;
}
