// services/orchestrator/ea-load.ts
/**
 * PrairieClassroom OS — EA Cognitive Load Balancer Prompt Builder
 *
 * Constructs system/user prompts for the balance_ea_load route.
 * Uses the planning model tier with thinking mode enabled.
 *
 * The goal is to surface per-block EA load (low / medium / high / break)
 * for tomorrow's schedule, citing the factors that drive each rating and
 * — where possible — suggesting concrete redistribution moves when several
 * high-load blocks stack without a recovery window.
 *
 * Guardrails: operational framing only. The system never scores EA
 * competence, never compares EAs, and never treats load as a behavioral
 * risk signal for any student.
 */

import type { ClassroomProfile } from "../../packages/shared/schemas/classroom.js";
import type {
  EALoadProfile,
  EALoadBlock,
  EALoadLevel,
} from "../../packages/shared/schemas/ea-load.js";
import { renderPromptInput, withPromptSafetyNotice } from "./prompt-safety.js";

export interface EALoadPrompt {
  system: string;
  user: string;
}

export interface EALoadInput {
  classroom_id: string;
  target_date: string;
  teacher_notes?: string;
}

export function buildEALoadPrompt(
  classroom: ClassroomProfile,
  input: EALoadInput,
  loadContext?: string,
): EALoadPrompt {
  const rosterAliases = classroom.students.map((s) => s.alias).filter(Boolean);
  const rosterLine = rosterAliases.length > 0 ? rosterAliases.join(", ") : "(no aliases provided)";

  const system = withPromptSafetyNotice(`You are PrairieClassroom OS, an Educational Assistant (EA) load balancer for Alberta K-6 inclusive classrooms.

Your task: Given tomorrow's schedule, the students who currently receive EA support, the EA's availability window, and recent intervention history, produce a per-block EA load profile with redistribution suggestions where the sequence of blocks creates sustained high load without a recovery window.

OUTPUT FORMAT: Respond with a single JSON object containing these fields:

1. "blocks" - array of objects, one per schedule block, each with:
   - "time_slot": the time range (e.g. "9:30-10:30")
   - "activity": what happens during this block
   - "ea_available": boolean — whether the EA is scheduled for this block
   - "supported_students": array of student ALIASES the EA is expected to support during this block (empty array if none or EA unavailable)
   - "load_level": one of "low", "medium", "high", or "break"
   - "load_factors": array of short strings explaining WHY this block has its load level (e.g. "3 supported students", "new content for EAL learner", "post-transition block")
   - "redistribution_suggestion": optional single-sentence suggestion ONLY if this block or the surrounding sequence is high-load; otherwise omit

2. "alerts" - array of short strings flagging cross-block concerns (e.g. "90 minutes of continuous high load 9:30-11:00 with no recovery break"). Empty array is valid if there are no concerns.

3. "overall_summary" - 2-3 sentences characterizing tomorrow's load shape for the EA. Reference specific time_slots and student aliases when specific students drive load.

4. "highest_load_block" - the time_slot of the single highest-load block

LOAD FACTORS TO CONSIDER:
- Number of students the EA is supporting in this block
- Support intensity: students who appear repeatedly in recent intervention history imply higher per-student load
- Transition cost: blocks immediately after a difficult transition (per classroom notes or intervention patterns) add load
- Recovery gap: sustained high-load blocks without a break block or lunch in between
- Unfamiliar content for EAL students during language-heavy blocks
- Known post-lunch or post-recess pattern from intervention history

RULES:
- Describe CLASSROOM CONDITIONS AND EA DEMANDS, never EA competence. Say "this sequence creates sustained demand for the EA" not "the EA cannot handle this."
- The system suggests redistributions; the teacher and EA decide. Frame suggestions as "consider moving X" not "you must move X."
- Use only student aliases from the provided classroom roster. Never reuse aliases from another classroom. If a referenced record contains an alias not on the roster, omit it rather than guessing.
- Do not diagnose conditions. Do not assign behavioral-risk scores. Do not suggest disciplinary actions.
- No individual student is a "load driver" in isolation — load arises from the interaction of multiple factors across a sequence of blocks.
- When block has "ea_available": false, "load_level" MUST be "break" (EA is not in the room and therefore has no load). Do not use "break" when the EA is available but a schedule block is structurally a break — use "low" for those.
- If INTERVENTION HISTORY shows patterns, reference them using "your records show" or "based on your documented observations."
- Output only the JSON object, no markdown fencing or commentary.`);

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
        `  - ${s.alias}: ${s.eal_flag ? "EAL" : "non-EAL"}, tags=[${s.support_tags.join(", ")}], scaffolds=[${s.known_successful_scaffolds.join(", ")}]`,
    ),
  ].join("\n");

  const scheduleContext = classroom.schedule?.length
    ? classroom.schedule
        .map((b) => {
          const eaRefs = b.ea_student_refs?.length ? ` ea_supports=[${b.ea_student_refs.join(", ")}]` : "";
          const notes = b.notes ? ` -- ${b.notes}` : "";
          return `  - ${b.time_slot}: ${b.activity} (EA: ${b.ea_available ? "yes" : "no"})${eaRefs}${notes}`;
        })
        .join("\n")
    : "  (no schedule data available - cannot produce EA load profile without a schedule)";

  const eventsContext = classroom.upcoming_events?.length
    ? classroom.upcoming_events
        .map(
          (e) =>
            `  - ${e.description}${e.time_slot ? ` (${e.time_slot})` : ""}${e.impacts ? ` -- ${e.impacts}` : ""}`,
        )
        .join("\n")
    : "  (no upcoming events)";

  const user = `CLASSROOM CONTEXT:
${classroomContext}

ROSTER ALIASES: ${rosterLine}

TOMORROW'S SCHEDULE:
${scheduleContext}

UPCOMING EVENTS:
${eventsContext}
${loadContext ? `\nINTERVENTION HISTORY & PATTERNS:\n${renderPromptInput(loadContext, "ea_load_context")}\n` : ""}${input.teacher_notes ? `\nTEACHER NOTES FOR TOMORROW:\n${renderPromptInput(input.teacher_notes, "teacher_notes")}` : ""}
TARGET DATE: ${input.target_date}

Produce a per-block EA load profile as a JSON object.`;

  return { system, user };
}

