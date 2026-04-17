/**
 * readingLevel.ts — Flesch-Kincaid grade-level estimate for variant text.
 *
 * The structured walkthrough (Scenario 2) flagged that differentiation
 * variants don't show reading level, so a teacher can't quickly judge
 * whether a variant matches a student's band before printing it. This
 * estimator produces the rough number on the variant card without any
 * external dependency.
 *
 * Formula: Flesch-Kincaid Grade Level
 *   FKGL = 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
 *
 * The estimator is heuristic, not authoritative. It rounds to one decimal
 * and clamps to [0, 16] so single-word variants and edge cases produce a
 * sensible chip rather than NaN. We display this as "~Grade N" so the
 * teacher reads it as a hint, not a measurement.
 */

const VOWEL_GROUPS = /[aeiouy]+/g;

export function estimateGradeLevel(text: string): number | null {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return null;

  const sentenceCount = countSentences(trimmed);
  const words = trimmed.match(/\S+/g) ?? [];
  if (words.length === 0 || sentenceCount === 0) return null;

  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  if (syllables === 0) return null;

  const wordsPerSentence = words.length / sentenceCount;
  const syllablesPerWord = syllables / words.length;
  const raw = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59;

  const clamped = Math.max(0, Math.min(16, raw));
  return Math.round(clamped * 10) / 10;
}

export function describeGradeLevel(grade: number): string {
  if (grade < 1) return "Pre-K reading band";
  if (grade < 3) return "Early elementary reading band";
  if (grade < 6) return "Mid elementary reading band";
  if (grade < 9) return "Middle-school reading band";
  return "High-school+ reading band";
}

function countSentences(text: string): number {
  // Count terminal punctuation; treat fragmented text without
  // terminators as one sentence so we never divide by zero.
  const matches = text.match(/[.!?]+/g);
  return matches?.length || 1;
}

function countSyllables(rawWord: string): number {
  const word = rawWord
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .replace(/e$/, "");
  if (!word) return 0;
  const groups = word.match(VOWEL_GROUPS);
  return Math.max(1, groups?.length ?? 0);
}
