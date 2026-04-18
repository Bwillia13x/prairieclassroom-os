/**
 * retrieval-trace.ts — Convert per-record retrieval results into a teacher-facing
 * RetrievalTrace, used by planning-tier routes to answer "did the system actually
 * read my classroom memory?"
 *
 * The trace is built post-retrieval, before the prompt is sent to the model.
 * It records which records were retrieved, never claims the model used them.
 * This is the honest claim the maintainer's structured walkthrough flagged
 * as the single biggest first-time-user trust lever.
 */

import type {
  RetrievalCitation,
  RetrievalTrace,
} from "../../packages/shared/schemas/retrieval-trace.js";
import type { TomorrowPlan } from "../../packages/shared/schemas/plan.js";
import type { InterventionRecord } from "../../packages/shared/schemas/intervention.js";
import type { SupportPatternReport } from "../../packages/shared/schemas/pattern.js";
import type { ComplexityForecast } from "../../packages/shared/schemas/forecast.js";
import type { ScaffoldDecayReport } from "../../packages/shared/schemas/scaffold-decay.js";
import type { SurvivalPacket } from "../../packages/shared/schemas/survival-packet.js";
import type { FamilyMessageDraft } from "../../packages/shared/schemas/message.js";

const MAX_EXCERPT_LENGTH = 120;

function truncate(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= MAX_EXCERPT_LENGTH) return trimmed;
  return `${trimmed.slice(0, MAX_EXCERPT_LENGTH - 1)}…`;
}

export function planCitation(plan: TomorrowPlan): RetrievalCitation {
  const firstPriority = plan.support_priorities?.[0];
  const excerptParts = firstPriority
    ? [firstPriority.student_ref, firstPriority.reason].filter(Boolean)
    : [];
  return {
    source_type: "plan",
    record_id: plan.plan_id,
    excerpt: truncate(excerptParts.length > 0 ? excerptParts.join(" — ") : undefined),
  };
}

export function interventionCitation(record: InterventionRecord): RetrievalCitation {
  return {
    source_type: "intervention",
    record_id: record.record_id,
    created_at: record.created_at,
    excerpt: truncate(
      `${record.student_refs.join(", ")} — ${record.observation}`,
    ),
  };
}

export function patternReportCitation(report: SupportPatternReport): RetrievalCitation {
  const firstTheme = report.recurring_themes?.[0]?.theme;
  return {
    source_type: "pattern_report",
    record_id: report.report_id,
    created_at: report.generated_at,
    excerpt: truncate(firstTheme ? `Theme: ${firstTheme}` : undefined),
  };
}

export function forecastCitation(forecast: ComplexityForecast): RetrievalCitation {
  const riskHint = forecast.highest_risk_block
    ? `Highest risk: ${forecast.highest_risk_block}`
    : forecast.overall_summary;
  return {
    source_type: "forecast",
    record_id: forecast.forecast_id,
    excerpt: truncate(riskHint),
  };
}

export function scaffoldReviewCitation(report: ScaffoldDecayReport): RetrievalCitation {
  const firstScaffold = report.reviews?.[0]?.scaffold_name;
  const excerptParts = [report.student_ref, firstScaffold].filter(Boolean);
  return {
    source_type: "scaffold_review",
    record_id: report.report_id,
    created_at: report.generated_at,
    excerpt: truncate(excerptParts.length > 0 ? excerptParts.join(" — ") : report.summary),
  };
}

export function survivalPacketCitation(packet: SurvivalPacket): RetrievalCitation {
  const firstHeadsUp = packet.heads_up?.[0];
  const excerptParts = [packet.generated_for_date, firstHeadsUp].filter(Boolean);
  return {
    source_type: "survival_packet",
    record_id: packet.packet_id,
    excerpt: truncate(excerptParts.length > 0 ? excerptParts.join(" — ") : undefined),
  };
}

export function familyMessageCitation(draft: FamilyMessageDraft): RetrievalCitation {
  const status = draft.teacher_approved ? "approved" : "draft";
  const students = draft.student_refs.join(", ");
  const excerpt = `${students} — ${draft.message_type} [${status}]`;
  return {
    source_type: "family_message",
    record_id: draft.draft_id,
    created_at: draft.approval_timestamp,
    excerpt: truncate(excerpt),
  };
}

/**
 * Combine an arbitrary set of citations into a RetrievalTrace.
 *
 * `totalRecordsConsidered` defaults to citations.length when callers don't have a
 * separate "considered" count. Routes that pull a top-N subset can pass the
 * larger denominator so the teacher sees "3 of 8 interventions used."
 */
export function buildRetrievalTrace(
  citations: RetrievalCitation[],
  totalRecordsConsidered?: number,
): RetrievalTrace {
  const total = totalRecordsConsidered ?? citations.length;
  return {
    citations,
    total_records_considered: Math.max(total, citations.length),
  };
}
