import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DayArc from "../DayArc";
import type {
  ComplexityForecast,
  StudentSummary,
  DebtItem,
  ClassroomHealth,
} from "../../types";

function makeForecast(): ComplexityForecast {
  return {
    forecast_id: "fc-1",
    classroom_id: "demo",
    forecast_date: "2026-04-13",
    overall_summary: "Math block is the risk.",
    highest_risk_block: "10:00-10:45",
    schema_version: "1.0",
    blocks: [
      {
        time_slot: "09:00-09:45",
        activity: "Literacy",
        level: "medium",
        contributing_factors: ["transition"],
        suggested_mitigation: "Model first.",
      },
      {
        time_slot: "10:00-10:45",
        activity: "Math",
        level: "high",
        contributing_factors: ["post-assembly"],
        suggested_mitigation: "Stage materials.",
      },
      {
        time_slot: "11:00-11:45",
        activity: "Gym",
        level: "low",
        contributing_factors: [],
        suggested_mitigation: "Standard routine.",
      },
    ],
  };
}

function makeStudents(): StudentSummary[] {
  return [
    {
      alias: "Amira",
      pending_action_count: 3,
      active_pattern_count: 2,
      pending_message_count: 1,
      last_intervention_days: 5,
      latest_priority_reason: "Stale follow-up",
    } as StudentSummary,
    {
      alias: "Brody",
      pending_action_count: 1,
      active_pattern_count: 1,
      pending_message_count: 0,
      last_intervention_days: 8,
      latest_priority_reason: "Stale follow-up",
    } as StudentSummary,
    {
      alias: "Farid",
      pending_action_count: 0,
      active_pattern_count: 0,
      pending_message_count: 0,
      last_intervention_days: 2,
      latest_priority_reason: "",
    } as StudentSummary,
  ];
}

function makeDebtItems(): DebtItem[] {
  return [
    {
      category: "unapproved_message",
      student_refs: ["Amira"],
      description: "Draft waiting",
      source_record_id: "m1",
      age_days: 1,
      suggested_action: "Approve",
    },
    {
      category: "stale_followup",
      student_refs: ["Brody"],
      description: "Follow-up needed",
      source_record_id: "i1",
      age_days: 5,
      suggested_action: "Log follow-up",
    },
    {
      category: "stale_followup",
      student_refs: ["Amira"],
      description: "Follow-up needed",
      source_record_id: "i2",
      age_days: 6,
      suggested_action: "Log follow-up",
    },
  ];
}

function makeHealth(): ClassroomHealth {
  return {
    streak_days: 3,
    plans_last_7: [true, true, false, true, false, true, false],
    messages_approved: 2,
    messages_total: 5,
    trends: {
      debt_total_14d: [8, 7, 6, 5, 5, 4, 3, 3, 4, 5, 4, 3, 2, 2],
      plans_14d: [0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1],
      peak_complexity_14d: [1, 2, 1, 2, 3, 2, 1, 2, 3, 2, 2, 1, 2, 3],
    },
  };
}

