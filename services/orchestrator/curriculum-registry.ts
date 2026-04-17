import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CurriculumEntrySchema,
  type CurriculumEntry,
  type CurriculumSelection,
  type CurriculumSubjectCode,
} from "../../packages/shared/schemas/curriculum.js";
import type { ClassroomProfile } from "../../packages/shared/schemas/classroom.js";

const CATALOG_PATH = resolve(
  fileURLToPath(new URL("../../data/curriculum/alberta/catalog.json", import.meta.url)),
);

let cachedEntries: CurriculumEntry[] | null = null;

const SUBJECT_KEYWORDS: Record<CurriculumSubjectCode, string[]> = {
  english_language_arts_and_literature: [
    "read",
    "reading",
    "write",
    "writing",
    "sentence",
    "story",
    "poem",
    "character",
    "plot",
    "grammar",
    "punctuation",
    "vocabulary",
  ],
  mathematics: [
    "add",
    "subtract",
    "multiply",
    "divide",
    "fraction",
    "decimal",
    "equation",
    "clock",
    "graph",
    "shape",
    "angle",
    "measure",
  ],
  science: [
    "investigate",
    "observe",
    "experiment",
    "force",
    "gravity",
    "magnet",
    "ecosystem",
    "energy",
    "planet",
    "habitat",
    "water cycle",
    "evidence",
  ],
  social_studies: [
    "community",
    "government",
    "citizen",
    "history",
    "alberta",
    "canada",
    "resources",
    "trade",
    "democracy",
    "tradition",
    "culture",
    "boundary",
  ],
};

export interface HydratedCurriculumSelection {
  entry: CurriculumEntry;
  focusItems: CurriculumEntry["focus_items"];
}

export interface CurriculumOutcomeLookupInput {
  grade: string;
  subject: string;
  keyword: string;
  limit?: number;
}

export interface CurriculumOutcomeLookupMatch {
  entry_id: string;
  subject_code: CurriculumSubjectCode;
  subject_label: string;
  grade: string;
  grade_label: string;
  focus_id: string;
  focus_text: string;
  implementation_status: CurriculumEntry["implementation_status"];
  implementation_notes?: string;
  source_title: string;
  source_url: string;
}

export interface CurriculumOutcomeLookupResult {
  matched: boolean;
  query: {
    grade: string;
    subject: string;
    keyword: string;
  };
  matches: CurriculumOutcomeLookupMatch[];
  message: string;
}

function loadCatalog(): CurriculumEntry[] {
  if (cachedEntries) return cachedEntries;
  const raw = JSON.parse(readFileSync(CATALOG_PATH, "utf-8")) as unknown[];
  cachedEntries = raw.map((entry) => CurriculumEntrySchema.parse(entry));
  return cachedEntries;
}

export function listCurriculumEntries(filters?: {
  subjectCode?: string;
  grade?: string;
}): CurriculumEntry[] {
  const entries = loadCatalog();
  return entries.filter((entry) => {
    if (filters?.subjectCode && entry.subject_code !== filters.subjectCode) return false;
    if (filters?.grade && entry.grade !== filters.grade) return false;
    return true;
  });
}

export function listCurriculumSubjects() {
  return Array.from(
    new Map(
      loadCatalog().map((entry) => [entry.subject_code, {
        subject_code: entry.subject_code,
        subject_label: entry.subject_label,
      }]),
    ).values(),
  );
}

export function getCurriculumEntry(entryId: string): CurriculumEntry | undefined {
  return loadCatalog().find((entry) => entry.entry_id === entryId);
}

export function resolveCurriculumSelection(
  selection?: CurriculumSelection,
): HydratedCurriculumSelection | null {
  if (!selection) return null;
  const entry = getCurriculumEntry(selection.entry_id);
  if (!entry) return null;
  const focusItems = selection.selected_focus_ids
    .map((focusId) => entry.focus_items.find((item) => item.focus_id === focusId))
    .filter((item): item is CurriculumEntry["focus_items"][number] => Boolean(item));

  if (focusItems.length !== selection.selected_focus_ids.length) {
    return null;
  }

  return { entry, focusItems };
}

export function formatCurriculumSelectionForPrompt(
  hydrated?: HydratedCurriculumSelection | null,
): string | null {
  if (!hydrated) return null;
  const { entry, focusItems } = hydrated;
  const focusLines = focusItems.map((item) => `- ${item.text}`).join("\n");
  const implementation =
    entry.implementation_status === "implemented"
      ? "Current Alberta implementation"
      : entry.implementation_notes ?? `Implementation status: ${entry.implementation_status}`;

  return [
    `ALBERTA CURRICULUM ALIGNMENT: ${entry.subject_label} ${entry.grade_label}`,
    `Focus: ${entry.title}`,
    `Summary: ${entry.summary}`,
    focusLines,
    `Implementation: ${implementation}`,
    `Source: ${entry.source_title} (${entry.source_url})`,
  ].join("\n");
}

function extractGrades(gradeBand: string): string[] {
  const matches = gradeBand.match(/K|\d+/g);
  return matches ? matches.map((match) => match.toUpperCase()) : [];
}

