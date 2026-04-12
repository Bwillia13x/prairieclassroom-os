export const SUPPORTED_SMOKE_CASES = [
  "tomorrow-plan",
  "family-message",
  "support-patterns",
  "ea-briefing",
  "ea-load",
  "complexity-forecast",
  "survival-packet",
];

export function parseSmokeCaseSelection(env = process.env) {
  const raw = env.PRAIRIE_SMOKE_CASES?.trim();
  if (!raw) {
    return [...SUPPORTED_SMOKE_CASES];
  }

  const selected = [...new Set(raw.split(",").map((token) => token.trim()).filter(Boolean))];
  const invalid = selected.filter((name) => !SUPPORTED_SMOKE_CASES.includes(name));
  if (invalid.length > 0) {
    throw new Error(
      `Unknown PRAIRIE_SMOKE_CASES value(s): ${invalid.join(", ")}. Supported cases: ${SUPPORTED_SMOKE_CASES.join(", ")}`,
    );
  }

  return selected;
}
