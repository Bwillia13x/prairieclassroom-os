// services/orchestrator/survival-packet.ts
/**
 * PrairieClassroom OS — Substitute Survival Packet Prompt Builder
 *
 * Constructs system/user prompts for the generate_survival_packet route.
 * Uses the planning model tier with thinking mode enabled.
 * Requires the most comprehensive retrieval of any prompt class.
 */

import type { ClassroomProfile } from "../../packages/shared/schemas/classroom.js";
import type {
  SurvivalPacket,
  RoutineEntry,
  StudentSupportEntry,
  SimplifiedDayPlan,
  FamilyCommsEntry,
  ComplexityPeak,
} from "../../packages/shared/schemas/survival-packet.js";

export interface SurvivalPacketPrompt {
  system: string;
  user: string;
}

export interface SurvivalPacketInput {
  classroom_id: string;
  target_date: string;
  teacher_notes?: string;
}

export function buildSurvivalPacketPrompt(
  classroom: ClassroomProfile,
  input: SurvivalPacketInput,
  survivalContext: string,
): SurvivalPacketPrompt {
  const system = `You are PrairieClassroom OS, generating a Substitute Teacher Survival Packet for an Alberta K-6 classroom.

Your task: Synthesize the classroom schedule, student profiles, active support plans, recent interventions, family communication status, and complexity data into a structured briefing that a substitute teacher can use to manage the classroom effectively for the day.

OUTPUT FORMAT: Respond with a single JSON object containing these fields:

1. "routines" - array of daily routine entries, each with:
   - "time_or_label": time slot or label (e.g. "Morning", "8:30-9:15", "Post-lunch")
   - "description": what happens and how
   - "recent_changes": any modifications from the past week (optional, include ONLY if there was a change)

2. "student_support" - array of students with active support needs, each with:
   - "student_ref": student alias
   - "current_scaffolds": array of scaffolds currently in use
   - "key_strategies": 1-2 sentences on what works best for this student right now
   - "things_to_avoid": what NOT to do (optional, include only if important)

3. "ea_coordination" - single object with:
   - "ea_name": EA's name if known (optional)
   - "schedule_summary": when the EA arrives, departs, and any breaks
   - "primary_students": array of student aliases the EA primarily supports
   - "if_ea_absent": what to do if the EA doesn't show up

4. "simplified_day_plan" - array of time blocks with substitute-friendly instructions, each with:
   - "time_slot": the time range
   - "activity": what to teach/facilitate
   - "sub_instructions": specific, actionable instructions for the substitute (use pre-made materials where possible, simplify complex activities)
   - "materials_location": where to find materials (optional)

5. "family_comms" - array of family communication entries, each with:
   - "student_ref": student alias
   - "status": one of "do_not_contact", "defer_to_teacher", "routine_ok", "expecting_message"
   - "language_preference": family's preferred language (optional)
   - "notes": brief explanation of the status

6. "complexity_peaks" - array of time blocks that need extra attention, each with:
   - "time_slot": the time range
   - "level": one of "low", "medium", "high"
   - "reason": why this block is complex
   - "mitigation": specific strategy to manage the complexity

7. "heads_up" - array of 3-5 short strings with the most important things the substitute should know that don't fit elsewhere

RULES:
- IMPORTANT: If the provided context includes recent intervention follow-ups, pending family communications, or unresolved action items, you MUST reference them in the relevant sections (student_support, family_comms, heads_up). Do not omit follow-up context.
- This is a SURVIVAL document — prioritize actionable, concrete guidance over comprehensive context.
- Write for someone who has NEVER been in this classroom. Assume zero prior knowledge.
- Use student aliases only. Never use real names.
- For "simplified_day_plan", simplify complex activities. If the teacher had a group rotation, suggest whole-class instead. If materials are pre-prepared, say where they are.
- For "family_comms", err toward "defer_to_teacher" for sensitive situations.
- Do not diagnose conditions, assign risk scores, or use clinical language.
- Use observational language: "Records show..." not "This student has..."
- Do not expose raw intervention records — synthesize into operational guidance.
- The substitute should finish reading this and feel PREPARED, not overwhelmed.
- Output only the JSON object, no markdown fencing or commentary.

FORBIDDEN TERMS (never use these):
diagnosis, disorder, deficit, syndrome, spectrum, pathology, clinical, prognosis, regression, at-risk, risk score, behavioral issue, learning disability, cognitive delay, developmental`;

  const user = `CLASSROOM: ${classroom.classroom_id} (${classroom.grade_band}, ${classroom.subject_focus})

${survivalContext}${input.teacher_notes ? `\nTEACHER NOTES FOR SUBSTITUTE: ${input.teacher_notes}` : ""}

TARGET DATE: ${input.target_date}

Generate the Substitute Teacher Survival Packet as a JSON object.`;

  return { system, user };
}

