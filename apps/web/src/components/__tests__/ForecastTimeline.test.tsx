/**
 * ForecastTimeline.test.tsx
 *
 * Minimum-viable behavior tests for the standalone ForecastTimeline component.
 * Covers: render, empty-state, interaction.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ForecastTimeline from "../ForecastTimeline";
import type { ComplexityBlock } from "../../types";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeBlock(
  time_slot: string,
  activity: string,
  level: ComplexityBlock["level"] = "medium",
): ComplexityBlock {
  return {
    time_slot,
    activity,
    level,
    contributing_factors: [],
    suggested_mitigation: "Monitor closely",
  };
}

const BLOCKS: ComplexityBlock[] = [
  makeBlock("8:30-9:15", "Literacy", "low"),
  makeBlock("9:15-10:00", "Math", "high"),
  makeBlock("10:00-10:45", "Science", "medium"),
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ForecastTimeline", () => {
  it("renders one button segment per block", () => {
    render(<ForecastTimeline blocks={BLOCKS} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(BLOCKS.length);
  });

  it("returns null (renders nothing) when blocks is empty", () => {
    const { container } = render(<ForecastTimeline blocks={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("each segment has a descriptive aria-label", () => {
    render(<ForecastTimeline blocks={BLOCKS} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveAttribute("aria-label", expect.stringContaining("Literacy"));
    expect(buttons[0]).toHaveAttribute("aria-label", expect.stringContaining("low"));
    expect(buttons[1]).toHaveAttribute("aria-label", expect.stringContaining("Math"));
    expect(buttons[1]).toHaveAttribute("aria-label", expect.stringContaining("high"));
  });

  it("fires onBlockClick with the block index when a segment is clicked", () => {
    const spy = vi.fn();
    render(<ForecastTimeline blocks={BLOCKS} onBlockClick={spy} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // second block → index 1
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(1);
  });

  it("fires onBlockClick with index 0 for the first block", () => {
    const spy = vi.fn();
    render(<ForecastTimeline blocks={BLOCKS} onBlockClick={spy} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    expect(spy).toHaveBeenCalledWith(0);
  });

  it("renders with a single block (edge case)", () => {
    render(<ForecastTimeline blocks={[makeBlock("8:00-8:30", "Morning meeting", "low")]} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAttribute("aria-label", expect.stringContaining("Morning meeting"));
  });

  it("does not throw when onBlockClick is omitted", () => {
    render(<ForecastTimeline blocks={BLOCKS} />);
    const buttons = screen.getAllByRole("button");
    // Should not throw — click with no handler is a no-op
    expect(() => fireEvent.click(buttons[0])).not.toThrow();
  });

  it("contains the time slot text in each segment", () => {
    render(<ForecastTimeline blocks={BLOCKS} />);
    expect(screen.getByText("8:30-9:15")).toBeInTheDocument();
    expect(screen.getByText("9:15-10:00")).toBeInTheDocument();
  });
});
