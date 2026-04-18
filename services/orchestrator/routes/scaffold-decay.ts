import { Router } from "express";
import { getRoute, getModelId } from "../router.js";
import { buildScaffoldDecayPrompt, parseScaffoldDecayResponse } from "../scaffold-decay.js";
import type { ScaffoldDecayInput } from "../scaffold-decay.js";
import { saveScaffoldReview } from "../../memory/store.js";
import { buildScaffoldDecayContext, getLatestScaffoldReview, getStudentInterventions } from "../../memory/retrieve.js";
import { validateBody, ScaffoldDecayRequestSchema } from "../validate.js";
import { requireRoles, type RouteDeps } from "../route-deps.js";
import type { ScaffoldDecayReport } from "../../../packages/shared/schemas/scaffold-decay.js";
import type { ClassroomId } from "../../../packages/shared/schemas/branded.js";
import { callInference } from "../inference-client.js";
import { inferenceResponseMeta } from "../response-meta.js";
import { handleRouteError, sendClassroomNotFound, sendParseError, sendRouteError } from "../errors.js";
import { maybeExposeThinkingSummary } from "../thinking-summary.js";
import { isValidClassroomId } from "../validate.js";
import { buildRetrievalTrace, interventionCitation } from "../retrieval-trace.js";
import type { RetrievalCitation } from "../../../packages/shared/schemas/retrieval-trace.js";
import { buildRosterScope } from "../../memory/roster-scope.js";

export function createScaffoldDecayRouter(deps: RouteDeps): Router {
  const router = Router();
  // Scaffold decay surfaces student-level withdrawal patterns — teacher-only
  // at both generate and read. Mount-level enforces teacher for POST; the GET
  // needs its own gate because URL params only resolve at the route handler.
  const teacherOnly = requireRoles(deps, ["teacher"]);

  router.post("/", validateBody(ScaffoldDecayRequestSchema), async (req, res) => {
    try {
      const { classroom_id: raw_classroom_id, student_ref, time_window } = req.body;
      const classroom_id = raw_classroom_id as ClassroomId;

      const classroom = deps.loadClassroom(classroom_id);
      if (!classroom) {
        sendClassroomNotFound(res, classroom_id);
        return;
      }
      const rosterScope = buildRosterScope(classroom, deps.loadClassrooms());
      if (!rosterScope.allowedAliases.has(student_ref)) {
        sendRouteError(res, 400, {
          error: "student_ref is not in this classroom roster",
          category: "validation",
          retryable: false,
          detail_code: "student_ref_not_in_roster",
        });
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
      const citations: RetrievalCitation[] = [];
      // Window size matches buildScaffoldDecayContext's default (20) so the
      // citations mirror exactly what gets injected into the prompt, even when
      // the route-level threshold check above used a different (smaller) limit.
      const contextWindow = time_window ?? 20;
      try {
        decayCtx = buildScaffoldDecayContext(classroom_id, student_ref, contextWindow);
        for (const record of getStudentInterventions(classroom_id, student_ref, contextWindow)) {
          citations.push(interventionCitation(record));
        }
      } catch (memErr) {
        console.warn("Memory retrieval failed (scaffold decay):", memErr);
      }
      const retrievalTrace = buildRetrievalTrace(citations);

      const prompt = buildScaffoldDecayPrompt(classroom, decayInput, decayCtx);

      const inferenceData = await callInference({
        deps,
        req,
        res,
        route,
        prompt,
        maxTokens: 4096,
        mockContext: {
          classroom_id,
          student_ref,
          time_window,
        },
        safetyScanSource: { ...decayInput, decayCtx },
      });

      let report: ScaffoldDecayReport;
      try {
        report = parseScaffoldDecayResponse(inferenceData.text, classroom_id, student_ref);
      } catch (parseErr) {
        sendParseError(res, "Failed to parse model output as scaffold decay report", inferenceData.text, parseErr);
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
        thinking_summary: maybeExposeThinkingSummary(inferenceData.thinking_text),
        retrieval_trace: retrievalTrace,
        ...inferenceResponseMeta(inferenceData, modelId),
      });
    } catch (err) {
      console.error("Scaffold decay error:", err);
      handleRouteError(res, err);
    }
  });

  // ----- Latest Scaffold Review Retrieval -----

  router.get("/latest/:classroomId/:studentRef", deps.authMiddleware, teacherOnly, (req, res) => {
    try {
      const rawId = req.params.classroomId as string;
      if (!isValidClassroomId(rawId)) {
        sendRouteError(res, 400, { error: "Invalid classroom ID format", category: "validation", retryable: false, detail_code: "invalid_classroom_id" });
        return;
      }
      const classroomId = rawId as ClassroomId;
      const studentRef = req.params.studentRef as string;
      const classroom = deps.loadClassroom(classroomId);
      if (!classroom) {
        sendClassroomNotFound(res, classroomId);
        return;
      }
      const rosterScope = buildRosterScope(classroom, deps.loadClassrooms());
      if (!rosterScope.allowedAliases.has(studentRef)) {
        sendRouteError(res, 400, { error: "student_ref is not in this classroom roster", category: "validation", retryable: false, detail_code: "student_ref_not_in_roster" });
        return;
      }
      const review = getLatestScaffoldReview(classroomId, studentRef);
      if (!review) {
        res.json({ review: null });
        return;
      }
      res.json({ review });
    } catch (err) {
      console.error("Scaffold review retrieval error:", err);
      handleRouteError(res, err);
    }
  });

  return router;
}
