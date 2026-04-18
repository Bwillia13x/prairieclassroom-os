/**
 * ScaffoldDecayReport — analysis of scaffold usage trends for a specific student.
 * Maps to prompt contract K: detect_scaffold_decay.
 */
import { z } from "zod";

export const ScaffoldUsageTrendSchema = z.object({
  scaffold_name: z.string().min(1).max(200),
  early_window_count: z.number().int().nonnegative().max(10_000),
  early_window_total: z.number().int().nonnegative().max(10_000),
  recent_window_count: z.number().int().nonnegative().max(10_000),
  recent_window_total: z.number().int().nonnegative().max(10_000),
  trend: z.enum(["decaying", "stable", "increasing"]),
});

export type ScaffoldUsageTrend = z.infer<typeof ScaffoldUsageTrendSchema>;

export const PositiveSignalSchema = z.object({
  description: z.string(),
  source_record_id: z.string(),
});

export type PositiveSignal = z.infer<typeof PositiveSignalSchema>;

export const WithdrawalPhaseSchema = z.object({
  phase_number: z.number().int().positive().max(20),
  description: z.string().min(1).max(1500),
  duration_weeks: z.number().positive().max(52),
  success_criteria: z.string().max(1500),
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
