/**
 * Request validation schemas for all orchestrator API routes.
 * Uses Zod for runtime validation at the API boundary.
 */
import { z } from "zod";
import { LessonArtifactSchema } from "../../packages/shared/schemas/artifact.js";
import { CurriculumSelectionSchema } from "../../packages/shared/schemas/curriculum.js";
import type { Request, Response, NextFunction } from "express";
import { sendRouteError } from "./errors.js";

// ----- Classroom ID sanitization -----

const CLASSROOM_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,98}[a-z0-9]$/;
export function isValidClassroomId(id: string): boolean {
  return CLASSROOM_ID_PATTERN.test(id);
}

const SHORT_TEXT_MAX = 500;
const MEDIUM_TEXT_MAX = 2_000;
const LONG_TEXT_MAX = 8_000;
const IMAGE_BASE64_MAX = 8_000_000;

const requiredString = (max: number) => z.string().min(1).max(max);
const optionalString = (max: number) => z.string().max(max).optional();

const ValidatedLessonArtifactSchema = LessonArtifactSchema.extend({
  title: requiredString(SHORT_TEXT_MAX),
  subject: requiredString(SHORT_TEXT_MAX),
  source_path_or_blob_ref: optionalString(MEDIUM_TEXT_MAX),
  raw_text: optionalString(LONG_TEXT_MAX),
  teacher_goal: optionalString(MEDIUM_TEXT_MAX),
  capture_timestamp: optionalString(SHORT_TEXT_MAX),
});

// ----- Request body schemas -----

export const DifferentiateRequestSchema = z.object({
  artifact: ValidatedLessonArtifactSchema,
  classroom_id: requiredString(SHORT_TEXT_MAX),
  teacher_goal: optionalString(MEDIUM_TEXT_MAX),
  curriculum_selection: CurriculumSelectionSchema.optional(),
});

export const TomorrowPlanRequestSchema = z.object({
  classroom_id: requiredString(SHORT_TEXT_MAX),
  teacher_reflection: requiredString(LONG_TEXT_MAX),
  artifacts: z.array(ValidatedLessonArtifactSchema).optional(),
  teacher_goal: optionalString(MEDIUM_TEXT_MAX),
});

export const FamilyMessageRequestSchema = z.object({
  classroom_id: requiredString(SHORT_TEXT_MAX),
  student_refs: z.array(requiredString(SHORT_TEXT_MAX)).min(1),
  message_type: z.enum(["routine_update", "missed_work", "praise", "low_stakes_concern"]),
  target_language: requiredString(SHORT_TEXT_MAX),
  context: optionalString(MEDIUM_TEXT_MAX),
});

export const ApproveMessageRequestSchema = z.object({
  classroom_id: requiredString(SHORT_TEXT_MAX),
  draft_id: requiredString(SHORT_TEXT_MAX),
  // F12.5: when the teacher edited the AI draft in the approval dialog,
  // the orchestrator persists the edited text so the audit trail matches
  // what was actually copied to the clipboard. Absent = approved verbatim.
  edited_text: optionalString(MEDIUM_TEXT_MAX),
});

export const InterventionRequestSchema = z.object({
  classroom_id: requiredString(SHORT_TEXT_MAX),
  student_refs: z.array(requiredString(SHORT_TEXT_MAX)).min(1),
  teacher_note: requiredString(MEDIUM_TEXT_MAX),
  context: optionalString(MEDIUM_TEXT_MAX),
});

export const SimplifyRequestSchema = z.object({
  source_text: requiredString(LONG_TEXT_MAX),
  grade_band: requiredString(SHORT_TEXT_MAX),
  eal_level: z.enum(["beginner", "intermediate", "advanced"]),
});

export const VocabCardsRequestSchema = z.object({
  artifact_id: optionalString(SHORT_TEXT_MAX),
  artifact_text: requiredString(LONG_TEXT_MAX),
  subject: requiredString(SHORT_TEXT_MAX),
  target_language: requiredString(SHORT_TEXT_MAX),
  grade_band: requiredString(SHORT_TEXT_MAX),
  curriculum_selection: CurriculumSelectionSchema.optional(),
});

export const SupportPatternsRequestSchema = z.object({
  classroom_id: requiredString(SHORT_TEXT_MAX),
  student_filter: optionalString(SHORT_TEXT_MAX),
  time_window: z.number().int().positive().optional(),
});

export const EABriefingRequestSchema = z.object({
  classroom_id: requiredString(SHORT_TEXT_MAX),
  ea_name: optionalString(SHORT_TEXT_MAX),
});

export const ComplexityForecastRequestSchema = z.object({
  classroom_id: requiredString(SHORT_TEXT_MAX),
  forecast_date: requiredString(SHORT_TEXT_MAX),
  teacher_notes: optionalString(MEDIUM_TEXT_MAX),
});

export const EALoadRequestSchema = z.object({
  classroom_id: requiredString(SHORT_TEXT_MAX),
  target_date: requiredString(SHORT_TEXT_MAX),
  teacher_notes: optionalString(MEDIUM_TEXT_MAX),
});

export const DebtRegisterRequestSchema = z.object({
  stale_followup_days: z.number().int().positive().optional(),
  unapproved_message_days: z.number().int().positive().optional(),
  recurring_plan_min: z.number().int().positive().optional(),
  review_window_days: z.number().int().positive().optional(),
  review_min_records: z.number().int().positive().optional(),
});

export const ScaffoldDecayRequestSchema = z.object({
  classroom_id: requiredString(SHORT_TEXT_MAX),
  student_ref: requiredString(SHORT_TEXT_MAX),
  time_window: z.number().int().min(10).default(20),
});

export const ScheduleUpdateRequestSchema = z.object({
  schedule: z.array(
    z.object({
      time_slot: requiredString(SHORT_TEXT_MAX),
      activity: requiredString(MEDIUM_TEXT_MAX),
      ea_available: z.boolean(),
      ea_student_refs: z.array(requiredString(SHORT_TEXT_MAX)).optional(),
      notes: optionalString(MEDIUM_TEXT_MAX),
    })
  ).min(1),
  upcoming_events: z.array(
    z.object({
      description: requiredString(MEDIUM_TEXT_MAX),
      event_date: optionalString(SHORT_TEXT_MAX),
      time_slot: optionalString(SHORT_TEXT_MAX),
      impacts: optionalString(MEDIUM_TEXT_MAX),
    })
  ).optional(),
});

export const SurvivalPacketRequestSchema = z.object({
  classroom_id: requiredString(SHORT_TEXT_MAX),
  target_date: requiredString(SHORT_TEXT_MAX),
  teacher_notes: optionalString(MEDIUM_TEXT_MAX),
});

export const ExtractWorksheetRequestSchema = z.object({
  classroom_id: requiredString(SHORT_TEXT_MAX),
  image_base64: requiredString(IMAGE_BASE64_MAX),
  mime_type: requiredString(SHORT_TEXT_MAX),
});

// ----- Validation middleware factory -----

export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues.map(
        (i) => `${i.path.join(".")}: ${i.message}`
      );
      sendRouteError(
        res,
        400,
        {
          error: "Invalid request body",
          category: "validation",
          retryable: false,
          detail_code: "request_body_invalid",
        },
        {
          validation_errors: issues,
        },
      );
      return;
    }
    // Replace body with parsed (coerced/stripped) data
    req.body = result.data;
    next();
  };
}
