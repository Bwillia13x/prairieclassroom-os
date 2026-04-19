import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HealthBar from "../HealthBar";
import type { ClassroomHealth } from "../../types";

// ----------------------------------------------------------------
// Shared synthetic data
// ----------------------------------------------------------------

const PLANS_14D: (0 | 1)[] = [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1];
const DEBT_14D = [2, 3, 4, 5, 6, 7, 8, 6, 5, 4, 3, 2, 3, 4];
const COMPLEXITY_14D = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1];

const HEALTH: ClassroomHealth = {
  streak_days: 3,
  plans_last_7: [true, true, false, true, true, true, false],
  messages_approved: 2,
  messages_total: 3,
  trends: {
    plans_14d: PLANS_14D,
    debt_total_14d: DEBT_14D,
    peak_complexity_14d: COMPLEXITY_14D,
  },
};

// ----------------------------------------------------------------
// Block 1 — DebtTrendSparkline click forwarded through HealthBar
// ----------------------------------------------------------------

describe("HealthBar — DebtTrendSparkline onTrendClick forwarding", () => {
  it("fires onTrendClick with debt payload when sparkline hit target is clicked", () => {
    const spy = vi.fn();
    render(<HealthBar health={HEALTH} loading={false} onTrendClick={spy} />);
    const hit = screen.getByTestId("viz-debt-trend-hit");
    fireEvent.click(hit);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({
      trendKey: "debt",
      label: "Debt trend",
      data: DEBT_14D,
    });
  });
});

// ----------------------------------------------------------------
// Block 2 — ComplexityTrendCalendar click forwarded through HealthBar
// ----------------------------------------------------------------

describe("HealthBar — ComplexityTrendCalendar onTrendClick forwarding", () => {
  it("fires onTrendClick with complexity payload when a cell is clicked", () => {
    const spy = vi.fn();
    render(<HealthBar health={HEALTH} loading={false} onTrendClick={spy} />);
    const cells = screen.getAllByTestId("viz-complexity-cell");
    fireEvent.click(cells[7]);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({
      trendKey: "complexity",
      label: "Peak complexity",
      data: COMPLEXITY_14D,
      highlightIndex: 7,
    });
  });
});

// ----------------------------------------------------------------
// Block 3 — PlanStreakCalendar click MAPPED through HealthBar
// ----------------------------------------------------------------

describe("HealthBar — PlanStreakCalendar onTrendClick mapping", () => {
  it("fires onTrendClick with mapped plans payload when a plan streak cell is clicked", () => {
    const spy = vi.fn();
    render(<HealthBar health={HEALTH} loading={false} onTrendClick={spy} />);
    const cell = screen.getByTestId("viz-plan-streak-cell-10");
    fireEvent.click(cell);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({
      trendKey: "plans",
      label: "Planning streak",
      data: PLANS_14D,
      highlightIndex: 10,
    });
  });
});

// ----------------------------------------------------------------
// Block 4 — No-op when onTrendClick is undefined (regression guard)
// ----------------------------------------------------------------

describe("HealthBar — no onTrendClick (regression)", () => {
  it("renders the inner charts without crashing when onTrendClick is undefined", () => {
    // Should render without errors — charts visible but not interactive
    render(<HealthBar health={HEALTH} loading={false} />);
    // The sparkline should render but without the clickable hit-target
    expect(screen.queryByTestId("viz-debt-trend-hit")).toBeNull();
    // The complexity cells should not be present without onSegmentClick
    expect(screen.queryByTestId("viz-complexity-cell")).toBeNull();
    // The plan streak cells should not be present without onSegmentClick
    expect(screen.queryByTestId("viz-plan-streak-cell-10")).toBeNull();
  });
});

// ----------------------------------------------------------------
// Block 5 — Audit #22: healthy band on the debt sparkline
// ----------------------------------------------------------------

describe("HealthBar — debt sparkline healthy band (audit #22)", () => {
  it("paints a .viz-debt-trend__healthy-band rect behind the line", () => {
    const { container } = render(
      <HealthBar health={HEALTH} loading={false} pendingActionCount={37} />,
    );
    expect(
      container.querySelector(".viz-debt-trend__healthy-band"),
    ).toBeInTheDocument();
  });
});

// ----------------------------------------------------------------
// Block 6 — Audit #23: unified planning denominator
// ----------------------------------------------------------------

describe("HealthBar — unified planning denominator (audit #23)", () => {
  it("exposes exactly one denominator form inside the planning-group container", () => {
    render(<HealthBar health={HEALTH} loading={false} pendingActionCount={37} />);
    const planning = screen.getByTestId("health-bar-planning");
    const text = planning.textContent ?? "";
    const mentions = [/\bof\s+7\b/, /\bof\s+14\b/];
    const matches = mentions.filter((r) => r.test(text));
    expect(matches.length).toBe(1);
  });

  it("falls back to 'N of 7 planned' when no 14-day trend is available", () => {
    const healthNoTrends: ClassroomHealth = {
      ...HEALTH,
      trends: {
        plans_14d: [],
        debt_total_14d: [],
        peak_complexity_14d: [],
      },
    };
    render(<HealthBar health={healthNoTrends} loading={false} />);
    const planning = screen.getByTestId("health-bar-planning");
    expect(planning.textContent ?? "").toMatch(/\bof\s+7\b/);
  });
});
