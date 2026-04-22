import { Router } from "express";
import { getRoute, getModelId } from "../router.js";
import { buildInterventionPrompt, parseInterventionResponse } from "../intervention.js";
import { InterventionRecordSchema } from "../../../packages/shared/schemas/intervention.js";
import { validateParsedResponse } from "../validate-parsed-response.js";
import type { InterventionInput } from "../intervention.js";
import { saveIntervention } from "../../memory/store.js";
import { validateBody, InterventionRequestSchema } from "../validate.js";
import type { RouteDeps } from "../route-deps.js";
import type { InterventionRecord } from "../../../packages/shared/schemas/intervention.js";
import { callInference } from "../inference-client.js";
import { inferenceResponseMeta } from "../response-meta.js";
import { handleRouteError, sendClassroomNotFound, sendParseError } from "../errors.js";

/**
 * Deterministic quick-capture record: no model call, no enrichment. The
 * teacher's hallway submission persists as-is and returns in <100ms.
 * Enrichment (action_taken, outcome, follow-up) happens later when the
 * teacher re-submits via the structured-details form on the intervention
 * panel. model_id="deterministic-quick" tags the row in memory so audit +
 * admin tooling can distinguish it from model-enriched rows.
 */
const QUICK_MODEL_ID = "deterministic-quick";

function buildQuickInterventionRecord(
  classroomId: string,
  studentRefs: string[],
  teacherNote: string,
): InterventionRecord {
  return {
    record_id: `int-${classroomId}-${Date.now()}-q`,
    classroom_id: classroomId,
    student_refs: studentRefs,
    observation: teacherNote,
    // Intentionally empty: a placeholder string would read as real content
    // and mislead the EA/reviewer who consumes the record downstream.
    action_taken: "",
    follow_up_needed: false,
    created_at: new Date().toISOString(),
    schema_version: "0.1.0",
  };
}

export function createInterventionRouter(deps: RouteDeps): Router {
  const router = Router();

  router.post("/", validateBody(InterventionRequestSchema), async (req, res) => {
    try {
      const { classroom_id, student_refs, teacher_note, context } = req.body;

      const classroom = deps.loadClassroom(classroom_id);
      if (!classroom) {
        sendClassroomNotFound(res, classroom_id);
        return;
      }

      const route = getRoute("log_intervention");
      const modelId = getModelId(route.model_tier);

      const intInput: InterventionInput = {
        classroom_id,
        student_refs,
        teacher_note,
        context,
      };
      const prompt = buildInterventionPrompt(classroom, intInput);

      const inferenceData = await callInference({
        deps,
        req,
        res,
        route,
        prompt,
        maxTokens: 1024,
        mockContext: {
          classroom_id,
          student_refs,
        },
        safetyScanSource: intInput,
      });

      let record: InterventionRecord;
      try {
        const coerced = parseInterventionResponse(inferenceData.text, classroom_id, intInput);
        record = validateParsedResponse(
          InterventionRecordSchema,
          coerced,
          { promptClass: "log_intervention", rawText: inferenceData.text },
        );
      } catch (parseErr) {
        sendParseError(res, "Failed to parse model output as intervention record", inferenceData.text, parseErr);
        return;
      }

      // Persist to classroom memory
      try {
        saveIntervention(classroom_id, record, inferenceData.model_id || modelId);
      } catch (memErr) {
        console.warn("Memory save failed (intervention):", memErr);
      }

      res.json({
        record,
        ...inferenceResponseMeta(inferenceData, modelId),
      });
    } catch (err) {
      console.error("Intervention logging error:", err);
      handleRouteError(res, err);
    }
  });

  router.post("/quick", validateBody(InterventionRequestSchema), async (req, res) => {
    const startedAt = Date.now();
    try {
      const { classroom_id, student_refs, teacher_note } = req.body;

      const classroom = deps.loadClassroom(classroom_id);
      if (!classroom) {
        sendClassroomNotFound(res, classroom_id);
        return;
      }

      const record = buildQuickInterventionRecord(classroom_id, student_refs, teacher_note);

      // Schema-validate for parity with the model-enriched path so the quick
      // record is indistinguishable at the DB layer.
      const validated = validateParsedResponse(
        InterventionRecordSchema,
        record,
        { promptClass: "log_intervention", rawText: JSON.stringify(record) },
      );

      try {
        saveIntervention(classroom_id, validated, QUICK_MODEL_ID);
      } catch (memErr) {
        console.warn("Memory save failed (intervention quick):", memErr);
      }

      res.json({
        record: validated,
        model_id: QUICK_MODEL_ID,
        latency_ms: Date.now() - startedAt,
      });
    } catch (err) {
      console.error("Intervention quick logging error:", err);
      handleRouteError(res, err);
    }
  });

  return router;
}
