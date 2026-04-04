// services/memory/retrieve.ts
import { getDb } from "./db.js";
import type { TomorrowPlan } from "../../packages/shared/schemas/plan.js";
import type { InterventionRecord } from "../../packages/shared/schemas/intervention.js";
import type { SupportPatternReport } from "../../packages/shared/schemas/pattern.js";
import type { ComplexityForecast } from "../../packages/shared/schemas/forecast.js";
import type { DebtItem, DebtThresholds, ComplexityDebtRegister } from "../../packages/shared/schemas/debt.js";
import type { ClassroomProfile } from "../../packages/shared/schemas/classroom.js";
import type { ScaffoldDecayReport } from "../../packages/shared/schemas/scaffold-decay.js";

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

export function getLatestForecast(
  classroomId: string,
): ComplexityForecast | null {
  const db = getDb(classroomId);
  const row = db.prepare(`
    SELECT forecast_json FROM complexity_forecasts
    WHERE classroom_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(classroomId) as { forecast_json: string } | undefined;

  return row ? (JSON.parse(row.forecast_json) as ComplexityForecast) : null;
}

export function getInterventionsByTimeBlock(
  classroomId: string,
  limit = 30,
): Map<string, number> {
  const db = getDb(classroomId);
  const rows = db.prepare(`
    SELECT record_json FROM interventions
    WHERE classroom_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(classroomId, limit) as { record_json: string }[];

  const blockCounts = new Map<string, number>();
  for (const row of rows) {
    const record = JSON.parse(row.record_json) as InterventionRecord;
    // Extract time reference from observation or action if present
    const text = `${record.observation} ${record.action_taken}`;
    // Match common time patterns: "after lunch", "morning", "recess", "math block", etc.
    const timePatterns = [
      "morning", "after lunch", "post-lunch", "recess", "afternoon",
      "math block", "literacy", "transition", "end of day", "bell work",
    ];
    for (const pattern of timePatterns) {
      if (text.toLowerCase().includes(pattern)) {
        blockCounts.set(pattern, (blockCounts.get(pattern) ?? 0) + 1);
      }
    }
  }
  return blockCounts;
}

export function buildForecastContext(classroomId: string): string {
  const lines: string[] = [];

  // Intervention frequency by time-of-day patterns
  const blockCounts = getInterventionsByTimeBlock(classroomId, 30);
  if (blockCounts.size > 0) {
    lines.push("INTERVENTION FREQUENCY BY TIME/CONTEXT (last 30 records):");
    const sorted = [...blockCounts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [block, count] of sorted) {
      lines.push(`  - "${block}": ${count} mentions`);
    }
  }

  // Recent interventions for context
  const recent = getRecentInterventions(classroomId, 5);
  if (recent.length > 0) {
    lines.push("");
    lines.push("MOST RECENT INTERVENTIONS:");
    for (const rec of recent) {
      const students = rec.student_refs.join(", ");
      const outcome = rec.outcome ? ` (outcome: ${rec.outcome})` : "";
      lines.push(`  - ${students}: ${rec.observation} -> ${rec.action_taken}${outcome}`);
    }
  }

  // Latest pattern report highlights
  const pattern = getLatestPatternReport(classroomId);
  if (pattern) {
    const highFocus = pattern.suggested_focus.filter((f) => f.priority === "high");
    if (highFocus.length > 0) {
      lines.push("");
      lines.push("HIGH-PRIORITY PATTERN FOCUS:");
      for (const f of highFocus) {
        lines.push(`  - ${f.student_ref}: ${f.reason}`);
      }
    }
    if (pattern.recurring_themes.length > 0) {
      lines.push("");
      lines.push("RECURRING THEMES:");
      for (const t of pattern.recurring_themes) {
        lines.push(`  - ${t.theme} (${t.student_refs.join(", ")}, ${t.evidence_count} records)`);
      }
    }
  }

  // Pending follow-ups
  const pending = getFollowUpPending(classroomId);
  if (pending.length > 0) {
    lines.push("");
    lines.push("PENDING FOLLOW-UPS:");
    for (const rec of pending.slice(0, 5)) {
      lines.push(`  - ${rec.student_refs.join(", ")}: ${rec.observation}`);
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

export function getStaleFollowUps(
  classroomId: string,
  thresholdDays = 5,
): DebtItem[] {
  const db = getDb(classroomId);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - thresholdDays);
  const cutoffIso = cutoff.toISOString();

  const rows = db.prepare(`
    SELECT record_id, record_json, created_at FROM interventions
    WHERE classroom_id = ?
      AND json_extract(record_json, '$.follow_up_needed') = 1
      AND created_at < ?
    ORDER BY created_at ASC
  `).all(classroomId, cutoffIso) as { record_id: string; record_json: string; created_at: string }[];

  const items: DebtItem[] = [];
  for (const row of rows) {
    const record = JSON.parse(row.record_json) as InterventionRecord;

    const hasFollowUp = db.prepare(`
      SELECT 1 FROM interventions
      WHERE classroom_id = ?
        AND created_at > ?
        AND record_id != ?
        AND EXISTS (
          SELECT 1 FROM json_each(student_refs) AS s1
          WHERE s1.value IN (
            SELECT s2.value FROM json_each(?) AS s2
          )
        )
      LIMIT 1
    `).get(classroomId, row.created_at, row.record_id, JSON.stringify(record.student_refs));

    if (!hasFollowUp) {
      const ageDays = Math.floor(
        (Date.now() - new Date(row.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      items.push({
        category: "stale_followup",
        student_refs: record.student_refs,
        description: `Follow-up needed: "${record.observation}" (${ageDays} days ago)`,
        source_record_id: row.record_id,
        age_days: ageDays,
        suggested_action: `Review and document follow-up for ${record.student_refs.join(", ")}`,
      });
    }
  }
  return items;
}

export function getUnapprovedMessages(
  classroomId: string,
  thresholdDays = 3,
): DebtItem[] {
  const db = getDb(classroomId);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - thresholdDays);
  const cutoffIso = cutoff.toISOString();

  const rows = db.prepare(`
    SELECT draft_id, student_refs, message_json, created_at FROM family_messages
    WHERE classroom_id = ?
      AND teacher_approved = 0
      AND created_at < ?
    ORDER BY created_at ASC
  `).all(classroomId, cutoffIso) as { draft_id: string; student_refs: string; message_json: string; created_at: string }[];

  return rows.map((row) => {
    const studentRefs = JSON.parse(row.student_refs) as string[];
    const ageDays = Math.floor(
      (Date.now() - new Date(row.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      category: "unapproved_message" as const,
      student_refs: studentRefs,
      description: `Family message drafted ${ageDays} days ago, not yet approved`,
      source_record_id: row.draft_id,
      age_days: ageDays,
      suggested_action: `Review and approve or discard the draft message for ${studentRefs.join(", ")}`,
    };
  });
}

export function getUnaddressedPatternInsights(
  classroomId: string,
): DebtItem[] {
  const latestPattern = getLatestPatternReport(classroomId);
  if (!latestPattern) return [];

  const recentPlans = getRecentPlans(classroomId, 5);
  const planStudentRefs = new Set<string>();
  for (const plan of recentPlans) {
    if (plan.plan_id > latestPattern.report_id) {
      for (const sp of plan.support_priorities) {
        planStudentRefs.add(sp.student_ref);
      }
    }
  }

  const items: DebtItem[] = [];
  for (const focus of latestPattern.suggested_focus) {
    if (!planStudentRefs.has(focus.student_ref)) {
      const reportAge = Math.floor(
        (Date.now() - new Date(latestPattern.generated_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      items.push({
        category: "unaddressed_pattern",
        student_refs: [focus.student_ref],
        description: `Pattern insight (${focus.priority}): "${focus.reason}" — no plan action since`,
        source_record_id: latestPattern.report_id,
        age_days: reportAge,
        suggested_action: focus.suggested_action,
      });
    }
  }
  return items;
}

export function getRecurringPlanItems(
  classroomId: string,
  minConsecutive = 3,
): DebtItem[] {
  const plans = getRecentPlans(classroomId, minConsecutive + 2);
  if (plans.length < minConsecutive) return [];

  const streaks = new Map<string, { count: number; reasons: string[] }>();

  const chronological = [...plans].reverse();
  for (const plan of chronological) {
    const currentRefs = new Set(plan.support_priorities.map((sp) => sp.student_ref));

    for (const sp of plan.support_priorities) {
      const existing = streaks.get(sp.student_ref);
      if (existing) {
        existing.count++;
        if (!existing.reasons.includes(sp.reason)) {
          existing.reasons.push(sp.reason);
        }
      } else {
        streaks.set(sp.student_ref, { count: 1, reasons: [sp.reason] });
      }
    }

    for (const [ref, streak] of streaks) {
      if (!currentRefs.has(ref) && streak.count < minConsecutive) {
        streaks.delete(ref);
      }
    }
  }

  const items: DebtItem[] = [];
  for (const [studentRef, streak] of streaks) {
    if (streak.count >= minConsecutive) {
      items.push({
        category: "recurring_plan_item",
        student_refs: [studentRef],
        description: `Support priority for ${studentRef} has appeared in ${streak.count} consecutive plans: ${streak.reasons[0]}`,
        source_record_id: plans[0].plan_id,
        age_days: streak.count,
        suggested_action: `This recurring item may need a different approach or a dedicated conversation with the team`,
      });
    }
  }
  return items;
}

export function getStudentsApproachingReview(
  classroomId: string,
  classroom: ClassroomProfile,
  minRecords = 2,
  windowDays = 14,
): DebtItem[] {
  const db = getDb(classroomId);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);
  const cutoffIso = cutoff.toISOString();

  const items: DebtItem[] = [];

  for (const student of classroom.students) {
    if (student.support_tags.length === 0) continue;

    const count = db.prepare(`
      SELECT COUNT(*) as cnt FROM interventions
      WHERE classroom_id = ?
        AND created_at > ?
        AND EXISTS (
          SELECT 1 FROM json_each(student_refs) WHERE json_each.value = ?
        )
    `).get(classroomId, cutoffIso, student.alias) as { cnt: number };

    if (count.cnt < minRecords) {
      items.push({
        category: "approaching_review",
        student_refs: [student.alias],
        description: `${student.alias} has ${count.cnt} intervention records in the past ${windowDays} days (has ${student.support_tags.length} support tags)`,
        source_record_id: `student-${student.student_id}`,
        age_days: windowDays,
        suggested_action: `Consider logging observations for ${student.alias} to maintain documentation currency`,
      });
    }
  }
  return items;
}

export function buildDebtRegister(
  classroomId: string,
  classroom: ClassroomProfile,
  thresholds?: Partial<DebtThresholds>,
): ComplexityDebtRegister {
  const config: DebtThresholds = {
    stale_followup_days: thresholds?.stale_followup_days ?? 5,
    unapproved_message_days: thresholds?.unapproved_message_days ?? 3,
    recurring_plan_min: thresholds?.recurring_plan_min ?? 3,
    review_window_days: thresholds?.review_window_days ?? 14,
    review_min_records: thresholds?.review_min_records ?? 2,
  };

  const allItems: DebtItem[] = [
    ...getStaleFollowUps(classroomId, config.stale_followup_days),
    ...getUnapprovedMessages(classroomId, config.unapproved_message_days),
    ...getUnaddressedPatternInsights(classroomId),
    ...getRecurringPlanItems(classroomId, config.recurring_plan_min),
    ...getStudentsApproachingReview(classroomId, classroom, config.review_min_records, config.review_window_days),
  ];

  allItems.sort((a, b) => b.age_days - a.age_days);

  const countByCategory: Record<string, number> = {};
  for (const item of allItems) {
    countByCategory[item.category] = (countByCategory[item.category] ?? 0) + 1;
  }

  return {
    register_id: `debt-${classroomId}-${Date.now()}`,
    classroom_id: classroomId,
    items: allItems,
    item_count_by_category: countByCategory,
    generated_at: new Date().toISOString(),
    schema_version: "0.1.0",
  };
}

export function buildScaffoldDecayContext(
  classroomId: string,
  studentRef: string,
  windowSize = 20,
): string {
  const interventions = getStudentInterventions(classroomId, studentRef, windowSize);
  if (interventions.length === 0) return "";

  const midpoint = Math.floor(interventions.length / 2);
  // interventions are newest-first; reverse for chronological
  const chronological = [...interventions].reverse();
  const earlyWindow = chronological.slice(0, midpoint);
  const recentWindow = chronological.slice(midpoint);

  const lines: string[] = [];

  lines.push(`INTERVENTION HISTORY FOR ${studentRef} (${interventions.length} records):`);
  lines.push("");
  lines.push(`EARLY WINDOW (${earlyWindow.length} records):`);
  for (const rec of earlyWindow) {
    lines.push(
      `  - [${rec.record_id}] ${rec.observation} -> ${rec.action_taken}` +
      (rec.outcome ? ` (outcome: ${rec.outcome})` : ""),
    );
  }

  lines.push("");
  lines.push(`RECENT WINDOW (${recentWindow.length} records):`);
  for (const rec of recentWindow) {
    lines.push(
      `  - [${rec.record_id}] ${rec.observation} -> ${rec.action_taken}` +
      (rec.outcome ? ` (outcome: ${rec.outcome})` : ""),
    );
  }

  return lines.join("\n");
}

export function getLatestScaffoldReview(
  classroomId: string,
  studentRef: string,
): ScaffoldDecayReport | null {
  const db = getDb(classroomId);
  const row = db.prepare(`
    SELECT report_json FROM scaffold_reviews
    WHERE classroom_id = ? AND student_ref = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(classroomId, studentRef) as { report_json: string } | undefined;

  return row ? (JSON.parse(row.report_json) as ScaffoldDecayReport) : null;
}
