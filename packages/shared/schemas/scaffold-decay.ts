/**
 * ScaffoldDecayReport — analysis of scaffold usage trends for a specific student.
 * Maps to prompt contract K: detect_scaffold_decay.
 */
import { z } from "zod";

export const ScaffoldUsageTrendSchema = z.object({
  scaffold_name: z.string(),
  early_window_count: z.number(),
  early_window_total: z.number(),
  recent_window_count: z.number(),
  recent_window_total: z.number(),
  trend: z.enum(["decaying", "stable", "increasing"]),
});

export type ScaffoldUsageTrend = z.infer<typeof ScaffoldUsageTrendSchema>;

export const PositiveSignalSchema = z.object({
  description: z.string(),
  source_record_id: z.string(),
});

export type PositiveSignal = z.infer<typeof PositiveSignalSchema>;

export const WithdrawalPhaseSchema = z.object({
  phase_number: z.number(),
  description: z.string(),
  duration_weeks: z.number(),
  success_criteria: z.string(),
});

export type WithdrawalPhase = z.infer<typeof WithdrawalPhaseSchema>;

export const ScaffoldReviewSchema = z.object({
  scaffold_name: z.string(),
  usage_trend: ScaffoldUsageTrendSchema,
  positive_signals: z.array(PositiveSignalSchema),
  withdrawal_plan: z.array(WithdrawalPhaseSchema),
  regression_protocol: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
});

export type ScaffoldReview = z.infer<typeof ScaffoldReviewSchema>;

export const ScaffoldDecayReportSchema = z.object({
  report_id: z.string(),
  classroom_id: z.string(),
  student_ref: z.string(),
  reviews: z.array(ScaffoldReviewSchema),
  summary: z.string(),
  generated_at: z.string(),
  schema_version: z.string(),
});

export type ScaffoldDecayReport = z.infer<typeof ScaffoldDecayReportSchema>;