function inferSubjectCodes(subjectText: string): CurriculumSubjectCode[] {
  const lowered = subjectText.toLowerCase();
  const matches = new Set<CurriculumSubjectCode>();

  if (/\b(ela|english|language|literacy|reading|writing)\b/.test(lowered)) {
    matches.add("english_language_arts_and_literature");
  }
  if (/\b(math|mathematics|numeracy|number|algebra|geometry)\b/.test(lowered)) {
    matches.add("mathematics");
  }
  if (/\b(science|stem|experiment|investigation)\b/.test(lowered)) {
    matches.add("science");
  }
  if (/\b(social|history|geography|citizenship|community|social studies)\b/.test(lowered)) {
    matches.add("social_studies");
  }

  return Array.from(matches);
}

function scoreEntry(
  entry: CurriculumEntry,
  classroom: ClassroomProfile,
  extractedText: string,
): number {
  let score = 0;
  const classroomGrades = new Set(extractGrades(classroom.grade_band));
  if (classroomGrades.has(entry.grade)) score += 5;
  const classroomSubjectCodes = inferSubjectCodes(classroom.subject_focus);

  const lowered = extractedText.toLowerCase();
  for (const keyword of SUBJECT_KEYWORDS[entry.subject_code]) {
    if (lowered.includes(keyword)) score += keyword.includes(" ") ? 3 : 1;
  }

  if (classroomSubjectCodes.includes(entry.subject_code)) score += 4;
  if (classroom.subject_focus === "cross_curricular") score += 1;
  return score;
}

export function suggestCurriculumEntries(
  classroom: ClassroomProfile,
  extractedText: string,
  limit = 3,
): CurriculumEntry[] {
  return loadCatalog()
    .map((entry) => ({ entry, score: scoreEntry(entry, classroom, extractedText) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.entry.subject_label.localeCompare(b.entry.subject_label))
    .slice(0, limit)
    .map(({ entry }) => entry);
}

function normalizeLookupGrade(rawGrade: string): string {
  const normalized = rawGrade.trim().toUpperCase();
  if (normalized === "K" || normalized === "KINDERGARTEN") return "K";
  const digit = normalized.match(/\d+/)?.[0];
  return digit ?? normalized;
}

function normalizeLookupSubject(rawSubject: string): CurriculumSubjectCode | null {
  const lowered = rawSubject.trim().toLowerCase().replace(/[_-]+/g, " ");
  if (!lowered) return null;
  if (/\b(ela|english|language arts|literacy|reading|writing)\b/.test(lowered)) {
    return "english_language_arts_and_literature";
  }
  if (/\b(math|mathematics|numeracy|number|fractions?|geometry|algebra)\b/.test(lowered)) {
    return "mathematics";
  }
  if (/\b(science|stem|ecosystem|energy|forces?|matter)\b/.test(lowered)) {
    return "science";
  }
  if (/\b(social|social studies|history|geography|citizenship|community)\b/.test(lowered)) {
    return "social_studies";
  }

  const exact = loadCatalog().find(
    (entry) =>
      entry.subject_code === rawSubject ||
      entry.subject_label.toLowerCase() === rawSubject.trim().toLowerCase(),
  );
  return exact?.subject_code ?? null;
}

function scoreFocusText(entry: CurriculumEntry, focusText: string, keyword: string): number {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return 0;
  const focusHaystack = focusText.toLowerCase();
  const entryHaystack = [entry.title, entry.summary].join(" ").toLowerCase();

  if (focusHaystack.includes(normalizedKeyword)) return 20;
  if (entryHaystack.includes(normalizedKeyword)) return 4;

  const terms = normalizedKeyword.split(/\s+/).filter((term) => term.length >= 3);
  return terms.reduce((score, term) => {
    if (focusHaystack.includes(term)) return score + 4;
    if (entryHaystack.includes(term)) return score + 1;
    return score;
  }, 0);
}

export function lookupCurriculumOutcome(
  input: CurriculumOutcomeLookupInput,
): CurriculumOutcomeLookupResult {
  const grade = normalizeLookupGrade(input.grade);
  const subjectCode = normalizeLookupSubject(input.subject);
  const keyword = input.keyword.trim();
  const limit = Math.max(1, Math.min(input.limit ?? 3, 5));

  if (!subjectCode) {
    return {
      matched: false,
      query: { grade, subject: input.subject, keyword },
      matches: [],
      message: `No Alberta curriculum subject matched "${input.subject}".`,
    };
  }

  const candidates = listCurriculumEntries({ subjectCode, grade })
    .flatMap((entry) =>
      entry.focus_items.map((focus) => ({
        entry,
        focus,
        score: scoreFocusText(entry, focus.text, keyword),
      })),
    )
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.focus.focus_id.localeCompare(b.focus.focus_id))
    .slice(0, limit);

  const matches = candidates.map(({ entry, focus }) => ({
    entry_id: entry.entry_id,
    subject_code: entry.subject_code,
    subject_label: entry.subject_label,
    grade: entry.grade,
    grade_label: entry.grade_label,
    focus_id: focus.focus_id,
    focus_text: focus.text,
    implementation_status: entry.implementation_status,
    implementation_notes: entry.implementation_notes,
    source_title: entry.source_title,
    source_url: entry.source_url,
  }));

  return {
    matched: matches.length > 0,
    query: { grade, subject: input.subject, keyword },
    matches,
    message: matches.length
      ? `Found ${matches.length} Alberta curriculum focus item(s) for grade ${grade} ${input.subject}.`
      : `No Alberta curriculum focus item matched "${keyword}" for grade ${grade} ${input.subject}.`,
  };
}
