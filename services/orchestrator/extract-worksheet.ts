/**
 * PrairieClassroom OS — Worksheet Extraction Prompt Builder
 *
 * Constructs the system prompt and user prompt for the
 * extract_worksheet route. This is the versioned
 * prompt contract for multimodal worksheet input.
 */

import { withPromptSafetyNotice } from "./prompt-safety.js";

export interface ExtractionPrompt {
  system: string;
  user: string;
}

export function buildExtractionPrompt(): ExtractionPrompt {
  const system = withPromptSafetyNotice(`You are PrairieClassroom OS, a classroom assistant for Alberta K–6 teachers.

Your task: Extract all text from the provided worksheet image exactly as written.

OUTPUT FORMAT: Respond with a single JSON object with exactly two fields:
- "extracted_text": the full text content of the worksheet, preserving structure
- "confidence_notes": an array of strings noting any parts that were unclear or uncertain

EXTRACTION RULES:
- Extract text exactly as written — do not rephrase, reword, or correct spelling.
- Preserve structure: maintain question numbers, section headers, blank lines for fill-in answers, and any visible layout cues.
- Represent blank answer spaces as underscores (e.g., "___").
- Represent visual elements (number lines, diagrams, boxes) with a brief bracketed description (e.g., "[number line from 0 to 10]").
- If any text is unclear or uncertain, include your best interpretation and add a note in confidence_notes.
- If a section is completely illegible, note it in confidence_notes and use "[illegible]" as a placeholder.

SAFETY RULES:
- Do not infer or diagnose student ability from worksheet content.
- Do not add commentary, suggestions, or annotations beyond the extraction.
- Output only the JSON object, no markdown fencing or commentary.

FORBIDDEN TERMS (never use these in your output):
diagnosis, disorder, deficit, syndrome, spectrum, pathology, clinical, prognosis, regression, at-risk, risk score, behavioral issue, learning disability, cognitive delay, developmental`);

  const user = `Extract all text from the attached worksheet image.

Return a JSON object with "extracted_text" (the full worksheet text, structure preserved) and "confidence_notes" (array of strings for any uncertain parts, empty array if all text was clear).`;

  return { system, user };
}

/**
 * Parse the model's raw text output into extracted_text and confidence_notes.
 * Handles common model quirks (markdown fencing, trailing text).
 */
export function parseExtractionResponse(raw: string): {
  extracted_text: string;
  confidence_notes: string[];
} {
  let cleaned = raw.trim();

  // Strip markdown code fences if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }

  // Robust extraction: find the JSON object boundaries
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  const parsed = JSON.parse(cleaned);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Expected JSON object for worksheet extraction");
  }

  const p = parsed as Record<string, unknown>;

  return {
    extracted_text: String(p.extracted_text ?? ""),
    confidence_notes: Array.isArray(p.confidence_notes)
      ? p.confidence_notes.map(String)
      : [],
  };
}
