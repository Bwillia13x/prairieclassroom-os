/**
 * SupportPatternReport — analysis of recurring patterns across classroom memory.
 * Maps to prompt class G: detect_support_patterns.
 */
import { z } from "zod";

export const RecurringThemeSchema = z.object({
  theme: z.string().min(1).max(300),
  student_refs: z.array(z.string().max(60)).max(80),
  evidence_count: z.number().int().nonnegative().max(10_000),
  example_observations: z.array(z.string().max(1000)).max(20),
});

export type RecurringTheme = z.infer<typeof RecurringThemeSchema>;

export const FollowUpGapSchema = z.object({
  original_record_id: z.string().min(1).max(120),
  student_refs: z.array(z.string().max(60)).max(80),
  observation: z.string().max(2000),
  days_since: z.number().int().nonnegative().max(3650),
});

export type FollowUpGap = z.infer<typeof FollowUpGapSchema>;

export const PositiveTrendSchema = z.object({
  student_ref: z.string(),
  description: z.string(),
  evidence: z.array(z.string()),
});

export type PositiveTrend = z.infer<typeof PositiveTrendSchema>;

export const SuggestedFocusSchema = z.object({
  student_ref: z.string(),
  reason: z.string(),
  suggested_action: z.string(),
  priority: z.enum(["high", "medium", "low"]),
});

export type SuggestedFocus = z.infer<typeof SuggestedFocusSchema>;

export const SupportPatternReportSchema = z.object({
  report_id: z.string(),
  classroom_id: z.string(),
  student_filter: z.string().nullable(),
  time_window: z.number().int().positive().max(3650),
  recurring_themes: z.array(RecurringThemeSchema),
  follow_up_gaps: z.array(FollowUpGapSchema),
  positive_trends: z.array(PositiveTrendSchema),
  suggested_focus: z.array(SuggestedFocusSchema),
  generated_at: z.string(),
  schema_version: z.string(),
});

export type SupportPatternReport = z.infer<typeof SupportPatternReportSchema>;
