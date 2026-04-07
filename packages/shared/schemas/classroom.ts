/**
 * ClassroomProfile — represents one classroom's context.
 * Maps to data-contracts.md ClassroomProfile entity.
 */
import { z } from "zod";
import { ScheduleBlockInputSchema, UpcomingEventSchema } from "./forecast.js";

export const StudentSupportSummarySchema = z.object({
  student_id: z.string(),
  alias: z.string(),
  eal_flag: z.boolean(),
  support_tags: z.array(z.string()),
  known_successful_scaffolds: z.array(z.string()),
  communication_notes: z.array(z.string()).optional(),
  family_language: z.string().optional(),
});

export type StudentSupportSummary = z.infer<typeof StudentSupportSummarySchema>;

export const ClassroomProfileSchema = z.object({
  classroom_id: z.string(),
  grade_band: z.string(),
  subject_focus: z.string(),
  classroom_notes: z.array(z.string()),
  routines: z.record(z.string(), z.string()),
  support_constraints: z.array(z.string()).optional(),
  students: z.array(StudentSupportSummarySchema),
  access_code: z.string().optional(),
  sub_ready: z.boolean().optional(),
  schedule: z.array(ScheduleBlockInputSchema).optional(),
  upcoming_events: z.array(UpcomingEventSchema).optional(),
});

export type ClassroomProfile = z.infer<typeof ClassroomProfileSchema>;
