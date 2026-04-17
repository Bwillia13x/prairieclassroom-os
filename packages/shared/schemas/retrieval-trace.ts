/**
 * RetrievalTrace — names which classroom-memory records informed a planning-tier
 * generation, so the teacher can verify "the plan/briefing/pattern report
 * actually read my classroom memory" without inspecting logs.
 *
 * Shipped on the response payload of retrieval-backed routes (tomorrow_plan,
 * ea_briefing, support_patterns at first; the same shape extends to forecast,
 * scaffold_decay, survival_packet, ea_load).
 *
 * The trace is a *post-hoc* capture: it reports what was retrieved and passed
 * to the prompt, not what the model actually used. That's the honest claim.
 * The maintainer's structured walkthrough flagged this as the single biggest
 * trust lever for first-time users.
 */
import { z } from "zod";

export const RetrievalSourceTypeSchema = z.enum([
  "plan",
  "intervention",
  "pattern_report",
  "forecast",
  "scaffold_review",
  "family_message",
  "survival_packet",
]);

export type RetrievalSourceType = z.infer<typeof RetrievalSourceTypeSchema>;

export const RetrievalCitationSchema = z.object({
  /** Which kind of memory record. */
  source_type: RetrievalSourceTypeSchema,
  /** The record's stable id (plan_id, record_id, report_id, etc.). */
  record_id: z.string(),
  /** ISO timestamp on the source record, when available. */
  created_at: z.string().optional(),
  /** Short human-readable hint so the teacher can recognize the record. */
  excerpt: z.string().optional(),
});

export type RetrievalCitation = z.infer<typeof RetrievalCitationSchema>;

export const RetrievalTraceSchema = z.object({
  /** The records that were actually pulled into the prompt. */
  citations: z.array(RetrievalCitationSchema),
  /** How many records of any retrieval-eligible type were considered.
   *  When > citations.length the generation chose a subset; teachers can ask
   *  why a record they expected to see is missing. */
  total_records_considered: z.number().int().nonnegative(),
});

export type RetrievalTrace = z.infer<typeof RetrievalTraceSchema>;

/**
 * Empty trace — convenient when retrieval failed or returned nothing.
 * The teacher sees "0 records pulled" instead of a missing section, which is
 * the honest answer to "did the system read my memory?"
 */
export function emptyRetrievalTrace(): RetrievalTrace {
  return { citations: [], total_records_considered: 0 };
}
