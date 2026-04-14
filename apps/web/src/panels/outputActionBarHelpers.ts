/**
 * outputActionBarHelpers.ts — Serializers for the remaining five generation panels.
 * Each function produces human-readable plain text or Markdown for copy/download.
 */
import type {
  SupportPatternReport,
  EABriefing,
  ComplexityForecast,
  SurvivalPacket,
  SimplifiedOutput,
  VocabCardSet,
} from "../types";

// ── SupportPatternsPanel ────────────────────────────────────────────────────

export function serializeSupportPatternsToPlainText(report: SupportPatternReport): string {
  const lines: string[] = [];

  lines.push("SUPPORT PATTERN REPORT");
  lines.push(`Generated: ${report.generated_at}`);
  if (report.student_filter) {
    lines.push(`Student filter: ${report.student_filter}`);
  }
  lines.push(`Time window: ${report.time_window} days`);
  lines.push("");

  lines.push("RECURRING THEMES");
  if (report.recurring_themes.length === 0) {
    lines.push("  No recurring themes identified.");
  } else {
    for (const t of report.recurring_themes) {
      lines.push(`  • ${t.theme} (${t.evidence_count} observations)`);
      if (t.student_refs.length > 0) {
        lines.push(`    Students: ${t.student_refs.join(", ")}`);
      }
      for (const ex of t.example_observations) {
        lines.push(`    – ${ex}`);
      }
    }
  }
  lines.push("");

  lines.push("FOLLOW-UP GAPS");
  if (report.follow_up_gaps.length === 0) {
    lines.push("  No follow-up gaps found.");
  } else {
    for (const g of report.follow_up_gaps) {
      lines.push(`  • ${g.observation} (${g.days_since}d ago)`);
      if (g.student_refs.length > 0) {
        lines.push(`    Students: ${g.student_refs.join(", ")}`);
      }
    }
  }
  lines.push("");

  lines.push("POSITIVE TRENDS");
  if (report.positive_trends.length === 0) {
    lines.push("  No positive trends recorded.");
  } else {
    for (const p of report.positive_trends) {
      lines.push(`  • ${p.student_ref}: ${p.description}`);
      for (const ev of p.evidence) {
        lines.push(`    – ${ev}`);
      }
    }
  }
  lines.push("");

  lines.push("SUGGESTED FOCUS AREAS");
  if (report.suggested_focus.length === 0) {
    lines.push("  No focus areas suggested.");
  } else {
    for (const f of report.suggested_focus) {
      lines.push(`  • [${f.priority.toUpperCase()}] ${f.student_ref}: ${f.reason}`);
      lines.push(`    Action: ${f.suggested_action}`);
    }
  }

  return lines.join("\n");
}

// ── EABriefingPanel ─────────────────────────────────────────────────────────

export function serializeEABriefingToPlainText(briefing: EABriefing): string {
  const lines: string[] = [];

  lines.push("EA BRIEFING");
  lines.push(`Date: ${briefing.date}`);
  lines.push("");

  lines.push("SCHEDULE BLOCKS");
  if (briefing.schedule_blocks.length === 0) {
    lines.push("  No schedule blocks.");
  } else {
    for (const b of briefing.schedule_blocks) {
      lines.push(`  ${b.time_slot}: ${b.task_description}`);
      if (b.student_refs.length > 0) {
        lines.push(`    Students: ${b.student_refs.join(", ")}`);
      }
      if (b.materials_needed.length > 0) {
        lines.push(`    Materials: ${b.materials_needed.join(", ")}`);
      }
    }
  }
  lines.push("");

  lines.push("STUDENT WATCH LIST");
  if (briefing.student_watch_list.length === 0) {
    lines.push("  No students on watch list.");
  } else {
    for (const w of briefing.student_watch_list) {
      lines.push(`  • ${w.student_ref}: ${w.context_summary}`);
      lines.push(`    Approach: ${w.suggested_approach}`);
    }
  }
  lines.push("");

  lines.push("PENDING FOLLOW-UPS");
  if (briefing.pending_followups.length === 0) {
    lines.push("  No pending follow-ups.");
  } else {
    for (const f of briefing.pending_followups) {
      lines.push(`  • ${f.student_ref} (${f.days_since}d): ${f.original_observation}`);
      lines.push(`    Action: ${f.suggested_action}`);
    }
  }
  lines.push("");

  lines.push("TEACHER NOTES FOR EA");
  lines.push(briefing.teacher_notes_for_ea || "  (none)");

  return lines.join("\n");
}

