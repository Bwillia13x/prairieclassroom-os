// services/memory/retrieve.ts
import { getDb } from "./db.js";
import type { TomorrowPlan } from "../../packages/shared/schemas/plan.js";
import type { InterventionRecord } from "../../packages/shared/schemas/intervention.js";
import type { SupportPatternReport } from "../../packages/shared/schemas/pattern.js";

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

export function getRecentInterventions(classroomId: string, limit = 5): InterventionRecord[] {
  const db = getDb(classroomId);
  const rows = db.prepare(`
    SELECT record_json FROM interventions
    WHERE classroom_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(classroomId, limit) as { record_json: string }[];

  return rows.map((r) => JSON.parse(r.record_json) as InterventionRecord);
}

export function summarizeRecentInterventions(records: InterventionRecord[]): string {
  if (records.length === 0) return "";

  const lines: string[] = ["Recent interventions:"];

  for (const rec of records.slice(0, 5)) {
    const students = rec.student_refs.join(", ");
    const outcome = rec.outcome ? ` (outcome: ${rec.outcome})` : "";
    lines.push(`  - ${students}: ${rec.observation} -> ${rec.action_taken}${outcome}`);
  }

  return lines.join("\n");
}

export function getStudentInterventions(
  classroomId: string,
  studentRef: string,
  limit = 10,
): InterventionRecord[] {
  const db = getDb(classroomId);
  const rows = db.prepare(`
    SELECT record_json FROM interventions
    WHERE classroom_id = ?
      AND EXISTS (
        SELECT 1 FROM json_each(student_refs) WHERE json_each.value = ?
      )
    ORDER BY created_at DESC
    LIMIT ?
  `).all(classroomId, studentRef, limit) as { record_json: string }[];

  return rows.map((r) => JSON.parse(r.record_json) as InterventionRecord);
}

export function getFollowUpPending(classroomId: string): InterventionRecord[] {
  const db = getDb(classroomId);
  const rows = db.prepare(`
    SELECT record_json FROM interventions
    WHERE classroom_id = ?
      AND json_extract(record_json, '$.follow_up_needed') = 1
    ORDER BY created_at DESC
    LIMIT 20
  `).all(classroomId) as { record_json: string }[];

  return rows.map((r) => JSON.parse(r.record_json) as InterventionRecord);
}

export function buildPatternContext(
  classroomId: string,
  studentRef?: string,
  windowSize = 10,
): string {
  const lines: string[] = [];

  const interventions = studentRef
    ? getStudentInterventions(classroomId, studentRef, windowSize)
    : getRecentInterventions(classroomId, windowSize);

  if (interventions.length > 0) {
    lines.push("INTERVENTION RECORDS:");
    for (const rec of interventions) {
      const students = rec.student_refs.join(", ");
      const followUp = rec.follow_up_needed ? " [FOLLOW-UP NEEDED]" : "";
      lines.push(
        `  - [${rec.record_id}] ${students}: ${rec.observation} -> ${rec.action_taken}` +
          (rec.outcome ? ` (outcome: ${rec.outcome})` : "") +
          followUp,
      );
    }
  }

  const plans = getRecentPlans(classroomId, 5);
  if (plans.length > 0) {
    lines.push("");
    lines.push("RECENT PLAN SUPPORT PRIORITIES:");
    for (const plan of plans) {
      for (const sp of plan.support_priorities) {
        if (!studentRef || sp.student_ref === studentRef) {
          lines.push(
            `  - ${sp.student_ref}: ${sp.reason} (action: ${sp.suggested_action})`,
          );
        }
      }
    }
  }

  const pending = getFollowUpPending(classroomId);
  if (pending.length > 0) {
    lines.push("");
    lines.push("PENDING FOLLOW-UPS (follow_up_needed = true):");
    for (const rec of pending) {
      if (!studentRef || rec.student_refs.includes(studentRef)) {
        lines.push(
          `  - [${rec.record_id}] ${rec.student_refs.join(", ")}: ${rec.observation}`,
        );
      }
    }
  }

  return lines.join("\n");
}

export function getLatestPatternReport(
  classroomId: string,
): SupportPatternReport | null {
  const db = getDb(classroomId);
  const row = db.prepare(`
    SELECT report_json FROM pattern_reports
    WHERE classroom_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(classroomId) as { report_json: string } | undefined;

  return row ? (JSON.parse(row.report_json) as SupportPatternReport) : null;
}

export function buildEABriefingContext(classroomId: string): string {
  const lines: string[] = [];

  // Pull EA actions from the most recent plan
  const plans = getRecentPlans(classroomId, 1);
  if (plans.length > 0) {
    const plan = plans[0];
    lines.push("TODAY'S PLAN — EA ACTIONS:");
    for (const ea of plan.ea_actions) {
      const students = ea.student_refs.length > 0 ? ` (${ea.student_refs.join(", ")})` : "";
      lines.push(`  - [${ea.timing}]${students}: ${ea.description}`);
    }

    if (plan.support_priorities.length > 0) {
      lines.push("");
      lines.push("TODAY'S PLAN — SUPPORT PRIORITIES:");
      for (const sp of plan.support_priorities) {
        lines.push(`  - ${sp.student_ref}: ${sp.reason} → ${sp.suggested_action}`);
      }
    }

    if (plan.prep_checklist.length > 0) {
      lines.push("");
      lines.push("PREP CHECKLIST:");
      for (const item of plan.prep_checklist) {
        lines.push(`  - ${item}`);
      }
    }
  }

  // Pull recent interventions, prioritizing follow-up-needed
  const pending = getFollowUpPending(classroomId);
  if (pending.length > 0) {
    lines.push("");
    lines.push("PENDING FOLLOW-UPS (from recent interventions):");
    for (const rec of pending.slice(0, 5)) {
      lines.push(
        `  - ${rec.student_refs.join(", ")}: ${rec.observation} → ${rec.action_taken}`,
      );
    }
  }

  const recent = getRecentInterventions(classroomId, 5);
  if (recent.length > 0) {
    lines.push("");
    lines.push("RECENT INTERVENTIONS:");
    for (const rec of recent) {
      const outcome = rec.outcome ? ` (outcome: ${rec.outcome})` : "";
      lines.push(
        `  - ${rec.student_refs.join(", ")}: ${rec.observation} → ${rec.action_taken}${outcome}`,
      );
    }
  }

  // Pull pattern insights if available
  const report = getLatestPatternReport(classroomId);
  if (report) {
    const highFocus = report.suggested_focus.filter((f) => f.priority === "high");
    if (highFocus.length > 0) {
      lines.push("");
      lines.push("PATTERN INSIGHTS — HIGH-PRIORITY FOCUS:");
      for (const f of highFocus) {
        lines.push(`  - ${f.student_ref}: ${f.reason} → ${f.suggested_action}`);
      }
    }

    if (report.positive_trends.length > 0) {
      lines.push("");
      lines.push("POSITIVE TRENDS (from teacher's records):");
      for (const t of report.positive_trends) {
        lines.push(`  - ${t.student_ref}: ${t.description}`);
      }
    }
  }

  return lines.join("\n");
}

export function summarizePatternInsights(report: SupportPatternReport): string {
  const lines: string[] = [];

  // High-priority focus items first — these most directly inform the plan
  const highFocus = report.suggested_focus.filter((f) => f.priority === "high");
  const otherFocus = report.suggested_focus.filter((f) => f.priority !== "high");

  if (highFocus.length > 0) {
    lines.push("HIGH-PRIORITY FOCUS (from your pattern review):");
    for (const f of highFocus) {
      lines.push(
        `  - ${f.student_ref}: ${f.reason} → Suggested: ${f.suggested_action}`,
      );
    }
  }

  if (report.recurring_themes.length > 0) {
    lines.push("");
    lines.push("RECURRING THEMES your records show:");
    for (const t of report.recurring_themes) {
      lines.push(
        `  - ${t.theme} (${t.student_refs.join(", ")}, ${t.evidence_count} records)`,
      );
    }
  }

  if (report.follow_up_gaps.length > 0) {
    lines.push("");
    lines.push("PENDING FOLLOW-UPS (no subsequent record):");
    for (const g of report.follow_up_gaps) {
      lines.push(
        `  - ${g.student_refs.join(", ")}: ${g.observation} (${g.days_since} days ago)`,
      );
    }
  }

  if (report.positive_trends.length > 0) {
    lines.push("");
    lines.push("POSITIVE TRENDS your records show:");
    for (const t of report.positive_trends) {
      lines.push(`  - ${t.student_ref}: ${t.description}`);
    }
  }

  if (otherFocus.length > 0) {
    lines.push("");
    lines.push("ADDITIONAL FOCUS AREAS:");
    for (const f of otherFocus) {
      lines.push(
        `  - ${f.student_ref} (${f.priority}): ${f.reason}`,
      );
    }
  }

  return lines.join("\n");
}