describe("DayArc", () => {
  it("renders the headline title and subtitle with data", () => {
    const fixedNow = new Date("2026-04-13T11:00:00");
    render(
      <DayArc
        forecast={makeForecast()}
        students={makeStudents()}
        debtItems={makeDebtItems()}
        health={makeHealth()}
        now={fixedNow}
      />,
    );

    expect(screen.getByText("Today's Shape")).toBeInTheDocument();
    expect(screen.getByText(/3 blocks/)).toBeInTheDocument();
  });

  it("renders a data-derived aria-label that names the peak block and counts", () => {
    render(
      <DayArc
        forecast={makeForecast()}
        students={makeStudents()}
        debtItems={makeDebtItems()}
        health={makeHealth()}
        now={new Date("2026-04-13T09:30:00")}
      />,
    );
    const label = screen.getByRole("img").getAttribute("aria-label") ?? "";
    expect(label).toMatch(/3 blocks/);
    expect(label).toMatch(/10:00-10:45/);
    expect(label).toMatch(/high complexity/);
    expect(label).toMatch(/priority students?/);
    expect(label).toMatch(/open threads?/);
  });

  it("shows an empty-state message when there is no forecast", () => {
    render(
      <DayArc
        forecast={null}
        students={makeStudents()}
        debtItems={makeDebtItems()}
        health={makeHealth()}
      />,
    );
    expect(
      screen.getByText(/day's arc will draw itself/i),
    ).toBeInTheDocument();
  });

  it("renders student constellation as accessible buttons when onStudentClick is supplied", async () => {
    const handleStudentClick = vi.fn();
    const user = userEvent.setup();
    render(
      <DayArc
        forecast={makeForecast()}
        students={makeStudents()}
        debtItems={makeDebtItems()}
        health={makeHealth()}
        onStudentClick={handleStudentClick}
        now={new Date("2026-04-13T09:30:00")}
      />,
    );

    const amira = screen.getByRole("button", { name: /^Amira:/ });
    expect(amira).toBeInTheDocument();
    await user.click(amira);
    expect(handleStudentClick).toHaveBeenCalledWith("Amira");
  });

  it("wires block hit areas to onBlockClick with the block index", async () => {
    const handleBlockClick = vi.fn();
    const user = userEvent.setup();
    render(
      <DayArc
        forecast={makeForecast()}
        students={makeStudents()}
        debtItems={makeDebtItems()}
        health={makeHealth()}
        onBlockClick={handleBlockClick}
        now={new Date("2026-04-13T09:30:00")}
      />,
    );

    const mathBlock = screen.getByRole("button", {
      name: /10:00-10:45 Math/,
    });
    await user.click(mathBlock);
    expect(handleBlockClick).toHaveBeenCalledWith(1);
  });

  it("skips the now-line when the current time is outside school hours", () => {
    const { container } = render(
      <DayArc
        forecast={makeForecast()}
        students={makeStudents()}
        debtItems={makeDebtItems()}
        health={makeHealth()}
        now={new Date("2026-04-13T19:00:00")}
      />,
    );
    expect(container.querySelector(".day-arc__now-line")).toBeNull();
  });

  it("renders the now-line during school hours", () => {
    const { container } = render(
      <DayArc
        forecast={makeForecast()}
        students={makeStudents()}
        debtItems={makeDebtItems()}
        health={makeHealth()}
        now={new Date("2026-04-13T10:15:00")}
      />,
    );
    expect(container.querySelector(".day-arc__now-line")).toBeInTheDocument();
  });

  it("renders a visible ridge stroke even for a single-block forecast", () => {
    const oneBlock: ComplexityForecast = {
      ...makeForecast(),
      blocks: [
        {
          time_slot: "10:00-10:45",
          activity: "Math",
          level: "high",
          contributing_factors: [],
          suggested_mitigation: "",
        },
      ],
      highest_risk_block: "10:00-10:45",
    };
    const { container } = render(
      <DayArc
        forecast={oneBlock}
        students={makeStudents()}
        debtItems={[]}
        health={makeHealth()}
        now={new Date("2026-04-13T10:15:00")}
      />,
    );
    const strokePath = container.querySelector(".day-arc__ridge-stroke");
    expect(strokePath).toBeInTheDocument();
    const d = strokePath?.getAttribute("d") ?? "";
    expect(d).toMatch(/M .+ L /);
  });

  it("caps debt motes so they do not overflow the viewBox", () => {
    const manyDebtCategories: DebtItem[] = [
      { category: "unapproved_message", student_refs: ["a"], description: "", source_record_id: "1", age_days: 1, suggested_action: "" },
      { category: "stale_followup", student_refs: ["b"], description: "", source_record_id: "2", age_days: 1, suggested_action: "" },
      { category: "unaddressed_pattern", student_refs: ["c"], description: "", source_record_id: "3", age_days: 1, suggested_action: "" },
      { category: "approaching_review", student_refs: ["d"], description: "", source_record_id: "4", age_days: 1, suggested_action: "" },
      { category: "recurring_plan_item", student_refs: ["e"], description: "", source_record_id: "5", age_days: 1, suggested_action: "" },
    ];
    const { container } = render(
      <DayArc
        forecast={makeForecast()}
        students={[]}
        debtItems={manyDebtCategories}
        health={makeHealth()}
      />,
    );
    const motes = container.querySelectorAll(".day-arc__mote");
    // All 5 possible debt categories fit inside the safety cap.
    expect(motes.length).toBeGreaterThan(0);
    expect(motes.length).toBeLessThanOrEqual(5);
  });

  it("handles students with no priority pressure gracefully", () => {
    const calmStudents: StudentSummary[] = [
      {
        alias: "Priya",
        pending_action_count: 0,
        active_pattern_count: 0,
        pending_message_count: 0,
        last_intervention_days: 1,
        latest_priority_reason: "",
      } as StudentSummary,
    ];
    render(
      <DayArc
        forecast={makeForecast()}
        students={calmStudents}
        debtItems={[]}
        health={makeHealth()}
      />,
    );
    expect(screen.getByText(/0 open threads/)).toBeInTheDocument();
  });
});
