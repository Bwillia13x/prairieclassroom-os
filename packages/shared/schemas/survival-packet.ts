// packages/shared/schemas/survival-packet.ts
/**
 * SurvivalPacket — structured substitute teacher briefing.
 * Synthesizes all classroom memory into a printable handoff document.
 * Maps to prompt contract K: generate_survival_packet.
 */
import { z } from "zod";

export const RoutineEntrySchema = z.object({
  time_or_label: z.string(),
  description: z.string(),
  recent_changes: z.string().optional(),
});

export type RoutineEntry = z.infer<typeof RoutineEntrySchema>;

export const StudentSupportEntrySchema = z.object({
  student_ref: z.string(),
  current_scaffolds: z.array(z.string()),
  key_strategies: z.string(),
  things_to_avoid: z.string().optional(),
});

export type StudentSupportEntry = z.infer<typeof StudentSupportEntrySchema>;

export const EACoordinationSchema = z.object({
  ea_name: z.string().optional(),
  schedule_summary: z.string(),
  primary_students: z.array(z.string()),
  if_ea_absent: z.string(),
});

export type EACoordination = z.infer<typeof EACoordinationSchema>;

export const SimplifiedDayPlanSchema = z.object({
  time_slot: z.string(),
  activity: z.string(),
  sub_instructions: z.string(),
  materials_location: z.string().optional(),
});

export type SimplifiedDayPlan = z.infer<typeof SimplifiedDayPlanSchema>;

export const FamilyCommsEntrySchema = z.object({
  student_ref: z.string(),
  status: z.enum(["do_not_contact", "defer_to_teacher", "routine_ok", "expecting_message"]),
  language_preference: z.string().optional(),
  notes: z.string(),
});

export type FamilyCommsEntry = z.infer<typeof FamilyCommsEntrySchema>;

export const ComplexityPeakSchema = z.object({
  time_slot: z.string(),
  level: z.enum(["low", "medium", "high"]),
  reason: z.string(),
  mitigation: z.string(),
});

export type ComplexityPeak = z.infer<typeof ComplexityPeakSchema>;

export const SurvivalPacketSchema = z.object({
  packet_id: z.string(),
  classroom_id: z.string(),
  generated_for_date: z.string(),
  routines: z.array(RoutineEntrySchema),
  student_support: z.array(StudentSupportEntrySchema),
  ea_coordination: EACoordinationSchema,
  simplified_day_plan: z.array(SimplifiedDayPlanSchema),
  family_comms: z.array(FamilyCommsEntrySchema),
  complexity_peaks: z.array(ComplexityPeakSchema),
  heads_up: z.array(z.string()),
  schema_version: z.string(),
});

export type SurvivalPacket = z.infer<typeof SurvivalPacketSchema>;
