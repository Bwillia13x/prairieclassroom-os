import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ComplexityDebtGauge,
  DebtTrendSparkline,
  ComplexityTrendCalendar,
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
