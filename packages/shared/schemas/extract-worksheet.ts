import { z } from "zod";

export const ExtractWorksheetRequestSchema = z.object({
  classroom_id: z.string().min(1),
  image_base64: z.string().min(1),
  mime_type: z.string().regex(/^image\/(jpeg|png|webp|heic)$/),
});

export const ExtractWorksheetResponseSchema = z.object({
  extracted_text: z.string(),
  confidence_notes: z.array(z.string()),
});

export type ExtractWorksheetRequest = z.infer<typeof ExtractWorksheetRequestSchema>;
export type ExtractWorksheetResponse = z.infer<typeof ExtractWorksheetResponseSchema>;
