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
  student_refs: z.array(z.string().max(60)).max(80),
  description: z.string().min(1).max(1000),
  source_record_id: z.string().min(1).max(120),
  age_days: z.number().int().nonnegative().max(3650),
  suggested_action: z.string().max(500),
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
  item_count_by_category: z.partialRecord(DebtCategorySchema, z.number().int().nonnegative().max(10_000)),
  generated_at: z.string(),
  schema_version: z.string(),
});

export type ComplexityDebtRegister = z.infer<typeof ComplexityDebtRegisterSchema>;
