/**
 * ClassroomProfile — represents one classroom's context.
 * Maps to data-contracts.md ClassroomProfile entity.
 */
import { z } from "zod";
import { ScheduleBlockInputSchema, UpcomingEventSchema } from "./forecast.js";

export const StudentSupportSummarySchema = z.object({
  student_id: z.string().min(1).max(80),
  alias: z.string().min(1).max(60),
  eal_flag: z.boolean(),
  support_tags: z.array(z.string().max(80)).max(40),
  known_successful_scaffolds: z.array(z.string().max(120)).max(40),
  communication_notes: z.array(z.string().max(500)).max(50).optional(),
  family_language: z.string().min(2).max(40).optional(),
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

export const ClassroomProfileSchema = z
  .object({
    classroom_id: z.string().min(1).max(100),
    grade_band: z.string().min(1).max(20),
    subject_focus: z.string().min(1).max(80),
    classroom_notes: z.array(z.string().max(500)).max(100),
    routines: z.record(z.string().max(60), z.string().max(200)),
    support_constraints: z.array(z.string().max(200)).max(30).optional(),
    students: z.array(StudentSupportSummarySchema).max(80),
    access_code: z.string().min(4).max(120).optional(),
    sub_ready: z.boolean().optional(),
    schedule: z.array(ScheduleBlockInputSchema).max(20).optional(),
    upcoming_events: z.array(UpcomingEventSchema).max(50).optional(),
    retention_policy: RetentionPolicySchema.optional(),
    // First-class replacement for hardcoded-ID demo detection; see
    // auth.ts::isDemoClassroom.
    is_demo: z.boolean().optional(),
  })
  // Reject unknown keys so fixture/schema drift fails loudly at load time.
  .strict();

export type ClassroomProfile = z.infer<typeof ClassroomProfileSchema>;
