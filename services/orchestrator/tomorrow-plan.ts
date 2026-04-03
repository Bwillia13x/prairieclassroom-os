/**
 * PrairieClassroom OS — Tomorrow Plan Prompt Builder
 *
 * Constructs the system prompt and user prompt for the
 * prepare_tomorrow_plan route. This is the versioned
 * prompt contract for Sprint 2.
 *
 * Uses the planning model tier with thinking mode enabled.
 */

import type { ClassroomProfile } from "../../packages/shared/schemas/classroom.js";
import type { LessonArtifact } from "../../packages/shared/schemas/artifact.js";
import type {
  TomorrowPlan,
  TransitionWatchpoint,
  SupportPriority,
  EAAction,
  FamilyFollowup,
} from "../../packages/shared/schemas/plan.js";

export interface TomorrowPlanPrompt {
  system: string;
  user: string;
}

export interface TomorrowPlanInput {
  classroom_id: string;
  teacher_reflection: string;
  artifacts?: LessonArtifact[];
  teacher_goal?: string;
}

export function buildTomorrowPlanPrompt(
  classroom: ClassroomProfile,
  input: TomorrowPlanInput,
): TomorrowPlanPrompt {
  const system = `You are PrairieClassroom OS, a classroom planning assistant for Alberta K–6 teachers.

Your task: Given today's teacher reflection, classroom context, and any lesson artifacts, produce a structured next-day support plan.

OUTPUT FORMAT: Respond with a single JSON object containing these fields:

1. "transition_watchpoints" — array of objects, each with:
   - "time_or_activity": when the transition happens
   - "risk_description": what might go wrong and why
   - "suggested_mitigation": specific, actionable strategy

2. "support_priorities" — array of objects, each with:
   - "student_ref": student alias
   - "reason": why this student needs priority support tomorrow
   - "suggested_action": specific action for the teacher or EA

3. "ea_actions" — array of objects, each with:
   - "description": what the EA should do
   - "student_refs": array of student aliases involved
   - "timing": when during the day

4. "prep_checklist" — array of strings: things the teacher should prepare tonight or before school

5. "family_followups" — array of objects, each with:
   - "student_ref": student alias
   - "reason": why a family message is warranted
   - "message_type": one of "routine_update", "missed_work", "praise", "low_stakes_concern"

RULES:
- Base your plan on the specific students, routines, and constraints described.
- Be concrete and actionable — no generic advice.
- Use student aliases only, never real names.
- Do not diagnose conditions. Do not assign risk scores. Do not suggest disciplinary actions.
- Distinguish observations from inferences.
- Output only the JSON object, no markdown fencing or commentary.`;

  const classroomContext = [
    `Grade: ${classroom.grade_band}`,
    `Subject focus: ${classroom.subject_focus}`,
    "",
    "Classroom notes:",
    ...classroom.classroom_notes.map((n) => `  - ${n}`),
    "",
    "Routines:",
    ...Object.entries(classroom.routines ?? {}).map(([k, v]) => `  - ${k}: ${v}`),
    "",
    ...(classroom.support_constraints?.length
      ? ["Support constraints:", ...classroom.support_constraints.map((c) => `  - ${c}`), ""]
      : []),
    "Students:",
    ...classroom.students.map(
      (s) =>
        `  - ${s.alias}: ${s.eal_flag ? "EAL" : "non-EAL"}, tags=[${s.support_tags.join(", ")}], scaffolds=[${s.known_successful_scaffolds.join(", ")}]${s.communication_notes?.length ? `, comms=[${s.communication_notes.join(", ")}]` : ""}`
    ),
  ].join("\n");

  const artifactContext = input.artifacts?.length
    ? input.artifacts
        .map((a) => `  - "${a.title}" (${a.subject}): ${a.raw_text?.slice(0, 200) ?? "(no text)"}`)
        .join("\n")
    : "  (no specific artifacts for tomorrow)";

  const user = `CLASSROOM CONTEXT:
${classroomContext}

TODAY'S TEACHER REFLECTION:
${input.teacher_reflection}

TOMORROW'S ARTIFACTS/MATERIALS:
${artifactContext}
${input.teacher_goal ? `\nTEACHER GOAL FOR TOMORROW: ${input.teacher_goal}` : ""}

Produce a structured tomorrow plan as a JSON object.`;

  return { system, user };
}

/**
 * Parse the model's raw text output into a TomorrowPlan object.
 * Handles common model quirks (markdown fencing, trailing text).
 */
export function parseTomorrowPlanResponse(
  raw: string,
  classroomId: string,
  sourceArtifactIds: string[],
): TomorrowPlan {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }

  const parsed = JSON.parse(cleaned);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Expected JSON object for tomorrow plan");
  }

  const p = parsed as Record<string, unknown>;

  // Validate and type transition watchpoints
  const watchpoints: TransitionWatchpoint[] = Array.isArray(p.transition_watchpoints)
    ? (p.transition_watchpoints as Record<string, unknown>[]).map((w) => ({
        time_or_activity: String(w.time_or_activity ?? ""),
        risk_description: String(w.risk_description ?? ""),
        suggested_mitigation: String(w.suggested_mitigation ?? ""),
      }))
    : [];

  // Validate and type support priorities
  const priorities: SupportPriority[] = Array.isArray(p.support_priorities)
    ? (p.support_priorities as Record<string, unknown>[]).map((s) => ({
        student_ref: String(s.student_ref ?? ""),
        reason: String(s.reason ?? ""),
        suggested_action: String(s.suggested_action ?? ""),
      }))
    : [];

  // Validate and type EA actions
  const eaActions: EAAction[] = Array.isArray(p.ea_actions)
    ? (p.ea_actions as Record<string, unknown>[]).map((e) => ({
        description: String(e.description ?? ""),
        student_refs: Array.isArray(e.student_refs) ? e.student_refs.map(String) : [],
        timing: String(e.timing ?? ""),
      }))
    : [];

  // Validate prep checklist
  const prepChecklist: string[] = Array.isArray(p.prep_checklist)
    ? p.prep_checklist.map(String)
    : [];

  // Validate family followups
  const followups: FamilyFollowup[] = Array.isArray(p.family_followups)
    ? (p.family_followups as Record<string, unknown>[]).map((f) => ({
        student_ref: String(f.student_ref ?? ""),
        reason: String(f.reason ?? ""),
        message_type: String(f.message_type ?? "routine_update"),
      }))
    : [];

  // Generate plan ID
  const planId = `plan-${classroomId}-${Date.now()}`;

  return {
    plan_id: planId,
    classroom_id: classroomId,
    source_artifact_ids: sourceArtifactIds,
    transition_watchpoints: watchpoints,
    support_priorities: priorities,
    ea_actions: eaActions,
    prep_checklist: prepChecklist,
    family_followups: followups,
    schema_version: "0.1.0",
  };
}
