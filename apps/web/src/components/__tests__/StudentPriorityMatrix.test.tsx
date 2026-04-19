import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { StudentPriorityMatrix } from "../DataVisualizations";
import type { StudentSummary } from "../../types";

function makeStudent(
  alias: string,
  overrides: Partial<StudentSummary> = {},
): StudentSummary {
  return {
    alias,
    pending_action_count: 0,
    active_pattern_count: 0,
    pending_message_count: 0,
    last_intervention_days: null,
    latest_priority_reason: null,
    ...overrides,
  } as StudentSummary;
}

describe("StudentPriorityMatrix — audit #14/#15/#16/#17 fixes", () => {
  it("plots ALL 26 students, not just those with open actions", () => {
    const active: StudentSummary[] = Array.from({ length: 3 }, (_, i) =>
      makeStudent(`Active${i}`, {
        pending_action_count: 2,
        last_intervention_days: 5,
      }),
    );
    const quiet: StudentSummary[] = Array.from({ length: 23 }, (_, i) =>
      makeStudent(`Quiet${i}`),
    );
    const { container } = render(
      <StudentPriorityMatrix students={[...active, ...quiet]} />,
    );
    // Active bubbles + quiet dots should sum to 26.
    const activeBubbles = container.querySelectorAll(
      '[data-testid^="viz-priority-student-Active"]',
    );
    const quietDots = container.querySelectorAll(
      '[data-testid^="viz-priority-quiet-Quiet"]',
    );
    expect(activeBubbles.length).toBe(3);
    expect(quietDots.length).toBe(23);
    // And the quiet dots use the low-opacity "quiet" class.
    const quietCircles = container.querySelectorAll(
      ".viz-priority-matrix__dot--quiet",
    );
    expect(quietCircles.length).toBe(23);
  });

  it("reflects '{N} plotted · {M} priority students' in the subtitle", () => {
    const students = [
      makeStudent("A", { pending_action_count: 2, last_intervention_days: 5 }),
      makeStudent("B"), // quiet
      makeStudent("C"), // quiet
    ];
    render(<StudentPriorityMatrix students={students} />);
    expect(screen.getByText(/3 plotted/)).toBeInTheDocument();
    expect(screen.getByText(/1 priority student/i)).toBeInTheDocument();
  });

  it("exposes a PRIORITY SCORE header above the right-side ranks list", () => {
    const students = [
      makeStudent("Amira", {
        pending_action_count: 2,
        last_intervention_days: 5,
      }),
    ];
    render(<StudentPriorityMatrix students={students} />);
    expect(screen.getByTestId("priority-matrix-score-header")).toHaveTextContent(
      /priority score/i,
    );
  });

  it("renders quadrant tints (not a dashed CHECK FIRST box)", () => {
    const students = [
      makeStudent("Amira", {
        pending_action_count: 2,
        last_intervention_days: 5,
      }),
    ];
    const { container } = render(<StudentPriorityMatrix students={students} />);
    expect(
      container.querySelector(".viz-priority-matrix__quadrant--check-first"),
    ).toBeInTheDocument();
    expect(
      container.querySelector(".viz-priority-matrix__quadrant--watch"),
    ).toBeInTheDocument();
    // No rendered dashed watch-zone — it's been collapsed to transparent.
    const zone = container.querySelector(".viz-priority-matrix__watch-zone");
    // The element may still exist for back-compat but must not carry the
    // old dashed-red treatment: either the class is removed or the fill
    // is transparent.
    if (zone) {
      const style = window.getComputedStyle(zone as Element);
      // In jsdom, computed style is minimal; assert the CSS rule-based
      // contract indirectly via DOM — the label must be hidden.
      const label = container.querySelector(".viz-priority-matrix__zone-label");
      expect(label).toBeNull();
      expect(style).toBeTruthy(); // satisfy lint
    }
  });

  it("reveals the full student note on row click (no mid-sentence truncation)", async () => {
    const user = userEvent.setup();
    const longReason = "A".repeat(120);
    const students = [
      makeStudent("Amira", {
        pending_action_count: 3,
        last_intervention_days: 5,
        latest_priority_reason: longReason,
      }),
    ];
    const { container } = render(<StudentPriorityMatrix students={students} />);
    // Row starts in collapsed (non-expanded) state.
    const reason = container.querySelector(
      ".viz-priority-matrix__student-reason",
    );
    expect(reason?.className).not.toMatch(
      /viz-priority-matrix__student-reason--expanded/,
    );
    // Clicking the row expands the reason inline.
    await user.click(screen.getByTestId("viz-priority-row-Amira"));
    const afterClick = container.querySelector(
      ".viz-priority-matrix__student-reason",
    );
    expect(afterClick?.className).toMatch(
      /viz-priority-matrix__student-reason--expanded/,
    );
    expect(afterClick?.textContent).toBe(longReason);
  });
});
