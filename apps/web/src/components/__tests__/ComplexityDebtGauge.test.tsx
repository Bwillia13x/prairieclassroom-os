import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ComplexityDebtGauge } from "../DataVisualizations";
import type { DebtItem } from "../../types";

function mkItems(n: number, category: DebtItem["category"] = "approaching_review"): DebtItem[] {
  return Array.from({ length: n }, () => ({
    category,
    student_refs: [],
    description: "test item",
    source_record_id: "r1",
    age_days: 5,
    suggested_action: "",
  }));
}

describe("ComplexityDebtGauge", () => {
  it("labels the 0–3 / 4–7 / 8+ scale explicitly with a legend caption", () => {
    render(<ComplexityDebtGauge debtItems={mkItems(12)} />);
    expect(screen.getByTestId("debt-scale-legend")).toHaveTextContent(
      /debt severity tier/i,
    );
  });

  it("attaches a CRITICAL definition tooltip to the tone badge when total >= 8", () => {
    render(<ComplexityDebtGauge debtItems={mkItems(12)} />);
    const badge = screen.getByText(/critical/i);
    expect(badge.getAttribute("title") ?? "").toMatch(/8 or more/i);
  });

  it("attaches a Manageable tooltip when total <= 3", () => {
    render(<ComplexityDebtGauge debtItems={mkItems(2)} />);
    const badge = screen.getByText(/manageable/i);
    expect(badge.getAttribute("title") ?? "").toMatch(/3 or fewer/i);
  });

  it("tones the approaching_review row as HIGH (aligned with Day Arc)", () => {
    const { container } = render(<ComplexityDebtGauge debtItems={mkItems(12)} />);
    const row = container.querySelector(".viz-debt-gauge__cat");
    expect(row?.className).toMatch(/viz-debt-gauge__cat--high/);
  });

  it("tones the recurring_plan_item row as MEDIUM", () => {
    const { container } = render(
      <ComplexityDebtGauge debtItems={mkItems(5, "recurring_plan_item")} />,
    );
    const row = container.querySelector(".viz-debt-gauge__cat");
    expect(row?.className).toMatch(/viz-debt-gauge__cat--medium/);
  });

  it("tones the unaddressed_pattern row as LOW", () => {
    const { container } = render(
      <ComplexityDebtGauge debtItems={mkItems(2, "unaddressed_pattern")} />,
    );
    const row = container.querySelector(".viz-debt-gauge__cat");
    expect(row?.className).toMatch(/viz-debt-gauge__cat--low/);
  });
});
