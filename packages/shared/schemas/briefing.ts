/**
 * EABriefing — daily briefing for educational assistants.
 * Synthesizes plan EA actions, interventions, patterns into a printable document.
 * Maps to prompt class H: generate_ea_briefing.
 */
import { z } from "zod";

export const ScheduleBlockSchema = z.object({
  time_slot: z.string(),
  student_refs: z.array(z.string()),
  task_description: z.string(),
  materials_needed: z.array(z.string()),
});

export type ScheduleBlock = z.infer<typeof ScheduleBlockSchema>;

export const StudentWatchItemSchema = z.object({
  student_ref: z.string(),
  context_summary: z.string(),
  suggested_approach: z.string(),
});

export type StudentWatchItem = z.infer<typeof StudentWatchItemSchema>;

export const PendingFollowupSchema = z.object({
  student_ref: z.string(),
  original_observation: z.string(),
  days_since: z.number(),
  suggested_action: z.string(),
});

export type PendingFollowup = z.infer<typeof PendingFollowupSchema>;

export const EABriefingSchema = z.object({
  briefing_id: z.string(),
  classroom_id: z.string(),
  date: z.string(),
  schedule_blocks: z.array(ScheduleBlockSchema),
  student_watch_list: z.array(StudentWatchItemSchema),
  pending_followups: z.array(PendingFollowupSchema),
  teacher_notes_for_ea: z.string(),
  schema_version: z.string(),
});

export type EABriefing = z.infer<typeof EABriefingSchema>;
