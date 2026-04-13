import { z } from "zod";

export const CurriculumJurisdictionSchema = z.enum(["ab"]);
export const CurriculumSubjectCodeSchema = z.enum([
  "english_language_arts_and_literature",
  "mathematics",
  "science",
  "social_studies",
]);
export const CurriculumGradeSchema = z.enum(["K", "1", "2", "3", "4", "5", "6"]);
export const CurriculumSourceKindSchema = z.enum(["subject_overview", "grade_at_a_glance"]);
export const CurriculumImplementationStatusSchema = z.enum(["implemented", "optional", "planned"]);

export const CurriculumFocusItemSchema = z.object({
  focus_id: z.string(),
  text: z.string(),
});

export const CurriculumEntrySchema = z.object({
  entry_id: z.string(),
  jurisdiction: CurriculumJurisdictionSchema,
  subject_code: CurriculumSubjectCodeSchema,
  subject_label: z.string(),
  grade: CurriculumGradeSchema,
  grade_label: z.string(),
  title: z.string(),
  summary: z.string(),
  focus_items: z.array(CurriculumFocusItemSchema).min(1),
  implementation_status: CurriculumImplementationStatusSchema,
  implementation_notes: z.string().optional(),
  source_kind: CurriculumSourceKindSchema,
  source_title: z.string(),
  source_url: z.string().url(),
  source_updated_at: z.string(),
  last_verified_at: z.string(),
});

export const CurriculumSelectionSchema = z.object({
  entry_id: z.string().min(1),
  selected_focus_ids: z.array(z.string().min(1)).min(1).max(3),
});

export type CurriculumJurisdiction = z.infer<typeof CurriculumJurisdictionSchema>;
export type CurriculumSubjectCode = z.infer<typeof CurriculumSubjectCodeSchema>;
export type CurriculumGrade = z.infer<typeof CurriculumGradeSchema>;
export type CurriculumSourceKind = z.infer<typeof CurriculumSourceKindSchema>;
export type CurriculumImplementationStatus = z.infer<typeof CurriculumImplementationStatusSchema>;
export type CurriculumFocusItem = z.infer<typeof CurriculumFocusItemSchema>;
export type CurriculumEntry = z.infer<typeof CurriculumEntrySchema>;
export type CurriculumSelection = z.infer<typeof CurriculumSelectionSchema>;
