import type { ClassroomProfile } from "../types";

const LANGUAGE_NAME_TO_CODE: Record<string, string> = {
  spanish: "es",
  arabic: "ar",
  punjabi: "pa",
  tagalog: "tl",
  filipino: "tl",
  chinese: "zh",
  mandarin: "zh",
  cantonese: "zh",
  french: "fr",
  urdu: "ur",
  somali: "so",
  vietnamese: "vi",
  korean: "ko",
};

export function mostCommonFamilyLanguage(
  students: ClassroomProfile["students"],
): string | null {
  if (students.length === 0) return null;
  const counts = new Map<string, number>();
  for (const s of students) {
    const raw = (s.family_language ?? "").trim();
    if (!raw || raw.toLowerCase() === "english") continue;
    counts.set(raw, (counts.get(raw) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  let best: string | null = null;
  let bestCount = 0;
  for (const [lang, count] of counts) {
    if (count > bestCount) {
      best = lang;
      bestCount = count;
    }
  }
  return best;
}

export function pickDefaultTargetLanguage(profile: ClassroomProfile | null): string {
  if (!profile) return "es";
  const top = mostCommonFamilyLanguage(profile.students);
  if (!top) return "es";
  const code = LANGUAGE_NAME_TO_CODE[top.toLowerCase()];
  return code ?? "es";
}

export function pickDefaultGradeBand(profile: ClassroomProfile | null): string {
  if (!profile) return "Grade 4";
  const match = profile.grade_band.match(/\b([1-6K])\b/i);
  if (!match) return "Grade 4";
  const token = match[1].toUpperCase();
  return token === "K" ? "Kindergarten" : `Grade ${token}`;
}

export function topFamilyLanguages(
  students: { family_language?: string }[],
): string[] {
  const counts = new Map<string, number>();
  for (const s of students) {
    const raw = (s.family_language ?? "").trim();
    if (!raw || raw.toLowerCase() === "english") continue;
    counts.set(raw, (counts.get(raw) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang);
}
