const LANGUAGE_LABELS: Record<string, string> = {
  ar: "Arabic",
  en: "English",
  es: "Spanish",
  fr: "French",
  pa: "Punjabi",
  tl: "Tagalog",
  uk: "Ukrainian",
  ur: "Urdu",
  zh: "Chinese (Simplified)",
};

export function formatLanguageLabel(code: string | undefined): string {
  if (!code) return "Language not set";
  const normalized = code.toLowerCase();
  return LANGUAGE_LABELS[normalized] ?? code;
}
