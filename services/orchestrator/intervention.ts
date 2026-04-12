// services/orchestrator/intervention.ts
import type { ClassroomProfile } from "../../packages/shared/schemas/classroom.js";
import type { InterventionRecord } from "../../packages/shared/schemas/intervention.js";
import { renderPromptInput, withPromptSafetyNotice } from "./prompt-safety.js";

export interface InterventionPrompt {
  system: string;
  user: string;
}

export interface InterventionInput {
  classroom_id: string;
  student_refs: string[];
  teacher_note: string;
  context?: string;
}

export function buildInterventionPrompt(
  classroom: ClassroomProfile,
  input: InterventionInput,
): InterventionPrompt {
  const system = withPromptSafetyNotice(`You are PrairieClassroom OS, a classroom documentation assistant for Alberta K–6 teachers.

Your task: Structure a teacher's intervention note into a clear, factual record. The teacher has described what they observed and what they did. Extract the structured fields from their note.

OUTPUT FORMAT: Respond with a single JSON object containing these fields:
- "observation": what the teacher noticed (factual description of student behavior or need)
- "action_taken": what the teacher or EA did in response
- "outcome": what resulted, if the teacher mentioned it (omit if not mentioned)
- "follow_up_needed": boolean — true if the teacher indicates this needs continued attention

RULES:
- Use the teacher's own language where possible. Do not embellish or infer beyond what was stated.
- Distinguish observations from inferences. Record what was seen, not what was assumed.
- Use student aliases only, never real names.
- Do not diagnose or imply diagnosis of any condition.
- Do not use clinical, medical, or disciplinary language.
- Do not assign risk scores or behavioral ratings.
- Keep each field concise (1–3 sentences).
- Output only the JSON object, no markdown fencing or commentary.`);

  const studentContext = input.student_refs
    .map((ref) => {
      const student = classroom.students.find((s) => s.alias === ref);
      if (!student) return `  - ${ref}: (no profile found)`;
      return `  - ${student.alias}: ${student.eal_flag ? "EAL" : "non-EAL"}, tags=[${student.support_tags.join(", ")}], scaffolds=[${student.known_successful_scaffolds.join(", ")}]`;
    })
    .join("\n");

  const user = `CLASSROOM CONTEXT:
Grade: ${classroom.grade_band}
Subject focus: ${classroom.subject_focus}

STUDENT(S):
${studentContext}
${input.context ? `\nCONTEXT FROM PLAN:\n${renderPromptInput(input.context, "plan_context")}` : ""}

TEACHER'S NOTE:
${renderPromptInput(input.teacher_note, "teacher_note")}

Structure this intervention note as a JSON object.`;

  return { system, user };
}

export function parseInterventionResponse(
  raw: string,
  classroomId: string,
  input: InterventionInput,
): InterventionRecord {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }

  const parsed = JSON.parse(cleaned);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Expected JSON object for intervention record");
  }

  const p = parsed as Record<string, unknown>;
  const recordId = `int-${classroomId}-${Date.now()}`;

  return {
    record_id: recordId,
    classroom_id: classroomId,
    student_refs: input.student_refs,
    observation: String(p.observation ?? ""),
    action_taken: String(p.action_taken ?? ""),
    outcome: p.outcome ? String(p.outcome) : undefined,
    follow_up_needed: Boolean(p.follow_up_needed ?? false),
    created_at: new Date().toISOString(),
    schema_version: "0.1.0",
  };
}
