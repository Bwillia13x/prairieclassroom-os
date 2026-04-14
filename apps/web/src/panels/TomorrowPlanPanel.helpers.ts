import type { TomorrowPlan } from "../types";

/**
 * Serialize a TomorrowPlan to a human-readable plain text dump suitable for
 * printing or copying to the clipboard.
 */
export function serializePlanToPlainText(plan: TomorrowPlan): string {
  const lines: string[] = [];

  lines.push("# Tomorrow's Plan");
  lines.push("");

  // Transition watchpoints
  lines.push("## Transition Watchpoints");
  if (plan.transition_watchpoints.length === 0) {
    lines.push("(none)");
  } else {
    for (const w of plan.transition_watchpoints) {
      lines.push(`- ${w.time_or_activity}: ${w.risk_description}`);
      lines.push(`  Mitigation: ${w.suggested_mitigation}`);
    }
  }
  lines.push("");

  // Support priorities
  lines.push("## Support Priorities");
  if (plan.support_priorities.length === 0) {
    lines.push("(none)");
  } else {
    for (const p of plan.support_priorities) {
      lines.push(`- ${p.student_ref}: ${p.reason}`);
      lines.push(`  Action: ${p.suggested_action}`);
    }
  }
  lines.push("");

  // EA actions
  lines.push("## EA Actions");
  if (plan.ea_actions.length === 0) {
    lines.push("(none)");
  } else {
    for (const a of plan.ea_actions) {
      const students = a.student_refs.join(", ");
      lines.push(`- [${a.timing}] ${a.description} (students: ${students})`);
    }
  }
  lines.push("");

  // Prep checklist
  lines.push("## Prep Checklist");
  if (plan.prep_checklist.length === 0) {
    lines.push("(none)");
  } else {
    for (const item of plan.prep_checklist) {
      lines.push(`- ${item}`);
    }
  }
  lines.push("");

  // Family followups
  lines.push("## Family Follow-ups");
  if (plan.family_followups.length === 0) {
    lines.push("(none)");
  } else {
    for (const f of plan.family_followups) {
      lines.push(`- ${f.student_ref}: ${f.reason} (${f.message_type})`);
    }
  }

  return lines.join("\n");
}

/**
 * Serialize a TomorrowPlan to a concise EA briefing summary string suitable for
 * pasting into Slack or email.
 */
export function serializePlanToEABriefingSummary(plan: TomorrowPlan): string {
  const count = plan.ea_actions.length;
  const lines: string[] = [];

  lines.push(`Tomorrow's EA actions (${count}):`);

  if (count === 0) {
    lines.push("No EA actions planned.");
  } else {
    const topActions = plan.ea_actions.slice(0, 5);
    for (const a of topActions) {
      const students = a.student_refs.join(", ");
      lines.push(`- [${a.timing}] ${a.description} (${students})`);
    }
    if (count > 5) {
      lines.push(`...and ${count - 5} more`);
    }
  }

  return lines.join("\n");
}
