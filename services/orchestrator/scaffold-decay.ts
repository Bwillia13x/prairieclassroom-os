// services/orchestrator/scaffold-decay.ts
import type { ClassroomProfile } from "../../packages/shared/schemas/classroom.js";
import type {
  ScaffoldDecayReport,
  ScaffoldReview,
  ScaffoldUsageTrend,
  PositiveSignal,
  WithdrawalPhase,
} from "../../packages/shared/schemas/scaffold-decay.js";

export interface ScaffoldDecayPrompt {
  system: string;
  user: string;
}

export interface ScaffoldDecayInput {
  classroom_id: string;
  student_ref: string;
  time_window: number;
}

export function buildScaffoldDecayPrompt(
  classroom: ClassroomProfile,
  input: ScaffoldDecayInput,
  decayContext: string,
): ScaffoldDecayPrompt {
  const student = classroom.students.find((s) => s.alias === input.student_ref);
  const knownScaffolds = student?.known_successful_scaffolds ?? [];

  const system = `You are PrairieClassroom OS, a classroom support analysis assistant for Alberta K-6 teachers.

Your task: Analyze a student's intervention records over time to detect whether any scaffolds (supports, strategies, accommodations) are being used less frequently — a signal that the student may be developing independence in that area. When decay is detected, suggest a phased withdrawal plan.

OUTPUT FORMAT: Respond with a single JSON object containing these fields:

- "reviews": array of scaffold reviews. For each scaffold you identify, include:
  - "scaffold_name": the support strategy (e.g., "visual timer for transitions", "chunked instructions")
  - "usage_trend": object with:
    - "scaffold_name": same as above
    - "early_window_count": how many times this scaffold appears in the early window of records
    - "early_window_total": total records in the early window
    - "recent_window_count": how many times it appears in the recent window
    - "recent_window_total": total records in the recent window
    - "trend": one of "decaying", "stable", "increasing"
  - "positive_signals": array of objects with "description" and "source_record_id" — evidence of success without the scaffold
  - "withdrawal_plan": array of phases, each with "phase_number", "description", "duration_weeks", "success_criteria"
    - ONLY include a withdrawal plan for scaffolds with "decaying" trend AND at least one positive signal
    - Each plan MUST include a regression protocol
  - "regression_protocol": what to do if the student regresses (return to previous phase, hold for N weeks)
  - "confidence": "high" (clear decay + multiple positive signals), "medium" (some decay), or "low" (ambiguous)

- "summary": 2-3 sentences summarizing findings using observational language

CRITICAL RULES:
- Use observational language ONLY: "Your records show...", "Based on your documented observations..."
- NEVER diagnose or imply diagnosis of any condition
- NEVER say a student "no longer needs" a scaffold — say "your records show decreasing use of"
- NEVER imply the scaffold was wrong to begin with — scaffolds served their purpose
- The system SUGGESTS, the teacher DECIDES. Withdrawal plans are never automatic.
- Do not fabricate records. Only reference scaffolds that actually appear in the intervention history.
- If no scaffolds show decay, say so honestly: "No clear decay patterns detected in current records."
- Use student aliases only, never real names.
- No clinical, medical, or disciplinary language.

Output only the JSON object, no markdown fencing or commentary.`;

  const scaffoldLine = knownScaffolds.length > 0
    ? `Known successful scaffolds for ${input.student_ref}: ${knownScaffolds.join(", ")}`
    : `No pre-registered scaffolds for ${input.student_ref} — identify from intervention records`;

  const user = `CLASSROOM:
ID: ${classroom.classroom_id}
Grade: ${classroom.grade_band}

STUDENT: ${input.student_ref}
${scaffoldLine}

${decayContext}

Analyze scaffold usage trends for ${input.student_ref} across ${input.time_window} records. Return a JSON object.`;

  return { system, user };
}

export function parseScaffoldDecayResponse(
  raw: string,
  classroomId: string,
  studentRef: string,
): ScaffoldDecayReport {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }

  const parsed = JSON.parse(cleaned);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Expected JSON object for scaffold decay report");
  }

  const p = parsed as Record<string, unknown>;
  const reportId = `decay-${classroomId}-${studentRef}-${Date.now()}`;

  const validTrends = new Set(["decaying", "stable", "increasing"]);
  const validConfidences = new Set(["high", "medium", "low"]);

  const reviews: ScaffoldReview[] = Array.isArray(p.reviews)
    ? (p.reviews as Record<string, unknown>[]).map((r) => {
        const trend = r.usage_trend as Record<string, unknown> | undefined;
        const trendStr = String(trend?.trend ?? "stable");

        const usageTrend: ScaffoldUsageTrend = {
          scaffold_name: String(trend?.scaffold_name ?? r.scaffold_name ?? ""),
          early_window_count: Number(trend?.early_window_count ?? 0),
          early_window_total: Number(trend?.early_window_total ?? 0),
          recent_window_count: Number(trend?.recent_window_count ?? 0),
          recent_window_total: Number(trend?.recent_window_total ?? 0),
          trend: validTrends.has(trendStr) ? trendStr as "decaying" | "stable" | "increasing" : "stable",
        };

        const positiveSignals: PositiveSignal[] = Array.isArray(r.positive_signals)
          ? (r.positive_signals as Record<string, unknown>[]).map((s) => ({
              description: String(s.description ?? ""),
              source_record_id: String(s.source_record_id ?? ""),
            }))
          : [];

        const withdrawalPlan: WithdrawalPhase[] = Array.isArray(r.withdrawal_plan)
          ? (r.withdrawal_plan as Record<string, unknown>[]).map((w) => ({
              phase_number: Number(w.phase_number ?? 0),
              description: String(w.description ?? ""),
              duration_weeks: Number(w.duration_weeks ?? 2),
              success_criteria: String(w.success_criteria ?? ""),
            }))
          : [];

        const confStr = String(r.confidence ?? "low");

        return {
          scaffold_name: String(r.scaffold_name ?? ""),
          usage_trend: usageTrend,
          positive_signals: positiveSignals,
          withdrawal_plan: withdrawalPlan,
          regression_protocol: String(r.regression_protocol ?? "If regression observed, return to previous phase and hold for 2 additional weeks before retrying."),
          confidence: validConfidences.has(confStr) ? confStr as "high" | "medium" | "low" : "low",
        };
      })
    : [];

  return {
    report_id: reportId,
    classroom_id: classroomId,
    student_ref: studentRef,
    reviews,
    summary: String(p.summary ?? ""),
    generated_at: new Date().toISOString(),
    schema_version: "0.1.0",
  };
}
