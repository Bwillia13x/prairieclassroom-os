import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TodayStory, { composeStory } from "../TodayStory";
import type {
  TodaySnapshot,
  ClassroomHealth,
  StudentSummary,
  ComplexityForecast,
  DebtItem,
} from "../../types";

function makeForecast(
  peak: "low" | "medium" | "high" = "high",
): ComplexityForecast {
  return {
    forecast_id: "fc-1",
    classroom_id: "demo",
    forecast_date: "2026-04-13",
    overall_summary: "",
    highest_risk_block: "10:00-10:45",
    schema_version: "1.0",
    blocks: [
      {
        time_slot: "09:00-09:45",
        activity: "Literacy",
        level: "medium",
        contributing_factors: [],
        suggested_mitigation: "",
      },
      {
        time_slot: "10:00-10:45",
        activity: "Math",
        level: peak,
        contributing_factors: [],
        suggested_mitigation: "",
      },
    ],
  };
}

function makeDebtItem(
  category: DebtItem["category"],
  ref: string,
  age = 2,
): DebtItem {
  return {
    category,
    student_refs: [ref],
    description: "",
    source_record_id: `${category}-${ref}`,
    age_days: age,
    suggested_action: "",
  };
}

function makeSnapshot(overrides: Partial<TodaySnapshot> = {}): TodaySnapshot {
  return {
    debt_register: {
      register_id: "r1",
      classroom_id: "demo",
      items: [],
      item_count_by_category: {},
      generated_at: "2026-04-13T00:00:00Z",
      schema_version: "1.0",
    },
    latest_plan: null,
    latest_forecast: null,
    student_count: 3,
    last_activity_at: null,
    ...overrides,
  } as TodaySnapshot;
}

function makeHealth(
  streak = 0,
  planToday = false,
): ClassroomHealth {
  const plans7 = [planToday, false, false, false, false, false, false];
  return {
    streak_days: streak,
    plans_last_7: plans7,
    messages_approved: 0,
    messages_total: 0,
    trends: {
      debt_total_14d: [],
      plans_14d: [],
      peak_complexity_14d: [],
    },
  };
}

