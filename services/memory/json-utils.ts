/**
 * Shared JSON parsing utility for memory retrieval paths.
 * Skips corrupt records with a warning instead of crashing.
 */
export function safeParseJson<T>(raw: string, label: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`Corrupt ${label} record skipped:`, err instanceof Error ? err.message : err);
    return null;
  }
}
