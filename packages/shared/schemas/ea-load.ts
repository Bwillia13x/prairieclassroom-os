// packages/shared/schemas/ea-load.ts
/**
 * EALoadProfile — per-block educational-assistant cognitive-load analysis
 * for the next school day. Maps to prompt contract: balance_ea_load.
 *
 * The feature models EA load as a function of student count per block,
 * support intensity inferred from intervention history, transition cost,
 * and historical patterns by time-of-day. It is operational ("this block
 * has overlapping demands for the EA") rather than judgmental, and it
 * never scores EA competence.
 */
import { z } from "zod";

export const EALoadLevelSchema = z.enum(["low", "medium", "high", "break"]);
export type EALoadLevel = z.infer<typeof EALoadLevelSchema>;

export const EALoadBlockSchema = z.object({
  time_slot: z.string(),
  activity: z.string(),
  ea_available: z.boolean(),
  supported_students: z.array(z.string()),
  load_level: EALoadLevelSchema,
  load_factors: z.array(z.string()),
  redistribution_suggestion: z.string().optional(),
});

export type EALoadBlock = z.infer<typeof EALoadBlockSchema>;

export const EALoadProfileSchema = z.object({
  load_id: z.string(),
  classroom_id: z.string(),
  target_date: z.string(),
  blocks: z.array(EALoadBlockSchema),
  alerts: z.array(z.string()),
  overall_summary: z.string(),
  highest_load_block: z.string(),
  schema_version: z.string(),
});

export type EALoadProfile = z.infer<typeof EALoadProfileSchema>;
