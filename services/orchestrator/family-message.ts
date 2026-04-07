// services/orchestrator/family-message.ts
import type { ClassroomProfile } from "../../packages/shared/schemas/classroom.js";
import type { FamilyMessageDraft } from "../../packages/shared/schemas/message.js";

export interface FamilyMessagePrompt {
  system: string;
  user: string;
}

export interface FamilyMessageInput {
  classroom_id: string;
  student_refs: string[];
  message_type: "routine_update" | "missed_work" | "praise" | "low_stakes_concern";
  target_language: string;
  context?: string;
}

export function buildFamilyMessagePrompt(
  classroom: ClassroomProfile,
  input: FamilyMessageInput,
): FamilyMessagePrompt {
  const system = `You are PrairieClassroom OS, a family communication assistant for Alberta K–6 teachers.

Your task: Draft a plain-language family message about a student. The teacher will review and approve this message before it is sent.

OUTPUT FORMAT: Respond with a single JSON object containing these fields:
- "student_refs": array of student aliases this message concerns
- "message_type": the type of message (one of: routine_update, missed_work, praise, low_stakes_concern)
- "target_language": the language code for this message
- "plain_language_text": the message body, written in plain language appropriate for families
- "simplified_student_text": a simpler version the student could read (optional — include if appropriate)

RULES:
- Write in plain, warm language. Avoid jargon and education-speak.
- Be specific about what the student did or what happened — no vague praise or generic concerns.
- Use the student's alias only, never real names.
- Do not diagnose or imply diagnosis of any condition.
- Do not use clinical, medical, or disciplinary language.
- Do not suggest the message has been sent — it requires teacher approval first.
- Keep the message brief (3–5 sentences for the main body).
- If target_language is not "en", write the message in that language.
- Distinguish observations from inferences.
- Output only the JSON object, no markdown fencing or commentary.`;

  const studentContext = input.student_refs
    .map((ref) => {
      const student = classroom.students.find((s) => s.alias === ref);
      if (!student) return `  - ${ref}: (no profile found)`;
      return `  - ${student.alias}: ${student.eal_flag ? "EAL" : "non-EAL"}, tags=[${student.support_tags.join(", ")}]${student.communication_notes?.length ? `, comms=[${student.communication_notes.join(", ")}]` : ""}`;
    })
    .join("\n");

  const user = `CLASSROOM CONTEXT:
Grade: ${classroom.grade_band}
Subject focus: ${classroom.subject_focus}

STUDENT(S):
${studentContext}

MESSAGE TYPE: ${input.message_type}
TARGET LANGUAGE: ${input.target_language}
${input.context ? `\nCONTEXT: ${input.context}` : ""}

Draft a family message as a JSON object.`;

  return { system, user };
}

export function parseFamilyMessageResponse(
  raw: string,
  classroomId: string,
  input: FamilyMessageInput,
): FamilyMessageDraft {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }

  const parsed = JSON.parse(cleaned);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Expected JSON object for family message");
  }

  const p = parsed as Record<string, unknown>;
  const draftId = `msg-${classroomId}-${Date.now()}`;

  return {
    draft_id: draftId,
    classroom_id: classroomId,
    student_refs: input.student_refs,
    message_type: input.message_type,
    target_language: input.target_language,
    plain_language_text: String(p.plain_language_text ?? ""),
    simplified_student_text: p.simplified_student_text
      ? String(p.simplified_student_text)
      : undefined,
    teacher_approved: false,
    schema_version: "0.1.0",
  };
}
