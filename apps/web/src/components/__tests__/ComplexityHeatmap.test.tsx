/**
 * ComplexityHeatmap.test.tsx
 *
 * Minimum-viable behavior tests for ComplexityHeatmap.
 * Covers: render, empty-state.
 * Note: this component renders inline CSS variable fills (var(--color-forecast-*))
 * that are not resolved in jsdom. Tests avoid fill-value assertions and focus
 * on structural DOM shape and accessible attributes.
 * No interaction tests — component is purely static (no click handlers).
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComplexityHeatmap } from "../DataVisualizations";
import type { ComplexityBlock } from "../../types";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeBlock(
  time_slot: string,
  activity: string,
  level: ComplexityBlock["level"],
): ComplexityBlock {
  return {
    time_slot,
    activity,
    level,
    contributing_factors: ["large group"],
    suggested_mitigation: "Monitor",
  };
}

const BLOCKS: ComplexityBlock[] = [
  makeBlock("8:30-9:15", "Literacy", "low"),
  makeBlock("9:15-10:00", "Math", "high"),
  makeBlock("10:00-10:45", "Science", "medium"),
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ComplexityHeatmap", () => {
  it("renders an SVG when valid blocks are provided", () => {
    const { container } = render(<ComplexityHeatmap blocks={BLOCKS} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("returns null when blocks array is empty", () => {
    const { container } = render(<ComplexityHeatmap blocks={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("has an accessible role=img and aria-label on the SVG", () => {
    const { container } = render(<ComplexityHeatmap blocks={BLOCKS} />);
    const svg = container.querySelector("svg[role='img'][aria-label]");
    expect(svg).toBeTruthy();
    const label = svg?.getAttribute("aria-label");
    expect(label).toBeTruthy();
    expect(label!.length).toBeGreaterThan(0);
  });

  it("renders one rect per block in the SVG", () => {
    const { container } = render(<ComplexityHeatmap blocks={BLOCKS} />);
    const rects = container.querySelectorAll("rect");
    expect(rects.length).toBe(BLOCKS.length);
  });

  it("renders a <title> element inside each rect describing the block", () => {
    const { container } = render(<ComplexityHeatmap blocks={BLOCKS} />);
    const titles = container.querySelectorAll("rect title");
    expect(titles.length).toBe(BLOCKS.length);
    // First block title should mention the time slot and activity
    expect(titles[0].textContent).toContain("8:30-9:15");
    expect(titles[0].textContent).toContain("Literacy");
  });

  it("renders a legend with low/med/high labels", () => {
    render(<ComplexityHeatmap blocks={BLOCKS} />);
    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(screen.getByText("Med")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("renders correctly with a single block", () => {
    const single = [makeBlock("8:00-8:30", "Circle time", "low")];
    const { container } = render(<ComplexityHeatmap blocks={single} />);
    const rects = container.querySelectorAll("rect");
    expect(rects.length).toBe(1);
  });
});
