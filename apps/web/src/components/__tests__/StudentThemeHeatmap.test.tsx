/**
 * StudentThemeHeatmap.test.tsx
 *
 * Minimum-viable behavior tests for StudentThemeHeatmap.
 * Covers: render, empty-state.
 * Note: this component uses color-mix() CSS fills in SVG rects which are not
 * resolvable in jsdom. Tests avoid inspecting fill values; they verify
 * structural DOM shape instead.
 * No interaction tests — component is purely static (no click handlers).
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StudentThemeHeatmap } from "../DataVisualizations";
import type { RecurringTheme } from "../../types";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const THEMES: RecurringTheme[] = [
  {
    theme: "transition routine",
    student_refs: ["Amira", "Brody"],
    evidence_count: 3,
    example_observations: ["obs1"],
  },
  {
    theme: "reading comprehension",
    student_refs: ["Amira", "Chantal"],
    evidence_count: 2,
    example_observations: ["obs2"],
  },
  {
    theme: "math difficulties",
    student_refs: ["Brody"],
    evidence_count: 1,
    example_observations: ["obs3"],
  },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("StudentThemeHeatmap", () => {
  it("renders an SVG when valid themes are provided", () => {
    const { container } = render(<StudentThemeHeatmap themes={THEMES} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("returns null when themes array is empty", () => {
    const { container } = render(<StudentThemeHeatmap themes={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("has an accessible role=img aria-label on the wrapper", () => {
    const { container } = render(<StudentThemeHeatmap themes={THEMES} />);
    const wrapper = container.querySelector("[role='img'][aria-label]");
    expect(wrapper).toBeTruthy();
    const label = wrapper?.getAttribute("aria-label");
    expect(label).toBeTruthy();
    expect(label!.length).toBeGreaterThan(0);
  });

  it("renders student alias labels in the SVG", () => {
    render(<StudentThemeHeatmap themes={THEMES} />);
    // Student aliases appear as SVG text nodes
    expect(screen.getByText("Amira")).toBeInTheDocument();
    expect(screen.getByText("Brody")).toBeInTheDocument();
    expect(screen.getByText("Chantal")).toBeInTheDocument();
  });

  it("renders a single theme with one student", () => {
    const single: RecurringTheme[] = [
      {
        theme: "focus issues",
        student_refs: ["Elena"],
        evidence_count: 2,
        example_observations: [],
      },
    ];
    const { container } = render(<StudentThemeHeatmap themes={single} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(screen.getByText("Elena")).toBeInTheDocument();
  });

  it("renders the SVG with rects for each student×theme cell", () => {
    const { container } = render(<StudentThemeHeatmap themes={THEMES} />);
    const rects = container.querySelectorAll("rect");
    // 3 students (Amira, Brody, Chantal) × 3 themes = 9 cells
    expect(rects.length).toBe(9);
  });
});
