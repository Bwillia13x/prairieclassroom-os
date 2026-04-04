// packages/shared/schemas/forecast.ts
/**
 * ComplexityForecast — per-block complexity prediction for the next school day.
 * Maps to prompt contract I: forecast_complexity.
 */
import { z } from "zod";

export const ScheduleBlockInputSchema = z.object({
  time_slot: z.string(),
  activity: z.string(),
  ea_available: z.boolean(),
  notes: z.string().optional(),
});

export type ScheduleBlockInput = z.infer<typeof ScheduleBlockInputSchema>;

export const UpcomingEventSchema = z.object({
  description: z.string(),
  time_slot: z.string().optional(),
  impacts: z.string().optional(),
});

export type UpcomingEvent = z.infer<typeof UpcomingEventSchema>;

export const ComplexityBlockSchema = z.object({
  time_slot: z.string(),
  activity: z.string(),
  level: z.enum(["low", "medium", "high"]),
  contributing_factors: z.array(z.string()),
  suggested_mitigation: z.string(),
});

export type ComplexityBlock = z.infer<typeof ComplexityBlockSchema>;

export const ComplexityForecastSchema = z.object({
  forecast_id: z.string(),
  classroom_id: z.string(),
  forecast_date: z.string(),
  blocks: z.array(ComplexityBlockSchema),
  overall_summary: z.string(),
  highest_risk_block: z.string(),
  schema_version: z.string(),
});

export type ComplexityForecast = z.infer<typeof ComplexityForecastSchema>;
