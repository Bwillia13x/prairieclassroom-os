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

// Retention-eligible memory tables. Kept in sync with scripts/lib/memory-admin.mjs DATA_TABLES.
export const RETENTION_TABLES = [
  "generated_plans",
  "generated_variants",
  "family_messages",
  "interventions",
  "pattern_reports",
  "complexity_forecasts",
  "scaffold_reviews",
  "survival_packets",
  "feedback",
  "sessions",
] as const;
export type RetentionTable = typeof RETENTION_TABLES[number];

/**
 * Per-classroom retention policy. A positive default_days sets the retention
 * window for every time-series record type; overrides tighten or loosen a
 * specific table. Omit the policy entirely to keep records indefinitely.
 *
 * Pruning is never automatic — it runs only when an operator invokes
 * `npm run memory:admin -- prune --classroom <id> --confirm`.
 */
export const RetentionPolicySchema = z
  .object({
    default_days: z.number().int().positive().nullable().optional(),
    overrides: z
      .partialRecord(z.enum(RETENTION_TABLES), z.number().int().positive())
      .optional(),
  })
  .strict();

export type RetentionPolicy = z.infer<typeof RetentionPolicySchema>;

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
  retention_policy: RetentionPolicySchema.optional(),
});

export type ClassroomProfile = z.infer<typeof ClassroomProfileSchema>;
