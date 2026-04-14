import { describe, it, expect } from "vitest";
import type { DrillDownContext } from "../types";

function describeContext(ctx: DrillDownContext): string {
  switch (ctx.type) {
    case "forecast-block":
      return `Forecast block ${ctx.blockIndex}`;
    case "student":
      return `Student: ${ctx.alias}`;
    case "debt-category":
      return `Debt: ${ctx.category} (${ctx.items.length})`;
    case "trend":
      return `Trend: ${ctx.label}`;
    case "plan-coverage-section":
      return `Plan section: ${ctx.label} (${ctx.items.length} items)`;
    case "student-tag-group":
      return `Tag group: ${ctx.label} (${ctx.students.length} students)`;
    case "variant-lane":
      return `Variant lane: ${ctx.label} (${ctx.variants.length} variants)`;
  }
}

describe("DrillDownContext — new variants compile and describe", () => {
  it("plan-coverage-section", () => {
    const ctx: DrillDownContext = {
      type: "plan-coverage-section",
      section: "watchpoints",
      label: "Watchpoints",
      items: ["Keep Maya on chunked task", "Ranbir: sensory cue"],
    };
    expect(describeContext(ctx)).toBe("Plan section: Watchpoints (2 items)");
  });

  it("student-tag-group", () => {
    const ctx: DrillDownContext = {
      type: "student-tag-group",
      groupKind: "eal",
      tag: "eal_level_2",
      label: "EAL Level 2",
      students: [
        { alias: "Maya", eal_flag: true },
        { alias: "Ranbir", eal_flag: true },
      ],
    };
    expect(describeContext(ctx)).toBe("Tag group: EAL Level 2 (2 students)");
  });

  it("variant-lane", () => {
    const ctx: DrillDownContext = {
      type: "variant-lane",
      variantType: "eal_supported",
      label: "EAL Supported",
      variants: [
        { variant_type: "eal_supported", estimated_minutes: 20, title: "Scaffolded" },
      ],
    };
    expect(describeContext(ctx)).toBe("Variant lane: EAL Supported (1 variants)");
  });
});
