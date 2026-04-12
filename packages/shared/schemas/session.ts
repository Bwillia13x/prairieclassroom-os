/**
 * Session schemas — tracking teacher session usage patterns.
 * Records panel visits, generation events, and session duration.
 */
import { z } from "zod";

export const GenerationEventSchema = z.object({
  panel_id: z.string(),
  prompt_class: z.string(),
  timestamp: z.string(),
});

export type GenerationEvent = z.infer<typeof GenerationEventSchema>;

export const SessionRequestSchema = z.object({
  classroom_id: z.string().min(1),
  session_id: z.string().min(1),
  started_at: z.string(),
  ended_at: z.string(),
  panels_visited: z.array(z.string()).min(1),
  generations_triggered: z.array(GenerationEventSchema),
  feedback_count: z.number().int().min(0),
});

export type SessionRequest = z.infer<typeof SessionRequestSchema>;

export const SessionResponseSchema = z.object({
  id: z.string(),
});

export type SessionResponse = z.infer<typeof SessionResponseSchema>;

export const SessionSummarySchema = z.object({
  total_sessions: z.number(),
  avg_duration_minutes: z.number(),
  common_flows: z.array(
    z.object({
      sequence: z.array(z.string()),
      count: z.number(),
    }),
  ),
  panel_time_distribution: z.record(z.string(), z.number()),
  generations_per_session: z.number(),
});

export type SessionSummary = z.infer<typeof SessionSummarySchema>;
