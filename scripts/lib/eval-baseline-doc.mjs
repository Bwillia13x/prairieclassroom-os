export function buildBaselineMarkdown({ mockSection, ollamaSection, geminiSection, vertexSection }) {
  return [
    "# Eval Baseline",
    "",
    "Provider-specific baseline status for the local, hosted, and paid proof lanes.",
    "",
    mockSection,
    "",
    ollamaSection,
    "",
    geminiSection,
    "",
    vertexSection,
  ].join("\n");
}
