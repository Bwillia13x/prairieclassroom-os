// services/orchestrator/complexity-forecast.ts
/**
 * PrairieClassroom OS — Complexity Forecast Prompt Builder
 *
 * Constructs system/user prompts for the forecast_complexity route.
 * Uses the planning model tier with thinking mode enabled.
 */

import type { ClassroomProfile } from "../../packages/shared/schemas/classroom.js";
import type { ComplexityForecast, ComplexityBlock } from "../../packages/shared/schemas/forecast.js";
import { renderPromptInput, withPromptSafetyNotice } from "./prompt-safety.js";

export interface ComplexityForecastPrompt {
  system: string;
  user: string;
}

export interface ComplexityForecastInput {
  classroom_id: string;
  forecast_date: string;
  teacher_notes?: string;
}

export function buildComplexityForecastPrompt(
  classroom: ClassroomProfile,
  input: ComplexityForecastInput,
  forecastContext?: string,
): ComplexityForecastPrompt {
  const rosterAliases = classroom.students.map((student) => student.alias).filter(Boolean);
  const rosterLine = rosterAliases.length > 0 ? rosterAliases.join(", ") : "(no aliases provided)";
  const system = withPromptSafetyNotice(`You are PrairieClassroom OS, a classroom complexity forecasting assistant for Alberta K-6 teachers.

Your task: Given the classroom schedule, student profiles, EA availability, upcoming events, and intervention history, produce a per-block complexity forecast for the next school day.

OUTPUT FORMAT: Respond with a single JSON object containing these fields:

1. "blocks" - array of objects, one per schedule block, each with:
   - "time_slot": the time range (e.g. "8:30-9:15")
   - "activity": what happens during this block
   - "level": complexity level - one of "low", "medium", "high"
   - "contributing_factors": array of strings explaining WHY this block has its complexity level
   - "suggested_mitigation": one specific, actionable strategy to reduce complexity for this block

2. "overall_summary" - 2-3 sentences summarizing the day's complexity landscape. Reference specific blocks and students by alias.

3. "highest_risk_block" - the time_slot of the single highest-complexity block

COMPLEXITY FACTORS TO CONSIDER:
- EA availability (present vs. absent makes a major difference)
- Number of students needing active support during this block
- Known difficult transitions (from classroom notes and intervention history)
- New or unfamiliar content/activities
- Upcoming events that disrupt routine
- Time-of-day patterns from intervention history (e.g., post-lunch is historically harder)
- Split-grade coordination demands
- EAL student needs during language-heavy blocks

RULES:
- Base your forecast on the specific students, routines, and constraints described.
- Be concrete - reference student aliases when specific students drive complexity.
- Use student aliases only, never real names.
- Use only student aliases from the provided classroom roster.
- Never reuse aliases from another classroom. If a referenced record contains an alias not on the roster, omit it rather than guessing.
- Do not diagnose conditions. Do not assign risk scores. Do not suggest disciplinary actions.
- Complexity describes CLASSROOM CONDITIONS, not student behavior. Say "this block has overlapping demands" not "this block will be chaotic."
- No individual student is a "complexity driver." Complexity arises from the interaction of multiple factors.
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
        `  - ${s.alias}: ${s.eal_flag ? "EAL" : "non-EAL"}, tags=[${s.support_tags.join(", ")}], scaffolds=[${s.known_successful_scaffolds.join(", ")}]${s.communication_notes?.length ? `, comms=[${s.communication_notes.join(", ")}]` : ""}`,
    ),
  ].join("\n");

  const scheduleContext = classroom.schedule?.length
    ? classroom.schedule
        .map(
          (b) =>
            `  - ${b.time_slot}: ${b.activity} (EA: ${b.ea_available ? "yes" : "no"})${b.notes ? ` -- ${b.notes}` : ""}`,
        )
        .join("\n")
    : "  (no schedule data available - infer from routines)";

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
${forecastContext ? `\nINTERVENTION HISTORY & PATTERNS:\n${renderPromptInput(forecastContext, "forecast_context")}\n` : ""}${input.teacher_notes ? `\nTEACHER NOTES FOR TOMORROW:\n${renderPromptInput(input.teacher_notes, "teacher_notes")}` : ""}
FORECAST DATE: ${input.forecast_date}

Produce a per-block complexity forecast as a JSON object.`;

  return { system, user };
}

/**
 * Parse the model's raw text output into a ComplexityForecast object.
 */
export function parseComplexityForecastResponse(
  raw: string,
  classroomId: string,
  forecastDate: string,
  allowedAliases: Iterable<string> = [],
  knownStudentAliases: Iterable<string> = [],
): ComplexityForecast {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }

  const parsed = JSON.parse(cleaned);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Expected JSON object for complexity forecast");
  }

  const p = parsed as Record<string, unknown>;
  const allowedAliasSet = new Set(Array.from(allowedAliases, String));
  const disallowedAliasSet = new Set(
    Array.from(knownStudentAliases, String).filter((alias) => alias && !allowedAliasSet.has(alias)),
  );
  const sanitizeText = (value: string): string => {
    if (!value || disallowedAliasSet.size === 0) {
      return value;
    }

    let sanitized = value;
    for (const alias of disallowedAliasSet) {
      const pattern = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
      sanitized = sanitized.replace(pattern, "another student");
    }
    return sanitized;
  };
  const sanitizeNarrativeValue = <T>(value: T): T => {
    if (typeof value === "string") {
      return sanitizeText(value) as T;
    }
    if (Array.isArray(value)) {
      return value.map((entry) => sanitizeNarrativeValue(entry)) as T;
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([key, child]) => [key, sanitizeNarrativeValue(child)]),
      ) as T;
    }
    return value;
  };

  const validLevels = new Set(["low", "medium", "high"]);

  const blocks: ComplexityBlock[] = Array.isArray(p.blocks)
    ? (p.blocks as Record<string, unknown>[]).map((b) => ({
        time_slot: String(b.time_slot ?? ""),
        activity: String(b.activity ?? ""),
        level: validLevels.has(String(b.level)) ? (String(b.level) as "low" | "medium" | "high") : "medium",
        contributing_factors: Array.isArray(b.contributing_factors)
          ? b.contributing_factors.map(String)
          : [],
        suggested_mitigation: String(b.suggested_mitigation ?? ""),
      }))
    : [];

  const forecastId = `fcst-${classroomId}-${Date.now()}`;

  // Validate highest_risk_block against actual block time_slots
  const knownSlots = new Set(blocks.map((b) => b.time_slot));
  const rawHighest = String(p.highest_risk_block ?? "");
  const highestRiskBlock = knownSlots.has(rawHighest)
    ? rawHighest
    : blocks.find((b) => b.level === "high")?.time_slot ?? rawHighest;

  return sanitizeNarrativeValue({
    forecast_id: forecastId,
    classroom_id: classroomId,
    forecast_date: forecastDate,
    blocks,
    overall_summary: String(p.overall_summary ?? ""),
    highest_risk_block: highestRiskBlock,
    schema_version: "0.1.0",
  });
}
