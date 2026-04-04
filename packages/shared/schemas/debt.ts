/**
 * ComplexityDebtRegister — operational follow-through gaps computed from classroom memory.
 * Maps to prompt contract J: complexity_debt_register (deterministic, no model).
 */
import { z } from "zod";

export const DebtCategorySchema = z.enum([
  "stale_followup",
  "unapproved_message",
  "unaddressed_pattern",
  "recurring_plan_item",
  "approaching_review",
]);

export type DebtCategory = z.infer<typeof DebtCategorySchema>;

export const DebtItemSchema = z.object({
  category: DebtCategorySchema,
  student_refs: z.array(z.string()),
  description: z.string(),
  source_record_id: z.string(),
  age_days: z.number(),
  suggested_action: z.string(),
});

export type DebtItem = z.infer<typeof DebtItemSchema>;

export const DebtThresholdsSchema = z.object({
  stale_followup_days: z.number().default(5),
  unapproved_message_days: z.number().default(3),
  recurring_plan_min: z.number().default(3),
  review_window_days: z.number().default(14),
  review_min_records: z.number().default(2),
});

export type DebtThresholds = z.infer<typeof DebtThresholdsSchema>;

export const ComplexityDebtRegisterSchema = z.object({
  register_id: z.string(),
  classroom_id: z.string(),
  items: z.array(DebtItemSchema),
  item_count_by_category: z.record(z.string(), z.number()),
  generated_at: z.string(),
  schema_version: z.string(),
});

export type ComplexityDebtRegister = z.infer<typeof ComplexityDebtRegisterSchema>;
