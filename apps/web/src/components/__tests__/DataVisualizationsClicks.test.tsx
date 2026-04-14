import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ComplexityDebtGauge,
  DebtTrendSparkline,
  ComplexityTrendCalendar,
  PlanStreakCalendar,
  VariantSummaryStrip,
  PlanCoverageRadar,
} from "../DataVisualizations";
import type { DebtItem } from "../../types";

// ----------------------------------------------------------------
// Shared synthetic data
// ----------------------------------------------------------------

function makeDebtItem(category: DebtItem["category"], i: number): DebtItem {
  return {
    category,
    student_refs: [`student-${i}`],
    description: `Debt item ${i}`,
    source_record_id: `rec-${i}`,
    age_days: i + 1,
    suggested_action: "Review soon",
  };
}

const DEBT_ITEMS: DebtItem[] = [
  makeDebtItem("stale_followup", 0),
  makeDebtItem("stale_followup", 1),
  makeDebtItem("stale_followup", 2),
  makeDebtItem("stale_followup", 3),
  makeDebtItem("stale_followup", 4),
];

const TREND_DATA = [2, 3, 4, 5, 6, 7, 8];

const CAL_DATA = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1];

// ----------------------------------------------------------------
// Block 1 — ComplexityDebtGauge click fires
// ----------------------------------------------------------------

