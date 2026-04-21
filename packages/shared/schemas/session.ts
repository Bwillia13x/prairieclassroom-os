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

export const SessionFlowSchema = z.object({
  sequence: z.array(z.string()).min(1),
  count: z.number(),
});

export type SessionFlow = z.infer<typeof SessionFlowSchema>;

export const SessionTransitionSchema = z.object({
  from_panel: z.string(),
  to_panel: z.string(),
  count: z.number().int().min(0),
});

export type SessionTransition = z.infer<typeof SessionTransitionSchema>;

export const SessionTerminalSchema = z.object({
  panel_id: z.string(),
  count: z.number().int().min(0),
});

export type SessionTerminal = z.infer<typeof SessionTerminalSchema>;

export const SessionResolutionCountSchema = z.object({
  panel_id: z.string(),
  count: z.number().int().min(0),
});

export type SessionResolutionCount = z.infer<typeof SessionResolutionCountSchema>;

export const TodayWorkflowNudgeSchema = z.object({
  week: z.string(),
  is_current_week: z.boolean(),
  sequence: z.array(z.string()).min(2),
  count: z.number(),
});

export type TodayWorkflowNudge = z.infer<typeof TodayWorkflowNudgeSchema>;

export const SessionSummarySchema = z.object({
  total_sessions: z.number(),
  avg_duration_minutes: z.number(),
  common_flows: z.array(SessionFlowSchema),
  transition_counts: z.array(SessionTransitionSchema),
  terminal_counts: z.array(SessionTerminalSchema),
  completion_counts: z.array(SessionResolutionCountSchema).optional(),
  reopen_counts: z.array(SessionResolutionCountSchema).optional(),
  median_time_to_resolution_minutes: z.number().nullable().optional(),
  panel_time_distribution: z.record(z.string(), z.number()),
  generations_per_session: z.number(),
  today_workflow_nudge: TodayWorkflowNudgeSchema.nullable(),
});

export type SessionSummary = z.infer<typeof SessionSummarySchema>;
