// services/memory/retrieve.ts
import { getDb } from "./db.js";
import type { TomorrowPlan } from "../../packages/shared/schemas/plan.js";

export function getRecentPlans(classroomId: string, limit = 5): TomorrowPlan[] {
  const db = getDb(classroomId);
  const rows = db.prepare(`
    SELECT plan_json FROM generated_plans
    WHERE classroom_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(classroomId, limit) as { plan_json: string }[];

  return rows.map((r) => JSON.parse(r.plan_json) as TomorrowPlan);
}

export function summarizeRecentPlans(plans: TomorrowPlan[]): string {
  if (plans.length === 0) return "";

  const lines: string[] = ["Recent classroom history:"];

  for (const plan of plans.slice(0, 3)) {
    lines.push("");
    lines.push(`Previous plan (${plan.plan_id}):`);

    if (plan.support_priorities.length > 0) {
      lines.push(
        "  Priority students: " +
          plan.support_priorities
            .map((p) => `${p.student_ref} (${p.reason})`)
            .join("; "),
      );
    }

    if (plan.transition_watchpoints.length > 0) {
      lines.push(
        "  Watchpoints: " +
          plan.transition_watchpoints
            .map((w) => `${w.time_or_activity}: ${w.risk_description}`)
            .join("; "),
      );
    }

    if (plan.ea_actions.length > 0) {
      lines.push(
        "  EA actions taken: " +
          plan.ea_actions.map((a) => a.description).join("; "),
      );
    }

    if (plan.family_followups.length > 0) {
      lines.push(
        "  Family followups: " +
          plan.family_followups
            .map((f) => `${f.student_ref} (${f.message_type})`)
            .join("; "),
      );
    }
  }

  return lines.join("\n");
}
