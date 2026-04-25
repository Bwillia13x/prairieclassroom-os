import { axe } from "jest-axe";

/**
 * expectNoAxeViolations — run axe on a container and throw a descriptive
 * error if any violations are found. Uses the inline throw approach
 * (rather than toHaveNoViolations) to remain compatible with Vitest's
 * expect.extend surface without needing jest-axe's jest-specific matcher.
 */
export async function expectNoAxeViolations(container: HTMLElement): Promise<void> {
  const results = await axe(container);
  if (results.violations.length > 0) {
    const details = results.violations
      .map(
        (v) =>
          `[${v.id}] ${v.help} (impact: ${v.impact ?? "unknown"})\n` +
          v.nodes
            .slice(0, 2)
            .map((n) => `  html: ${n.html}`)
            .join("\n"),
      )
      .join("\n\n");
    throw new Error(`axe found ${results.violations.length} violation(s):\n\n${details}`);
  }
}