/**
 * Parse the model's raw text output into a SurvivalPacket object.
 */
export function parseSurvivalPacketResponse(
  raw: string,
  classroomId: string,
  targetDate: string,
): SurvivalPacket {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }
  // Robust extraction: find the JSON object boundaries
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  const parsed = JSON.parse(cleaned);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Expected JSON object for survival packet");
  }

  const p = parsed as Record<string, unknown>;

  const routines: RoutineEntry[] = Array.isArray(p.routines)
    ? (p.routines as Record<string, unknown>[]).map((r) => ({
        time_or_label: String(r.time_or_label ?? ""),
        description: String(r.description ?? ""),
        ...(r.recent_changes ? { recent_changes: String(r.recent_changes) } : {}),
      }))
    : [];

  const studentSupport: StudentSupportEntry[] = Array.isArray(p.student_support)
    ? (p.student_support as Record<string, unknown>[]).map((s) => ({
        student_ref: String(s.student_ref ?? ""),
        current_scaffolds: Array.isArray(s.current_scaffolds) ? s.current_scaffolds.map(String) : [],
        key_strategies: String(s.key_strategies ?? ""),
        ...(s.things_to_avoid ? { things_to_avoid: String(s.things_to_avoid) } : {}),
      }))
    : [];

  const rawEa = (p.ea_coordination ?? {}) as Record<string, unknown>;
  const eaCoordination = {
    ...(rawEa.ea_name ? { ea_name: String(rawEa.ea_name) } : {}),
    schedule_summary: String(rawEa.schedule_summary ?? ""),
    primary_students: Array.isArray(rawEa.primary_students) ? rawEa.primary_students.map(String) : [],
    if_ea_absent: String(rawEa.if_ea_absent ?? ""),
  };

  const simplifiedDayPlan: SimplifiedDayPlan[] = Array.isArray(p.simplified_day_plan)
    ? (p.simplified_day_plan as Record<string, unknown>[]).map((d) => ({
        time_slot: String(d.time_slot ?? ""),
        activity: String(d.activity ?? ""),
        sub_instructions: String(d.sub_instructions ?? ""),
        ...(d.materials_location ? { materials_location: String(d.materials_location) } : {}),
      }))
    : [];

  const validStatuses = new Set(["do_not_contact", "defer_to_teacher", "routine_ok", "expecting_message"]);
  const familyComms: FamilyCommsEntry[] = Array.isArray(p.family_comms)
    ? (p.family_comms as Record<string, unknown>[]).map((f) => ({
        student_ref: String(f.student_ref ?? ""),
        status: validStatuses.has(String(f.status))
          ? (String(f.status) as FamilyCommsEntry["status"])
          : "defer_to_teacher",
        ...(f.language_preference ? { language_preference: String(f.language_preference) } : {}),
        notes: String(f.notes ?? ""),
      }))
    : [];

  const validLevels = new Set(["low", "medium", "high"]);
  const complexityPeaks: ComplexityPeak[] = Array.isArray(p.complexity_peaks)
    ? (p.complexity_peaks as Record<string, unknown>[]).map((c) => ({
        time_slot: String(c.time_slot ?? ""),
        level: validLevels.has(String(c.level)) ? (String(c.level) as "low" | "medium" | "high") : "medium",
        reason: String(c.reason ?? ""),
        mitigation: String(c.mitigation ?? ""),
      }))
    : [];

  const headsUp: string[] = Array.isArray(p.heads_up) ? p.heads_up.map(String) : [];

  const packetId = `surv-${classroomId}-${Date.now()}`;

  return {
    packet_id: packetId,
    classroom_id: classroomId,
    generated_for_date: targetDate,
    routines,
    student_support: studentSupport,
    ea_coordination: eaCoordination,
    simplified_day_plan: simplifiedDayPlan,
    family_comms: familyComms,
    complexity_peaks: complexityPeaks,
    heads_up: headsUp,
    schema_version: "0.1.0",
  };
}