describe("composeStory template rules", () => {
  it("returns the empty state lede when there is no snapshot", () => {
    const story = composeStory({
      snapshot: null,
      health: null,
      students: [],
    });
    expect(story.tone).toBe("empty");
    expect(story.lede).toMatch(/first plan/i);
  });

  it("treats a heavy queue + high block as a 'real test' story", () => {
    const story = composeStory({
      snapshot: makeSnapshot({
        debt_register: {
          register_id: "r",
          classroom_id: "demo",
          items: [
            makeDebtItem("unapproved_message", "Amira"),
            makeDebtItem("stale_followup", "Brody", 6),
            makeDebtItem("stale_followup", "Amira", 4),
            makeDebtItem("unaddressed_pattern", "Farid", 2),
          ],
          item_count_by_category: {},
          generated_at: "",
          schema_version: "1.0",
        } as TodaySnapshot["debt_register"],
        latest_forecast: makeForecast("high"),
      }),
      health: makeHealth(1, true),
      students: [],
    });
    expect(story.tone).toBe("focus");
    expect(story.lede).toMatch(/real test/i);
    expect(story.sub).toMatch(/Amira/);
  });

  it("points focus at the first priority student when there is a high block + small queue", () => {
    const story = composeStory({
      snapshot: makeSnapshot({
        debt_register: {
          register_id: "r",
          classroom_id: "demo",
          items: [makeDebtItem("unapproved_message", "Amira")],
          item_count_by_category: {},
          generated_at: "",
          schema_version: "1.0",
        } as TodaySnapshot["debt_register"],
        latest_forecast: makeForecast("high"),
      }),
      health: makeHealth(1, true),
      students: [],
    });
    expect(story.tone).toBe("focus");
    expect(story.lede).toMatch(/Amira/);
    expect(story.sub).toMatch(/10:00/);
    expect(story.sub).toMatch(/math/i);
  });

  it("names pending threads with no high block as a 'watch' story", () => {
    const story = composeStory({
      snapshot: makeSnapshot({
        debt_register: {
          register_id: "r",
          classroom_id: "demo",
          items: [makeDebtItem("stale_followup", "Brody", 4)],
          item_count_by_category: {},
          generated_at: "",
          schema_version: "1.0",
        } as TodaySnapshot["debt_register"],
        latest_forecast: makeForecast("medium"),
      }),
      health: makeHealth(1, true),
      students: [],
    });
    expect(story.tone).toBe("watch");
    expect(story.lede).toMatch(/one thread/i);
    expect(story.sub).toMatch(/Brody/);
  });

  it("returns a calm story when the queue is clear and streak is healthy", () => {
    const story = composeStory({
      snapshot: makeSnapshot({
        latest_forecast: makeForecast("low"),
      }),
      health: makeHealth(5, true),
      students: [],
    });
    expect(story.tone).toBe("calm");
    expect(story.lede).toMatch(/breathe/i);
    expect(story.sub).toMatch(/5-day streak/);
  });

  it("returns a watch story when the queue is clear but a high block looms", () => {
    const story = composeStory({
      snapshot: makeSnapshot({
        latest_forecast: makeForecast("high"),
      }),
      health: makeHealth(2, true),
      students: [],
    });
    expect(story.tone).toBe("watch");
    expect(story.lede).toMatch(/carries weight/i);
  });

  it("falls back to a quiet-queue story with no pending and no streak", () => {
    const story = composeStory({
      snapshot: makeSnapshot({ latest_forecast: makeForecast("low") }),
      health: makeHealth(0, false),
      students: [],
    });
    expect(story.tone).toBe("calm");
    expect(story.lede).toMatch(/quiet queue/i);
  });

  it("falls back to the first high block when highest_risk_block doesn't name a real block", () => {
    const story = composeStory({
      snapshot: makeSnapshot({
        debt_register: {
          register_id: "r",
          classroom_id: "demo",
          items: [makeDebtItem("unapproved_message", "Amira")],
          item_count_by_category: {},
          generated_at: "",
          schema_version: "1.0",
        } as TodaySnapshot["debt_register"],
        latest_forecast: {
          forecast_id: "f",
          classroom_id: "demo",
          forecast_date: "2026-04-13",
          overall_summary: "",
          // Intentionally broken — refers to a block that doesn't exist
          highest_risk_block: "99:00-99:45",
          schema_version: "1.0",
          blocks: [
            {
              time_slot: "09:00-09:45",
              activity: "Literacy",
              level: "medium",
              contributing_factors: [],
              suggested_mitigation: "",
            },
            {
              time_slot: "10:00-10:45",
              activity: "Math",
              level: "high",
              contributing_factors: [],
              suggested_mitigation: "",
            },
          ],
        },
      }),
      health: makeHealth(1, true),
      students: [],
    });
    expect(story.tone).toBe("focus");
    expect(story.lede).toMatch(/Amira/);
    // Should still reference the real high block by time slot.
    expect(story.sub).toMatch(/10:00/);
  });

  it("does not mistake a high-labeled named block for 'hasHighBlock' when the actual level is medium", () => {
    const story = composeStory({
      snapshot: makeSnapshot({
        latest_forecast: {
          forecast_id: "f",
          classroom_id: "demo",
          forecast_date: "2026-04-13",
          overall_summary: "",
          highest_risk_block: "10:00-10:45",
          schema_version: "1.0",
          blocks: [
            {
              time_slot: "10:00-10:45",
              activity: "Math",
              // This is the "highest risk" block in the day, but not "high"
              level: "medium",
              contributing_factors: [],
              suggested_mitigation: "",
            },
          ],
        },
      }),
      health: makeHealth(5, true),
      students: [],
    });
    // No debt, no high block → calm
    expect(story.tone).toBe("calm");
  });

  it("uses StudentSummary fallback to pick a priority student when debt has no student refs", () => {
    const story = composeStory({
      snapshot: makeSnapshot({
        debt_register: {
          register_id: "r",
          classroom_id: "demo",
          items: [
            {
              category: "unapproved_message",
              student_refs: [],
              description: "",
              source_record_id: "m",
              age_days: 1,
              suggested_action: "",
            },
          ],
          item_count_by_category: {},
          generated_at: "",
          schema_version: "1.0",
        } as TodaySnapshot["debt_register"],
        latest_forecast: null,
      }),
      health: makeHealth(1, true),
      students: [
        {
          alias: "Priya",
          pending_action_count: 3,
          active_pattern_count: 0,
          pending_message_count: 0,
          last_intervention_days: 2,
          latest_priority_reason: "",
        } as StudentSummary,
      ],
    });
    expect(story.sub).toMatch(/Priya/);
  });
});

describe("TodayStory component", () => {
  it("renders the lede and sub with the resolved tone class", () => {
    const { container } = render(
      <TodayStory
        snapshot={makeSnapshot({
          latest_forecast: makeForecast("low"),
        })}
        health={makeHealth(5, true)}
        students={[]}
      />,
    );
    expect(screen.getByText(/breathe/i)).toBeInTheDocument();
    expect(container.querySelector(".today-story--calm")).toBeInTheDocument();
  });

  it("renders the empty lede when snapshot is null", () => {
    render(<TodayStory snapshot={null} health={null} students={[]} />);
    expect(screen.getByText(/first plan/i)).toBeInTheDocument();
  });
});
