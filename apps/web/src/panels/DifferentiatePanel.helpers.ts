import type { DifferentiatedVariant } from "../types";

export function serializeVariantsToPlainText(
  artifactTitle: string,
  variants: DifferentiatedVariant[],
): string {
  const header = artifactTitle || "Differentiated variants";
  const sections = variants.map(
    (v) => `— Variant: ${v.variant_type} —\n${v.student_facing_instructions ?? ""}`,
  );
  return [header, "", sections.join("\n\n---\n\n")].join("\n");
}

export function serializeVariantsToMarkdown(
  artifactTitle: string,
  variants: DifferentiatedVariant[],
): string {
  const header = `# ${artifactTitle || "Differentiated variants"}\n`;
  const sections = variants
    .map((v) => `## Variant: ${v.variant_type}\n\n${v.student_facing_instructions ?? ""}\n`)
    .join("\n");
  return `${header}\n${sections}`;
}

export function summarizeVariantsForTomorrow(
  artifactTitle: string,
  variants: DifferentiatedVariant[],
): string {
  const counts: Record<string, number> = {};
  for (const v of variants) {
    counts[v.variant_type] = (counts[v.variant_type] ?? 0) + 1;
  }
  const parts = Object.entries(counts)
    .map(([k, n]) => `${k}: ${n}`)
    .join(", ");
  return `${variants.length} variants for '${artifactTitle || "lesson"}' — ${parts}`;
}