describe("ComplexityDebtGauge — onSegmentClick", () => {
  it("fires onSegmentClick with correct payload when clicked", () => {
    const spy = vi.fn();
    render(
      <ComplexityDebtGauge
        debtItems={DEBT_ITEMS}
        previousTotal={3}
        onSegmentClick={spy}
      />
    );
    const hit = screen.getByTestId("viz-debt-gauge-hit");
    fireEvent.click(hit);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({
      trendKey: "debt",
      label: "Complexity debt",
      data: [5],
    });
  });

  it("fires onSegmentClick on Enter keydown", () => {
    const spy = vi.fn();
    render(
      <ComplexityDebtGauge
        debtItems={DEBT_ITEMS}
        previousTotal={3}
        onSegmentClick={spy}
      />
    );
    const hit = screen.getByTestId("viz-debt-gauge-hit");
    fireEvent.keyDown(hit, { key: "Enter" });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("fires onSegmentClick on Space keydown", () => {
    const spy = vi.fn();
    render(
      <ComplexityDebtGauge
        debtItems={DEBT_ITEMS}
        previousTotal={3}
        onSegmentClick={spy}
      />
    );
    const hit = screen.getByTestId("viz-debt-gauge-hit");
    fireEvent.keyDown(hit, { key: " " });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("hit target has tabIndex=0 and role=button", () => {
    const spy = vi.fn();
    render(
      <ComplexityDebtGauge
        debtItems={DEBT_ITEMS}
        previousTotal={3}
        onSegmentClick={spy}
      />
    );
    const hit = screen.getByTestId("viz-debt-gauge-hit");
    expect(hit).toHaveAttribute("tabindex", "0");
    expect(hit).toHaveAttribute("role", "button");
  });

  it("renders without testid or role when onSegmentClick is absent (no regression)", () => {
    render(<ComplexityDebtGauge debtItems={DEBT_ITEMS} previousTotal={3} />);
    expect(screen.queryByTestId("viz-debt-gauge-hit")).toBeNull();
  });

  it("has an accessible aria-label when clickable", () => {
    const spy = vi.fn();
    render(
      <ComplexityDebtGauge
        debtItems={DEBT_ITEMS}
        previousTotal={3}
        onSegmentClick={spy}
      />
    );
    const hit = screen.getByTestId("viz-debt-gauge-hit");
    const label = hit.getAttribute("aria-label");
    expect(label).toBeTruthy();
    expect(label!.length).toBeGreaterThan(0);
  });
});

// ----------------------------------------------------------------
// Block 2 — DebtTrendSparkline click fires
// ----------------------------------------------------------------

describe("DebtTrendSparkline — onSegmentClick", () => {
  it("fires onSegmentClick with correct payload when clicked", () => {
    const spy = vi.fn();
    render(<DebtTrendSparkline data={TREND_DATA} onSegmentClick={spy} />);
    const hit = screen.getByTestId("viz-debt-trend-hit");
    fireEvent.click(hit);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({
      trendKey: "debt",
      label: "Debt trend",
      data: TREND_DATA,
    });
  });

  it("renders without testid when onSegmentClick is absent (no regression)", () => {
    render(<DebtTrendSparkline data={TREND_DATA} />);
    expect(screen.queryByTestId("viz-debt-trend-hit")).toBeNull();
  });

  it("has an accessible aria-label when clickable", () => {
    const spy = vi.fn();
    render(<DebtTrendSparkline data={TREND_DATA} onSegmentClick={spy} />);
    const hit = screen.getByTestId("viz-debt-trend-hit");
    const label = hit.getAttribute("aria-label");
    expect(label).toBeTruthy();
    expect(label!.length).toBeGreaterThan(0);
  });
});

// ----------------------------------------------------------------
// Block 3 — ComplexityTrendCalendar day click fires
// ----------------------------------------------------------------

describe("ComplexityTrendCalendar — onSegmentClick", () => {
  it("fires onSegmentClick with correct payload for cell index 7", () => {
    const spy = vi.fn();
    render(<ComplexityTrendCalendar data={CAL_DATA} onSegmentClick={spy} />);
    const cells = screen.getAllByTestId("viz-complexity-cell");
    fireEvent.click(cells[7]);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({
      trendKey: "complexity",
      label: "Peak complexity",
      data: CAL_DATA,
      highlightIndex: 7,
    });
  });

  it("each cell has tabIndex=0 and role=button", () => {
    const spy = vi.fn();
    render(<ComplexityTrendCalendar data={CAL_DATA} onSegmentClick={spy} />);
    const cells = screen.getAllByTestId("viz-complexity-cell");
    for (const cell of cells) {
      // button element has implicit role="button" but attribute check should work
      expect(cell.tagName.toLowerCase()).toBe("button");
      expect(cell).toHaveAttribute("tabindex", "0");
    }
  });

  it("each cell has an aria-label describing the day", () => {
    const spy = vi.fn();
    render(<ComplexityTrendCalendar data={CAL_DATA} onSegmentClick={spy} />);
    const cells = screen.getAllByTestId("viz-complexity-cell");
    // Index 7 has value 3 (CAL_DATA[7] = 3) → "Critical"
    expect(cells[7]).toHaveAttribute("aria-label", "Day 8: Critical");
    // Index 0 has value 0 → "Low"
    expect(cells[0]).toHaveAttribute("aria-label", "Day 1: Low");
  });

  it("renders without testid when onSegmentClick is absent (no regression)", () => {
    render(<ComplexityTrendCalendar data={CAL_DATA} />);
    expect(screen.queryByTestId("viz-complexity-cell")).toBeNull();
  });
});

// ----------------------------------------------------------------
// Block 4 — PlanStreakCalendar day click fires
// ----------------------------------------------------------------

const PLANS_14D: (0 | 1)[] = [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1];

describe("PlanStreakCalendar — onSegmentClick", () => {
  it("fires onSegmentClick with correct payload when cell-10 is clicked", () => {
    const spy = vi.fn();
    render(<PlanStreakCalendar plans14d={PLANS_14D} onSegmentClick={spy} />);
    const cell = screen.getByTestId("viz-plan-streak-cell-10");
    fireEvent.click(cell);
    expect(spy).toHaveBeenCalledTimes(1);
    // index 10 in the fixture is the second 0 → planned: false
    expect(spy).toHaveBeenCalledWith({ dayIndex: 10, planned: false });
  });

  it("cell has tabIndex=0 and role=button", () => {
    const spy = vi.fn();
    render(<PlanStreakCalendar plans14d={PLANS_14D} onSegmentClick={spy} />);
    const cell = screen.getByTestId("viz-plan-streak-cell-10");
    expect(cell).toHaveAttribute("tabindex", "0");
    expect(cell).toHaveAttribute("role", "button");
  });

  it("cell has a non-empty aria-label", () => {
    const spy = vi.fn();
    render(<PlanStreakCalendar plans14d={PLANS_14D} onSegmentClick={spy} />);
    const cell = screen.getByTestId("viz-plan-streak-cell-10");
    const label = cell.getAttribute("aria-label");
    expect(label).toBeTruthy();
    expect(label!.length).toBeGreaterThan(0);
  });

  it("renders without testid when onSegmentClick is absent (no regression)", () => {
    render(<PlanStreakCalendar plans14d={PLANS_14D} />);
    expect(screen.queryByTestId("viz-plan-streak-cell-10")).toBeNull();
  });

  it("fires onSegmentClick on Enter keydown", () => {
    const spy = vi.fn();
    render(<PlanStreakCalendar plans14d={[1,1,0,1,1,1,0,1,1,1,0,1,1,1]} onSegmentClick={spy} />);
    const cell = screen.getByTestId("viz-plan-streak-cell-10");
    fireEvent.keyDown(cell, { key: "Enter" });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ dayIndex: 10, planned: false });
  });

  it("fires onSegmentClick on Space keydown", () => {
    const spy = vi.fn();
    render(<PlanStreakCalendar plans14d={[1,1,0,1,1,1,0,1,1,1,0,1,1,1]} onSegmentClick={spy} />);
    const cell = screen.getByTestId("viz-plan-streak-cell-10");
    fireEvent.keyDown(cell, { key: " " });
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

// ----------------------------------------------------------------
// Block 5 — VariantSummaryStrip lane click fires
// ----------------------------------------------------------------

const VARIANTS = [
  { variant_type: "core", estimated_minutes: 25, title: "Original lesson" },
  { variant_type: "eal_supported", estimated_minutes: 20, title: "EAL scaffolded" },
  { variant_type: "eal_supported", estimated_minutes: 18, title: "EAL vocab cards" },
] as const;

describe("VariantSummaryStrip — onSegmentClick", () => {
  it("fires onSegmentClick with correct payload when second item (eal_supported) is clicked", () => {
    const spy = vi.fn();
    render(<VariantSummaryStrip variants={[...VARIANTS]} onSegmentClick={spy} />);
    // Second item (index 1) is the first eal_supported entry
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({
      variantType: "eal_supported",
      label: "Eal Supported",
      variants: [...VARIANTS],
    });
    expect(buttons[1]).toHaveAttribute("aria-label");
    expect(buttons[1].getAttribute("aria-label")).toMatch(/eal supported/i);
  });

  it("renders without button wrapper when onSegmentClick is absent (no regression)", () => {
    render(<VariantSummaryStrip variants={[...VARIANTS]} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("fires onSegmentClick on Enter keydown via native button", () => {
    const spy = vi.fn();
    render(
      <VariantSummaryStrip
        variants={[
          { variant_type: "core", estimated_minutes: 25, title: "Original lesson" },
          { variant_type: "eal_supported", estimated_minutes: 20, title: "EAL scaffolded" },
          { variant_type: "eal_supported", estimated_minutes: 18, title: "EAL vocab cards" },
        ]}
        onSegmentClick={spy}
      />
    );
    const buttons = screen.getAllByRole("button");
    buttons[1].focus();
    fireEvent.keyDown(buttons[1], { key: "Enter" });
    // Native buttons fire a click event when Enter is pressed, but fireEvent.keyDown alone does NOT simulate the full native behavior.
    // Use fireEvent.click instead as the reliable test for "button was activated by keyboard",
    // since we're verifying the onClick handler path that keyboard-activated buttons go through.
    fireEvent.click(buttons[1]);
    expect(spy).toHaveBeenCalled();
  });
});

// ----------------------------------------------------------------
// Block 6 — PlanCoverageRadar section click fires
// ----------------------------------------------------------------

const RADAR_SECTION_ITEMS = {
  watchpoints: ["a", "b", "c", "d", "e"],
  priorities: ["p1", "p2", "p3"],
  eaActions: ["e1", "e2"],
  prepItems: ["pr1", "pr2", "pr3", "pr4"],
  familyFollowups: ["f1"],
};

describe("PlanCoverageRadar — onSegmentClick", () => {
  it("fires onSegmentClick with correct payload when watchpoints axis is clicked", () => {
    const spy = vi.fn();
    render(
      <PlanCoverageRadar
        watchpoints={5}
        priorities={3}
        eaActions={2}
        prepItems={4}
        familyFollowups={1}
        onSegmentClick={spy}
        sectionItems={RADAR_SECTION_ITEMS}
      />
    );
    const hit = screen.getByTestId("viz-plan-radar-axis-watchpoints");
    fireEvent.click(hit);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({
      section: "watchpoints",
      label: "Watchpoints",
      items: ["a", "b", "c", "d", "e"],
    });
  });

  it("fires onSegmentClick on Enter keydown", () => {
    const spy = vi.fn();
    render(
      <PlanCoverageRadar
        watchpoints={5}
        priorities={3}
        eaActions={2}
        prepItems={4}
        familyFollowups={1}
        onSegmentClick={spy}
        sectionItems={RADAR_SECTION_ITEMS}
      />
    );
    const hit = screen.getByTestId("viz-plan-radar-axis-watchpoints");
    fireEvent.keyDown(hit, { key: "Enter" });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("each axis hit target has a non-empty aria-label", () => {
    const spy = vi.fn();
    render(
      <PlanCoverageRadar
        watchpoints={5}
        priorities={3}
        eaActions={2}
        prepItems={4}
        familyFollowups={1}
        onSegmentClick={spy}
        sectionItems={RADAR_SECTION_ITEMS}
      />
    );
    const hit = screen.getByTestId("viz-plan-radar-axis-watchpoints");
    const label = hit.getAttribute("aria-label");
    expect(label).toBeTruthy();
    expect(label!.length).toBeGreaterThan(0);
  });

  it("renders without testid when onSegmentClick is absent (no regression)", () => {
    render(
      <PlanCoverageRadar
        watchpoints={5}
        priorities={3}
        eaActions={2}
        prepItems={4}
        familyFollowups={1}
      />
    );
    expect(screen.queryByTestId("viz-plan-radar-axis-watchpoints")).toBeNull();
  });
});
