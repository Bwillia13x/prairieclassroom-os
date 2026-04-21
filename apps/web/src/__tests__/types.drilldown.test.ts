import { describe, it, expect } from "vitest";
import type { DrillDownContext } from "../types";

function describeContext(ctx: DrillDownContext): string {
  switch (ctx.type) {
    case "forecast-block":
      return `Forecast block ${ctx.blockIndex}`;
    case "ea-load-block":
      return `EA load block ${ctx.blockIndex}`;
    case "student":
      return `Student: ${ctx.alias}`;
    case "student-thread":
      return `Student thread: ${ctx.thread.alias}`;
    case "week-day":
      return `Week day: ${ctx.day.label}`;
    case "queue-state":
      return `Queue: ${ctx.queue.label}`;
    case "coverage-cell":
      return `Coverage: ${ctx.row.alias} ${ctx.cell.label}`;
    case "transition-risk":
      return `Transition risk: ${ctx.risk.time_slot}`;
    case "debt-category":
      return `Debt: ${ctx.category} (${ctx.items.length})`;
    case "panel-status":
      return `Panel status: ${ctx.status.label}`;
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
  it("operating dashboard variants", () => {
    const dayCtx: DrillDownContext = {
      type: "week-day",
      day: {
        id: "2026-04-21",
        label: "Tue",
        date_label: "Apr 21",
        is_today: true,
        source: "schedule",
        blocks: [],
      },
    };
    const queueCtx: DrillDownContext = {
      type: "queue-state",
      queue: {
        id: "family-message",
        label: "Family messages",
        count: 2,
        state: "needs_action",
        target_tab: "family-message",
        detail: "Messages waiting",
      },
    };
    const coverageCtx: DrillDownContext = {
      type: "coverage-cell",
      row: {
        alias: "Maya",
        priority_reason: "Follow-up due",
        thread_count: 1,
        cells: [],
      },
      cell: {
        category: "touchpoint",
        label: "Touch",
        state: "open",
        count: 1,
        detail: "No recent touchpoint",
        target_tab: "log-intervention",
      },
    };
    const riskCtx: DrillDownContext = {
      type: "transition-risk",
      risk: {
        id: "risk-1",
        time_slot: "10:00",
        activity: "Math",
        level: "high",
        reason: "Post-assembly transition",
        mitigation: "Stage first task",
        watchpoints: [],
        target_tab: "complexity-forecast",
      },
    };

    expect(describeContext(dayCtx)).toBe("Week day: Tue");
    expect(describeContext(queueCtx)).toBe("Queue: Family messages");
    expect(describeContext(coverageCtx)).toBe("Coverage: Maya Touch");
    expect(describeContext(riskCtx)).toBe("Transition risk: 10:00");
  });

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
