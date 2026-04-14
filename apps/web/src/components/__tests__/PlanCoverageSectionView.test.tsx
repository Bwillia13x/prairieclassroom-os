import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PlanCoverageSectionView from "../PlanCoverageSectionView";
import type { DrillDownContext } from "../../types";

type PlanCoverageContext = Extract<DrillDownContext, { type: "plan-coverage-section" }>;

const CONTEXT: PlanCoverageContext = {
  type: "plan-coverage-section",
  section: "watchpoints",
  label: "Watchpoints",
  items: [
    "Keep Maya on chunked task",
    "Ranbir: sensory cue at 10:20",
    "Jordan: pre-teach vocab",
  ],
};

describe("PlanCoverageSectionView", () => {
  it("renders heading with label and count", () => {
    render(<PlanCoverageSectionView context={CONTEXT} />);
    const heading = screen.getByRole("heading");
    expect(heading.textContent).toContain("Watchpoints");
    expect(heading.textContent).toContain("3");
  });

  it("renders each item string", () => {
    render(<PlanCoverageSectionView context={CONTEXT} />);
    expect(screen.getByText("Keep Maya on chunked task")).toBeInTheDocument();
    expect(screen.getByText("Ranbir: sensory cue at 10:20")).toBeInTheDocument();
    expect(screen.getByText("Jordan: pre-teach vocab")).toBeInTheDocument();
  });

  it("uses ul/li for the list", () => {
    render(<PlanCoverageSectionView context={CONTEXT} />);
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("renders empty state when items is empty", () => {
    const empty: PlanCoverageContext = {
      ...CONTEXT,
      items: [],
    };
    render(<PlanCoverageSectionView context={empty} />);
    expect(screen.getByText("No items in this section.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