/**
 * Parse the model's raw text output into an EALoadProfile object.
 *
 * Mirrors complexity-forecast's parseComplexityForecastResponse defensive
 * shape: strip markdown fencing, coerce level enum, sanitize any alien
 * aliases from another classroom, and fall back sensibly when the model
 * omits a field.
 */
export function parseEALoadResponse(
  raw: string,
  classroomId: string,
  targetDate: string,
  allowedAliases: Iterable<string> = [],
  knownStudentAliases: Iterable<string> = [],
): EALoadProfile {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }

  const parsed = JSON.parse(cleaned);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Expected JSON object for EA load profile");
  }

  const p = parsed as Record<string, unknown>;
  const allowedAliasSet = new Set(Array.from(allowedAliases, String));
  const disallowedAliasSet = new Set(
    Array.from(knownStudentAliases, String).filter((alias) => alias && !allowedAliasSet.has(alias)),
  );

  const sanitizeText = (value: string): string => {
    if (!value || disallowedAliasSet.size === 0) return value;
    let sanitized = value;
    for (const alias of disallowedAliasSet) {
      const pattern = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
      sanitized = sanitized.replace(pattern, "another student");
    }
    return sanitized;
  };
  const sanitizeNarrative = <T>(value: T): T => {
    if (typeof value === "string") return sanitizeText(value) as T;
    if (Array.isArray(value)) return value.map((v) => sanitizeNarrative(v)) as T;
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, sanitizeNarrative(v)]),
      ) as T;
    }
    return value;
  };

  const validLevels: Set<EALoadLevel> = new Set(["low", "medium", "high", "break"]);
  const coerceLevel = (raw: unknown): EALoadLevel => {
    const value = String(raw).toLowerCase();
    return validLevels.has(value as EALoadLevel) ? (value as EALoadLevel) : "medium";
  };

  const rawBlocks = Array.isArray(p.blocks) ? (p.blocks as Record<string, unknown>[]) : [];
  const blocks: EALoadBlock[] = rawBlocks.map((b) => {
    const supported = Array.isArray(b.supported_students)
      ? b.supported_students.map(String).filter((alias) => alias.length > 0)
      : [];
    // Drop aliases that aren't on this classroom's roster to prevent
    // cross-classroom contamination from retrieval.
    const filtered =
      allowedAliasSet.size > 0
        ? supported.filter((alias) => allowedAliasSet.has(alias))
        : supported;
    const eaAvailable = Boolean(b.ea_available);
    const declaredLevel = coerceLevel(b.load_level);
    // Invariant from the prompt: when EA is not available, level is "break".
    const level = eaAvailable ? declaredLevel : "break";
    const block: EALoadBlock = {
      time_slot: String(b.time_slot ?? ""),
      activity: String(b.activity ?? ""),
      ea_available: eaAvailable,
      supported_students: filtered,
      load_level: level,
      load_factors: Array.isArray(b.load_factors) ? b.load_factors.map(String) : [],
    };
    const suggestion = b.redistribution_suggestion;
    if (typeof suggestion === "string" && suggestion.trim().length > 0) {
      block.redistribution_suggestion = suggestion;
    }
    return block;
  });

  const knownSlots = new Set(blocks.map((b) => b.time_slot));
  const rawHighest = String(p.highest_load_block ?? "");
  const highestLoadBlock = knownSlots.has(rawHighest)
    ? rawHighest
    : blocks.find((b) => b.load_level === "high")?.time_slot ?? rawHighest;

  const alerts = Array.isArray(p.alerts) ? (p.alerts as unknown[]).map(String) : [];

  const loadId = `eal-${classroomId}-${Date.now()}`;

  return sanitizeNarrative({
    load_id: loadId,
    classroom_id: classroomId,
    target_date: targetDate,
    blocks,
    alerts,
    overall_summary: String(p.overall_summary ?? ""),
    highest_load_block: highestLoadBlock,
    schema_version: "0.1.0",
  });
}
