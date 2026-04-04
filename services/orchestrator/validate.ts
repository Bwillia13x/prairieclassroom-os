/**
 * Request validation schemas for all orchestrator API routes.
 * Uses Zod for runtime validation at the API boundary.
 */
import { z } from "zod";
import { LessonArtifactSchema } from "../../packages/shared/schemas/artifact.js";
import type { Request, Response, NextFunction } from "express";

// ----- Request body schemas -----

export const DifferentiateRequestSchema = z.object({
  artifact: LessonArtifactSchema,
  classroom_id: z.string().min(1),
  teacher_goal: z.string().optional(),
});

export const TomorrowPlanRequestSchema = z.object({
  classroom_id: z.string().min(1),
  teacher_reflection: z.string().min(1),
  artifacts: z.array(LessonArtifactSchema).optional(),
  teacher_goal: z.string().optional(),
});

export const FamilyMessageRequestSchema = z.object({
  classroom_id: z.string().min(1),
  student_refs: z.array(z.string()).min(1),
  message_type: z.enum(["routine_update", "missed_work", "praise", "low_stakes_concern"]),
  target_language: z.string().min(1),
  context: z.string().optional(),
});

export const ApproveMessageRequestSchema = z.object({
  classroom_id: z.string().min(1),
  draft_id: z.string().min(1),
});

export const InterventionRequestSchema = z.object({
  classroom_id: z.string().min(1),
  student_refs: z.array(z.string()).min(1),
  teacher_note: z.string().min(1),
  context: z.string().optional(),
});

export const SimplifyRequestSchema = z.object({
  source_text: z.string().min(1),
  grade_band: z.string().min(1),
  eal_level: z.enum(["beginner", "intermediate", "advanced"]),
});

export const VocabCardsRequestSchema = z.object({
  artifact_id: z.string().optional(),
  artifact_text: z.string().min(1),
  subject: z.string().min(1),
  target_language: z.string().min(1),
  grade_band: z.string().min(1),
});

export const SupportPatternsRequestSchema = z.object({
  classroom_id: z.string().min(1),
  student_filter: z.string().optional(),
  time_window: z.number().int().positive().optional(),
});

export const EABriefingRequestSchema = z.object({
  classroom_id: z.string().min(1),
  ea_name: z.string().optional(),
});

export const ComplexityForecastRequestSchema = z.object({
  classroom_id: z.string().min(1),
  forecast_date: z.string().min(1),
  teacher_notes: z.string().optional(),
});

export const DebtRegisterRequestSchema = z.object({
  stale_followup_days: z.number().int().positive().optional(),
  unapproved_message_days: z.number().int().positive().optional(),
  recurring_plan_min: z.number().int().positive().optional(),
  review_window_days: z.number().int().positive().optional(),
  review_min_records: z.number().int().positive().optional(),
});

export const ScaffoldDecayRequestSchema = z.object({
  classroom_id: z.string().min(1),
  student_ref: z.string().min(1),
  time_window: z.number().int().min(10).default(20),
});

export const ScheduleUpdateRequestSchema = z.object({
  schedule: z.array(
    z.object({
      time_slot: z.string().min(1),
      activity: z.string().min(1),
      ea_available: z.boolean(),
      ea_student_refs: z.array(z.string()).optional(),
      notes: z.string().optional(),
    })
  ).min(1),
  upcoming_events: z.array(
    z.object({
      description: z.string().min(1),
      event_date: z.string().optional(),
      time_slot: z.string().optional(),
      impacts: z.string().optional(),
    })
  ).optional(),
});

// ----- Validation middleware factory -----

export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues.map(
        (i) => `${i.path.join(".")}: ${i.message}`
      );
      res.status(400).json({
        error: "Invalid request body",
        validation_errors: issues,
      });
      return;
    }
    // Replace body with parsed (coerced/stripped) data
    req.body = result.data;
    next();
  };
}
