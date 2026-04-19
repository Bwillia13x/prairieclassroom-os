import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ClassroomCompositionRings } from "../DataVisualizations";

const STUDENTS = [
  {
    alias: "Amira",
    eal_flag: true,
    support_tags: ["eal_level_1", "sensory_break"],
    family_language: "ar",
  },
  {
    alias: "Brody",
    eal_flag: true,
    support_tags: ["eal_level_2", "sensory_break"],
    family_language: "ur",
  },
  {
    alias: "Carmen",
    eal_flag: false,
    support_tags: ["extension_mentor"],
    family_language: "en",
  },
  {
    alias: "Dara",
    eal_flag: false,
    support_tags: [],
    family_language: "en",
  },
];

describe("ClassroomCompositionRings — audit #20/#21 cross-highlight + labeled actions", () => {
  it("tints the paired bar row when the donut segment is hovered (audit #20)", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<ClassroomCompositionRings students={STUDENTS} onSegmentClick={spy} />);
    const segment = screen.getByTestId("viz-composition-segment-eal-eal_level_2");
    const row = screen.getByTestId("viz-composition-row-eal-eal_level_2");
    expect(row.className).not.toMatch(/viz-composition__row--active/);
    await user.hover(segment);
    expect(row.className).toMatch(/viz-composition__row--active/);
    expect(segment.getAttribute("class") ?? "").toMatch(
      /viz-composition__segment--active/,
    );
  });

  it("tints the paired donut segment when the bar row is hovered (audit #20)", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<ClassroomCompositionRings students={STUDENTS} onSegmentClick={spy} />);
    const row = screen.getByTestId("viz-composition-row-eal-eal_level_1");
    const segment = screen.getByTestId("viz-composition-segment-eal-eal_level_1");
    await user.hover(row);
    expect(segment.getAttribute("class") ?? "").toMatch(
      /viz-composition__segment--active/,
    );
  });

  it("clears cross-highlight on mouse leave", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<ClassroomCompositionRings students={STUDENTS} onSegmentClick={spy} />);
    const segment = screen.getByTestId("viz-composition-segment-eal-eal_level_2");
    const row = screen.getByTestId("viz-composition-row-eal-eal_level_2");
    await user.hover(segment);
    expect(row.className).toMatch(/viz-composition__row--active/);
    await user.unhover(segment);
    expect(row.className).not.toMatch(/viz-composition__row--active/);
  });

  it("renders the header chips as labeled 'View …' buttons (audit #21)", () => {
    const spy = vi.fn();
    render(<ClassroomCompositionRings students={STUDENTS} onSegmentClick={spy} />);
    expect(
      screen.getByRole("button", { name: /View \d+ need groups?/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /View .* leads/i }),
    ).toBeInTheDocument();
  });

  it("fires onSegmentClick with an 'all' need-groups payload when the header 'View need groups' button is clicked", () => {
    const spy = vi.fn();
    render(<ClassroomCompositionRings students={STUDENTS} onSegmentClick={spy} />);
    fireEvent.click(screen.getByTestId("viz-composition-view-needs"));
    expect(spy).toHaveBeenCalledTimes(1);
    const payload = spy.mock.calls[0][0];
    expect(payload.groupKind).toBe("support_cluster");
    expect(payload.tag).toBe("all");
    expect(payload.students.length).toBeGreaterThan(0);
  });

  it("falls back to inert captions when no onSegmentClick is provided", () => {
    render(<ClassroomCompositionRings students={STUDENTS} />);
    // No interactive buttons, but the caption still reports the count.
    expect(screen.queryByTestId("viz-composition-view-needs")).toBeNull();
    expect(screen.getByText(/need groups?/i)).toBeInTheDocument();
  });
});
