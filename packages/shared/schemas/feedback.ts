/**
 * Feedback schemas — teacher feedback on generated panel content.
 * Supports per-panel rating + optional comment for evidence instrumentation.
 */
import { z } from "zod";

export const PANEL_IDS = [
  "today",
  "differentiate",
  "language-tools",
  "tomorrow-plan",
  "ea-briefing",
  "complexity-forecast",
  "log-intervention",
  "survival-packet",
  "family-message",
  "support-patterns",
  "usage-insights",
] as const;

export const FeedbackRequestSchema = z.object({
  classroom_id: z.string().min(1),
  panel_id: z.enum(PANEL_IDS),
  prompt_class: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(200).optional(),
  generation_id: z.string().optional(),
  session_id: z.string().optional(),
});

export type FeedbackRequest = z.infer<typeof FeedbackRequestSchema>;

export const FeedbackResponseSchema = z.object({
  id: z.string(),
  created_at: z.string(),
});

export type FeedbackResponse = z.infer<typeof FeedbackResponseSchema>;

export const FeedbackSummarySchema = z.object({
  total: z.number(),
  by_panel: z.record(
    z.string(),
    z.object({
      count: z.number(),
      avg_rating: z.number(),
      recent_comments: z.array(z.string()),
    }),
  ),
  by_week: z.array(
    z.object({
      week: z.string(),
      count: z.number(),
      avg_rating: z.number(),
    }),
  ),
  top_comments: z.array(
    z.object({
      text: z.string(),
      panel_id: z.string(),
      rating: z.number(),
      created_at: z.string(),
    }),
  ),
});

export type FeedbackSummary = z.infer<typeof FeedbackSummarySchema>;
