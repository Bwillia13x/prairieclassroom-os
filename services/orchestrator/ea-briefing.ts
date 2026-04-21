// services/orchestrator/ea-briefing.ts
import type { EABriefing, ScheduleBlock, StudentWatchItem, PendingFollowup } from "../../packages/shared/schemas/briefing.js";
import type { ClassroomProfile } from "../../packages/shared/schemas/classroom.js";
import { randomUUID } from "node:crypto";
import { renderPromptInput, withPromptSafetyNotice } from "./prompt-safety.js";

export interface EABriefingPrompt {
  system: string;
  user: string;
}

export interface EABriefingInput {
  classroom_id: string;
  ea_name?: string;
  /**
   * Teacher-authored coordination notes for today. Parallels
   * `teacher_notes` on ComplexityForecast: when present, rendered into
   * the user prompt as a dedicated input block. Fully optional; the
   * absence path keeps the prompt text and mock fixtures stable.
   * 2026-04-19 OPS audit (phase 4).
   */
  coordination_notes?: string;
}

export function buildEABriefingPrompt(
  classroom: ClassroomProfile,
  input: EABriefingInput,
  briefingContext: string,
): EABriefingPrompt {
  const eaAddr = input.ea_name ? `, addressed to ${input.ea_name}` : "";
  const rosterAliases = classroom.students.map((student) => student.alias).filter(Boolean);

  const system = withPromptSafetyNotice(`You are PrairieClassroom OS, generating a daily briefing for an educational assistant (EA)${eaAddr}.

Your task: Synthesize the teacher's plan, recent interventions, and pattern insights into a concise, actionable briefing the EA can use to start their day.

OUTPUT FORMAT: Respond with a single JSON object containing these fields:
- "schedule_blocks": array of time-based duty blocks, each with:
  - "time_slot": string (e.g. "10:00–10:20")
  - "student_refs": string array of student aliases
  - "task_description": what the EA should do
  - "materials_needed": string array of materials to prepare
- "student_watch_list": array of students the EA should be aware of, each with:
  - "student_ref": student alias
  - "context_summary": brief context from recent records (1–2 sentences)
  - "suggested_approach": what approach has been working or is recommended
- "pending_followups": array of interventions still needing follow-up, each with:
  - "student_ref": student alias
  - "original_observation": what was documented
  - "days_since": number of days since the observation
  - "suggested_action": what to watch for or do
- "teacher_notes_for_ea": string summarizing the teacher's key priorities for today (2–4 sentences)

RULES:
- Use the teacher's plan and recent records as your only source. Do not invent information.
- Use observational, coordination-focused language: "The teacher's plan notes...", "Recent records show..."
- Never use diagnostic language, clinical terms, or risk scores.
- Never label students with conditions, disorders, or deficits.
- This is a coordination document for an EA, not a student report.
- Keep each field concise and actionable.
- Prefer compact JSON. Limit the response to the highest-signal items only:
  - up to 4 schedule blocks
  - up to 4 student watch-list items
  - up to 4 pending follow-ups
  - teacher notes capped at 3 short sentences
- Use only student aliases from the provided classroom roster.
- Never reuse aliases from another classroom. If a referenced record contains an alias not on the roster, omit it rather than guessing.
- Output only the JSON object, no markdown fencing or commentary.

FORBIDDEN TERMS (never use these):
diagnosis, disorder, deficit, syndrome, spectrum, pathology, clinical, prognosis, regression, at-risk, risk score, behavioral issue, learning disability, cognitive delay, developmental`);

  // Only render the coordination-notes block when the teacher actually
  // supplied text; otherwise keep the prompt identical to pre-phase-4 so
  // existing mock fixtures and snapshot tests stay stable.
  const coordinationNotesBlock = input.coordination_notes?.trim()
    ? `\n\n${renderPromptInput(input.coordination_notes, "teacher_coordination_notes")}`
    : "";

  const user = `CLASSROOM: ${classroom.classroom_id} (${classroom.grade_band}, ${classroom.subject_focus})

ROSTER ALIASES: ${rosterAliases.length > 0 ? rosterAliases.join(", ") : "(none provided)"}

${renderPromptInput(briefingContext, "ea_briefing_context", "(no retrieved coordination context available)")}${coordinationNotesBlock}

Generate the EA daily briefing as a JSON object.`;

  return { system, user };
}

export function parseEABriefingResponse(
  raw: string,
  classroomId: string,
  allowedAliases: Iterable<string> = [],
): EABriefing {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }

  let parsed = JSON.parse(cleaned) as unknown;
  if (
    Array.isArray(parsed)
    && parsed.length === 1
    && typeof parsed[0] === "object"
    && parsed[0] !== null
    && !Array.isArray(parsed[0])
  ) {
    parsed = parsed[0];
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Expected JSON object for EA briefing");
  }

  const p = parsed as Record<string, unknown>;
  const allowedAliasSet = new Set(Array.from(allowedAliases, String));
  const isAllowedAlias = (value: unknown): value is string => {
    if (typeof value !== "string" || !value.trim()) {
      return false;
    }
    if (allowedAliasSet.size === 0) {
      return true;
    }
    return allowedAliasSet.has(value);
  };

  const scheduleBlocks: ScheduleBlock[] = Array.isArray(p.schedule_blocks)
    ? (p.schedule_blocks as Record<string, unknown>[]).map((b) => ({
        time_slot: String(b.time_slot ?? ""),
        student_refs: Array.isArray(b.student_refs) ? b.student_refs.filter(isAllowedAlias).map(String) : [],
        task_description: String(b.task_description ?? ""),
        materials_needed: Array.isArray(b.materials_needed) ? b.materials_needed.map(String) : [],
      })).filter((block) => block.time_slot || block.student_refs.length > 0 || block.task_description || block.materials_needed.length > 0)
    : [];

  const studentWatchList: StudentWatchItem[] = Array.isArray(p.student_watch_list)
    ? (p.student_watch_list as Record<string, unknown>[]).map((w) => ({
        student_ref: String(w.student_ref ?? ""),
        context_summary: String(w.context_summary ?? ""),
        suggested_approach: String(w.suggested_approach ?? ""),
      })).filter((item) => isAllowedAlias(item.student_ref))
    : [];

  const pendingFollowups: PendingFollowup[] = Array.isArray(p.pending_followups)
    ? (p.pending_followups as Record<string, unknown>[]).map((f) => ({
        student_ref: String(f.student_ref ?? ""),
        original_observation: String(f.original_observation ?? ""),
        days_since: Number(f.days_since ?? 0),
        suggested_action: String(f.suggested_action ?? ""),
      })).filter((item) => isAllowedAlias(item.student_ref))
    : [];

  return {
    briefing_id: randomUUID(),
    classroom_id: classroomId,
    date: new Date().toISOString().slice(0, 10),
    schedule_blocks: scheduleBlocks,
    student_watch_list: studentWatchList,
    pending_followups: pendingFollowups,
    teacher_notes_for_ea: String(p.teacher_notes_for_ea ?? ""),
    schema_version: "0.1.0",
  };
}
