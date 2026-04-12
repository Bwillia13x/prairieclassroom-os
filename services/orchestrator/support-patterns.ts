// services/orchestrator/support-patterns.ts
import type { ClassroomProfile } from "../../packages/shared/schemas/classroom.js";
import type { SupportPatternReport } from "../../packages/shared/schemas/pattern.js";
import { renderPromptInput, withPromptSafetyNotice } from "./prompt-safety.js";

export interface SupportPatternsPrompt {
  system: string;
  user: string;
}

export interface SupportPatternsInput {
  classroom_id: string;
  student_filter?: string;
  time_window: number;
}

export function buildSupportPatternsPrompt(
  classroom: ClassroomProfile,
  input: SupportPatternsInput,
  patternContext: string,
): SupportPatternsPrompt {
  const rosterAliases = classroom.students.map((student) => student.alias).filter(Boolean);
  const rosterLine = rosterAliases.length > 0 ? rosterAliases.join(", ") : "(no aliases provided)";
  const system = withPromptSafetyNotice(`You are PrairieClassroom OS, a classroom memory assistant for Alberta K–6 teachers.

Your task: Analyze the teacher's intervention records, support plans, and follow-up history to identify patterns that deserve the teacher's attention. You are reflecting the teacher's OWN documentation back to them — you are not diagnosing, scoring, or labeling students.

OUTPUT FORMAT: Respond with a single JSON object containing these fields:

- "recurring_themes": array of patterns the teacher has documented repeatedly. Each has:
  - "theme": short description of the pattern
  - "student_refs": which students this pattern involves
  - "evidence_count": how many records show this pattern
  - "example_observations": 1-2 direct quotes from the teacher's records

- "follow_up_gaps": array of interventions marked as needing follow-up with no subsequent record addressing them. Each has:
  - "original_record_id": the record ID
  - "student_refs": which students
  - "observation": what was noted
  - "days_since": approximate days since the record

- "positive_trends": array of evidence that support is working. Each has:
  - "student_ref": which student
  - "description": what improved
  - "evidence": 1-2 quotes from records showing the improvement

- "suggested_focus": array of where to direct attention next. Each has:
  - "student_ref": which student
  - "reason": why they need focus, citing specific records
  - "suggested_action": concrete next step
  - "priority": "high", "medium", or "low"

CRITICAL SAFETY RULES:
- Use observation language ONLY: "Your records show...", "You've documented...", "Based on your notes..."
- NEVER diagnose or imply diagnosis of any condition (ADHD, autism, anxiety, learning disability, etc.)
- NEVER use clinical, medical, or disciplinary language
- NEVER assign behavioral risk scores or rankings
- NEVER present model inference as fact — attribute everything to the teacher's own documentation
- NEVER include student real names — use aliases only
- ONLY use student aliases that appear in the classroom roster provided below
- NEVER borrow or reuse aliases from another classroom, prior example, or generic pattern
- If an observation does not clearly map to one of the provided aliases, omit the alias rather than guessing
- If records are insufficient to identify patterns, say so honestly rather than fabricating patterns

Output only the JSON object, no markdown fencing or commentary.`);

  const studentLine = input.student_filter
    ? `Filtering for student: ${input.student_filter}`
    : "Analyzing all students in this classroom";

  const user = `CLASSROOM:
ID: ${classroom.classroom_id}
Grade: ${classroom.grade_band}
Subject focus: ${classroom.subject_focus}
Roster aliases: ${rosterLine}

${studentLine}
Time window: last ${input.time_window} records

${renderPromptInput(patternContext, "pattern_context", "(no retrieval context available)")}

Analyze these records and identify support patterns. Return a JSON object.`;

  return { system, user };
}

export function parseSupportPatternsResponse(
  raw: string,
  classroomId: string,
  input: SupportPatternsInput,
): SupportPatternReport {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }

  const parsed = JSON.parse(cleaned);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Expected JSON object for support pattern report");
  }

  const p = parsed as Record<string, unknown>;
  const reportId = `pat-${classroomId}-${Date.now()}`;

  return {
    report_id: reportId,
    classroom_id: classroomId,
    student_filter: input.student_filter ?? null,
    time_window: input.time_window,
    recurring_themes: Array.isArray(p.recurring_themes) ? p.recurring_themes : [],
    follow_up_gaps: Array.isArray(p.follow_up_gaps) ? p.follow_up_gaps : [],
    positive_trends: Array.isArray(p.positive_trends) ? p.positive_trends : [],
    suggested_focus: Array.isArray(p.suggested_focus) ? p.suggested_focus : [],
    generated_at: new Date().toISOString(),
    schema_version: "0.1.0",
  };
}
