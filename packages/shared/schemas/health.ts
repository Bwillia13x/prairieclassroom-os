/**
 * ClassroomHealth — operational health metrics and trend data for classroom monitoring.
 * Captures streak activity, plan compliance, message approval rate, and 14-day complexity trends.
 */
import { z } from "zod";

export const ClassroomHealthSchema = z.object({
  streak_days: z.number().int().min(0),
  plans_last_7: z.array(z.boolean()).length(7),
  messages_approved: z.number().int().min(0),
  messages_total: z.number().int().min(0),
  trends: z.object({
    debt_total_14d: z.array(z.number().int()),
    plans_14d: z.array(z.union([z.literal(0), z.literal(1)])),
    peak_complexity_14d: z.array(z.number().int().min(0).max(3)),
  }),
});

export type ClassroomHealth = z.infer<typeof ClassroomHealthSchema>;