export function serializeEABriefingToMarkdown(briefing: EABriefing): string {
  const lines: string[] = [];

  lines.push(`# EA Briefing — ${briefing.date}`);
  lines.push("");

  lines.push("## Schedule Blocks");
  if (briefing.schedule_blocks.length === 0) {
    lines.push("_No schedule blocks._");
  } else {
    for (const b of briefing.schedule_blocks) {
      lines.push(`### ${b.time_slot}`);
      lines.push(b.task_description);
      if (b.student_refs.length > 0) {
        lines.push(`**Students:** ${b.student_refs.join(", ")}`);
      }
      if (b.materials_needed.length > 0) {
        lines.push(`**Materials:** ${b.materials_needed.join(", ")}`);
      }
      lines.push("");
    }
  }

  lines.push("## Student Watch List");
  if (briefing.student_watch_list.length === 0) {
    lines.push("_No students on watch list._");
  } else {
    for (const w of briefing.student_watch_list) {
      lines.push(`- **${w.student_ref}:** ${w.context_summary}`);
      lines.push(`  - Approach: ${w.suggested_approach}`);
    }
  }
  lines.push("");

  lines.push("## Pending Follow-Ups");
  if (briefing.pending_followups.length === 0) {
    lines.push("_No pending follow-ups._");
  } else {
    for (const f of briefing.pending_followups) {
      lines.push(`- **${f.student_ref}** (${f.days_since}d): ${f.original_observation}`);
      lines.push(`  - Action: ${f.suggested_action}`);
    }
  }
  lines.push("");

  lines.push("## Teacher Notes for EA");
  lines.push(briefing.teacher_notes_for_ea || "_None_");

  return lines.join("\n");
}

// ── ForecastPanel ───────────────────────────────────────────────────────────

export function serializeForecastToPlainText(forecast: ComplexityForecast): string {
  const lines: string[] = [];

  lines.push("COMPLEXITY FORECAST");
  lines.push(`Date: ${forecast.forecast_date}`);
  lines.push(`Highest risk block: ${forecast.highest_risk_block}`);
  lines.push("");

  lines.push("OVERALL SUMMARY");
  lines.push(forecast.overall_summary);
  lines.push("");

  lines.push("BLOCK-BY-BLOCK FORECAST");
  if (forecast.blocks.length === 0) {
    lines.push("  No blocks in forecast.");
  } else {
    for (const b of forecast.blocks) {
      lines.push(`  ${b.time_slot} — ${b.activity} [${b.level.toUpperCase()}]`);
      if (b.contributing_factors.length > 0) {
        lines.push(`    Factors: ${b.contributing_factors.join("; ")}`);
      }
      lines.push(`    Mitigation: ${b.suggested_mitigation}`);
    }
  }

  return lines.join("\n");
}

// ── SurvivalPacketPanel ─────────────────────────────────────────────────────

