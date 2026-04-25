/**
 * ScaffoldEffectivenessChart.test.tsx
 *
 * Minimum-viable behavior tests for ScaffoldEffectivenessChart.
 * Covers: render, empty-state.
 * No interaction tests — component is purely static (no click handlers).
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScaffoldEffectivenessChart } from "../DataVisualizations";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SCAFFOLDS = [
  { name: "visual_support", count: 5 },
  { name: "sentence_starters", count: 3 },
  { name: "partner_reading", count: 4 },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ScaffoldEffectivenessChart", () => {
  it("renders without throwing given valid scaffolds", () => {
    const { container } = render(<ScaffoldEffectivenessChart scaffolds={SCAFFOLDS} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("returns null when scaffolds is empty", () => {
    const { container } = render(<ScaffoldEffectivenessChart scaffolds={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a row for each scaffold entry (up to 8)", () => {
    render(<ScaffoldEffectivenessChart scaffolds={SCAFFOLDS} />);
    // Scaffold labels are rendered with underscores replaced by spaces
    expect(screen.getByText("visual support")).toBeInTheDocument();
    expect(screen.getByText("sentence starters")).toBeInTheDocument();
    expect(screen.getByText("partner reading")).toBeInTheDocument();
  });

  it("shows the count value for each scaffold", () => {
    render(<ScaffoldEffectivenessChart scaffolds={SCAFFOLDS} />);
    // Counts are rendered as text nodes in the count span
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("caps rendering at 8 rows when more are provided", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      name: `scaffold_${i}`,
      count: i + 1,
    }));
    render(<ScaffoldEffectivenessChart scaffolds={many} />);
    // Should only render 8 rows
    expect(screen.getByText("scaffold 0")).toBeInTheDocument();
    // The 9th entry (index 8, name "scaffold_8") should not be present
    expect(screen.queryByText("scaffold 8")).toBeNull();
  });

  it("has an accessible chart label on the wrapper", () => {
    const { container } = render(<ScaffoldEffectivenessChart scaffolds={SCAFFOLDS} />);
    const figure = container.querySelector("[aria-label]");
    expect(figure).toBeTruthy();
    const label = figure?.getAttribute("aria-label");
    expect(label).toBeTruthy();
    expect(label!.length).toBeGreaterThan(0);
  });

  it("renders a single scaffold entry correctly", () => {
    render(<ScaffoldEffectivenessChart scaffolds={[{ name: "visual_cues", count: 7 }]} />);
    expect(screen.getByText("visual cues")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });
});
