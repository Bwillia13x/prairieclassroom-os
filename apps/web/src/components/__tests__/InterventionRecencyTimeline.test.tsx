import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { InterventionRecencyTimeline } from "../DataVisualizations";
import type { StudentSummary } from "../../types";

function mkStudent(alias: string, days: number): StudentSummary {
  return {
    alias,
    pending_action_count: 0,
    active_pattern_count: 0,
    pending_message_count: 0,
    last_intervention_days: days,
    latest_priority_reason: null,
  } as StudentSummary;
}

describe("InterventionRecencyTimeline — audit #18/#19 split scale", () => {
  it("renders a scaled bar for WATCH rows (days in range)", () => {
    const students = [mkStudent("Hannah", 11)];
    const { container } = render(
      <InterventionRecencyTimeline students={students} maxDays={14} />,
    );
    const row = screen.getByTestId("viz-recency-row-Hannah");
    expect(row.querySelector(".viz-recency__bar-track")).not.toBeNull();
    expect(row.querySelector(".viz-recency__stale-number")).toBeNull();
    expect(row.className).toMatch(/viz-recency__row--watch/);
    // The row keeps the proportional bar, so no stale-dot layout.
    expect(container.querySelectorAll(".viz-recency__stale-dot").length).toBe(0);
  });

  it("renders a dot-and-number without a scaled bar for BEYOND TARGET rows", () => {
    const students = [mkStudent("Brody", 390)];
    render(<InterventionRecencyTimeline students={students} maxDays={14} />);
    const row = screen.getByTestId("viz-recency-row-Brody");
    expect(row.querySelector(".viz-recency__bar-track")).toBeNull();
    expect(row.querySelector(".viz-recency__stale-number")).not.toBeNull();
    expect(row).toHaveTextContent(/390d/);
    expect(row.className).toMatch(/viz-recency__row--beyond/);
  });

  it("anchors the hero callout to the target baseline (audit #19)", () => {
    const students = [mkStudent("Brody", 390)];
    render(<InterventionRecencyTimeline students={students} maxDays={14} />);
    expect(screen.getByTestId("recency-hero-baseline")).toHaveTextContent(
      /376d past the 14-day target/i,
    );
  });

  it("says 'Inside the {maxDays}-day target' when the longest gap is within target", () => {
    const students = [mkStudent("Amira", 8)];
    render(<InterventionRecencyTimeline students={students} maxDays={14} />);
    expect(screen.getByTestId("recency-hero-baseline")).toHaveTextContent(
      /inside the 14-day target/i,
    );
  });

  it("splits the two tiers per row even when both are present", () => {
    const students = [mkStudent("Brody", 390), mkStudent("Hannah", 11)];
    render(<InterventionRecencyTimeline students={students} maxDays={14} />);
    const brody = screen.getByTestId("viz-recency-row-Brody");
    const hannah = screen.getByTestId("viz-recency-row-Hannah");
    expect(brody.className).toMatch(/viz-recency__row--beyond/);
    expect(hannah.className).toMatch(/viz-recency__row--watch/);
  });
});
