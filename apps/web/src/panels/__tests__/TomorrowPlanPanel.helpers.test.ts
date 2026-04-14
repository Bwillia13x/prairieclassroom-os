import { describe, it, expect } from "vitest";
import type { TomorrowPlan } from "../../types";
import {
  serializePlanToPlainText,
  serializePlanToEABriefingSummary,
} from "../TomorrowPlanPanel.helpers";

/** Minimal fixture matching the real TomorrowPlan schema. */
const FIXTURE: TomorrowPlan = {
  plan_id: "plan-2026-04-14",
  classroom_id: "demo-classroom",
  source_artifact_ids: [],
  transition_watchpoints: [
    {
      time_or_activity: "Morning entry",
      risk_description: "Jaylen struggles with transitions",
      suggested_mitigation: "Meet Jaylen at the door",
    },
  ],
  support_priorities: [
    {
      student_ref: "Amira",
      reason: "Missed yesterday's math block",
      suggested_action: "Pull-out review during free choice",
    },
  ],
  ea_actions: [
    {
      description: "Support Jaylen during guided reading",
      student_refs: ["Jaylen"],
      timing: "9:15–10:00",
    },
    {
      description: "Check in on Milo's sentence starters",
      student_refs: ["Milo"],
      timing: "After lunch",
    },
  ],
  prep_checklist: ["Print differentiated worksheets", "Arrange flexible seating"],
  family_followups: [
    {
      student_ref: "Amira",
      reason: "Parent asked about math progress",
      message_type: "routine_update",
    },
  ],
  schema_version: "1",
};

describe("serializePlanToPlainText", () => {
  it("includes all section headers", () => {
    const text = serializePlanToPlainText(FIXTURE);
    expect(text).toContain("# Tomorrow's Plan");
    expect(text).toContain("## Transition Watchpoints");
    expect(text).toContain("## Support Priorities");
    expect(text).toContain("## EA Actions");
    expect(text).toContain("## Prep Checklist");
    expect(text).toContain("## Family Follow-ups");
  });

  it("includes data from all sections", () => {
    const text = serializePlanToPlainText(FIXTURE);
    expect(text).toContain("Morning entry");
    expect(text).toContain("Meet Jaylen at the door");
    expect(text).toContain("Amira");
    expect(text).toContain("Pull-out review during free choice");
    expect(text).toContain("Support Jaylen during guided reading");
    expect(text).toContain("9:15–10:00");
    expect(text).toContain("Print differentiated worksheets");
    expect(text).toContain("Parent asked about math progress");
  });

  it("handles empty sections gracefully", () => {
    const emptyPlan: TomorrowPlan = {
      ...FIXTURE,
      transition_watchpoints: [],
      support_priorities: [],
      ea_actions: [],
      prep_checklist: [],
      family_followups: [],
    };
    const text = serializePlanToPlainText(emptyPlan);
    expect(text).toContain("(none)");
    expect(text).toContain("## Transition Watchpoints");
  });
});

describe("serializePlanToEABriefingSummary", () => {
  it("includes the count of EA actions in the header", () => {
    const summary = serializePlanToEABriefingSummary(FIXTURE);
    expect(summary).toContain("Tomorrow's EA actions (2):");
  });

  it("lists up to 5 priority EA actions", () => {
    const summary = serializePlanToEABriefingSummary(FIXTURE);
    expect(summary).toContain("Support Jaylen during guided reading");
    expect(summary).toContain("Check in on Milo's sentence starters");
  });

  it("shows overflow notice when more than 5 EA actions exist", () => {
    const manyActions: TomorrowPlan = {
      ...FIXTURE,
      ea_actions: Array.from({ length: 7 }, (_, i) => ({
        description: `Action ${i + 1}`,
        student_refs: ["Student"],
        timing: "Morning",
      })),
    };
    const summary = serializePlanToEABriefingSummary(manyActions);
    expect(summary).toContain("...and 2 more");
  });

  it("handles zero EA actions gracefully", () => {
    const noPlan: TomorrowPlan = { ...FIXTURE, ea_actions: [] };
    const summary = serializePlanToEABriefingSummary(noPlan);
    expect(summary).toContain("Tomorrow's EA actions (0):");
    expect(summary).toContain("No EA actions planned.");
  });
});