export function serializeSurvivalPacketToMarkdown(packet: SurvivalPacket): string {
  const lines: string[] = [];

  lines.push(`# Substitute Survival Packet`);
  lines.push(`**Date:** ${packet.generated_for_date}`);
  lines.push("");

  if (packet.heads_up.length > 0) {
    lines.push("## Heads Up");
    for (const h of packet.heads_up) {
      lines.push(`- ${h}`);
    }
    lines.push("");
  }

  lines.push("## Classroom Routines");
  if (packet.routines.length === 0) {
    lines.push("_No routines listed._");
  } else {
    for (const r of packet.routines) {
      lines.push(`### ${r.time_or_label}`);
      lines.push(r.description);
      if (r.recent_changes) {
        lines.push(`_Recent change: ${r.recent_changes}_`);
      }
      lines.push("");
    }
  }

  lines.push("## Simplified Day Plan");
  if (packet.simplified_day_plan.length === 0) {
    lines.push("_No day plan._");
  } else {
    for (const s of packet.simplified_day_plan) {
      lines.push(`- **${s.time_slot}:** ${s.activity}`);
      lines.push(`  ${s.sub_instructions}`);
      if (s.materials_location) {
        lines.push(`  Materials: ${s.materials_location}`);
      }
    }
  }
  lines.push("");

  lines.push("## Student Support Notes");
  if (packet.student_support.length === 0) {
    lines.push("_No student support notes._");
  } else {
    for (const s of packet.student_support) {
      lines.push(`### ${s.student_ref}`);
      lines.push(`**Strategies:** ${s.key_strategies}`);
      if (s.current_scaffolds.length > 0) {
        lines.push(`**Scaffolds:** ${s.current_scaffolds.join(", ")}`);
      }
      if (s.things_to_avoid) {
        lines.push(`**Avoid:** ${s.things_to_avoid}`);
      }
      lines.push("");
    }
  }

  lines.push("## EA Coordination");
  lines.push(packet.ea_coordination.schedule_summary);
  if (packet.ea_coordination.primary_students.length > 0) {
    lines.push(`**Primary students:** ${packet.ea_coordination.primary_students.join(", ")}`);
  }
  lines.push(`**If EA absent:** ${packet.ea_coordination.if_ea_absent}`);
  lines.push("");

  lines.push("## Family Communications");
  if (packet.family_comms.length === 0) {
    lines.push("_No family communications notes._");
  } else {
    for (const f of packet.family_comms) {
      lines.push(`- **${f.student_ref}** [${f.status.replace(/_/g, " ")}]: ${f.notes}`);
      if (f.language_preference) {
        lines.push(`  Language preference: ${f.language_preference}`);
      }
    }
  }
  lines.push("");

  if (packet.complexity_peaks.length > 0) {
    lines.push("## Complexity Peaks");
    for (const c of packet.complexity_peaks) {
      lines.push(`- **${c.time_slot}** [${c.level.toUpperCase()}]: ${c.reason}`);
      lines.push(`  Mitigation: ${c.mitigation}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ── LanguageToolsPanel ──────────────────────────────────────────────────────

export function serializeLanguageOutputToPlainText(output: SimplifiedOutput | VocabCardSet): string {
  if ("simplified_text" in output) {
    // SimplifiedOutput
    const simplified = output as SimplifiedOutput;
    const lines: string[] = [];
    lines.push("SIMPLIFIED TEXT");
    lines.push(`Grade band: ${simplified.grade_band} | EAL level: ${simplified.eal_level}`);
    lines.push("");
    lines.push(simplified.simplified_text);
    if (simplified.key_vocabulary.length > 0) {
      lines.push("");
      lines.push("KEY VOCABULARY");
      lines.push(simplified.key_vocabulary.join(", "));
    }
    if (simplified.visual_cue_suggestions.length > 0) {
      lines.push("");
      lines.push("VISUAL CUE SUGGESTIONS");
      for (const v of simplified.visual_cue_suggestions) {
        lines.push(`  • ${v}`);
      }
    }
    return lines.join("\n");
  } else {
    // VocabCardSet
    const cardSet = output as VocabCardSet;
    const lines: string[] = [];
    lines.push("VOCABULARY CARDS");
    lines.push(`Subject: ${cardSet.subject} | Language: ${cardSet.target_language} | Grade: ${cardSet.grade_band}`);
    lines.push(`${cardSet.cards.length} cards`);
    lines.push("");
    for (const card of cardSet.cards) {
      lines.push(`TERM: ${card.term}`);
      lines.push(`  Definition: ${card.definition}`);
      lines.push(`  Translation: ${card.target_translation}`);
      lines.push(`  Example: ${card.example_sentence}`);
      if (card.visual_hint) {
        lines.push(`  Visual hint: ${card.visual_hint}`);
      }
      lines.push("");
    }
    return lines.join("\n");
  }
}

export function serializeVocabCardSetToMarkdown(cardSet: VocabCardSet): string {
  const lines: string[] = [];
  lines.push(`# Vocabulary Cards`);
  lines.push(`**Subject:** ${cardSet.subject} | **Language:** ${cardSet.target_language} | **Grade:** ${cardSet.grade_band}`);
  lines.push("");
  for (const card of cardSet.cards) {
    lines.push(`## ${card.term}`);
    lines.push(`**Definition:** ${card.definition}`);
    lines.push(`**Translation:** ${card.target_translation}`);
    lines.push(`**Example:** ${card.example_sentence}`);
    if (card.visual_hint) {
      lines.push(`**Visual hint:** ${card.visual_hint}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
