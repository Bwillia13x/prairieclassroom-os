import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CohortSparklineGrid from "../CohortSparklineGrid";
import type { StudentSummary } from "../../types";

function makeStudent(
  alias: string,
  history: number[] = new Array(14).fill(0),
  overrides: Partial<StudentSummary> = {},
): StudentSummary {
  return {
    alias,
    pending_action_count: 0,
    last_intervention_days: null,
    active_pattern_count: 0,
    pending_message_count: 0,
    latest_priority_reason: null,
    intervention_history_14d: history,
    ...overrides,
  };
}

describe("CohortSparklineGrid", () => {
  it("renders one cell per student", () => {
    const students = [
      makeStudent("A1"),
      makeStudent("A2"),
      makeStudent("A3"),
    ];
    render(<CohortSparklineGrid students={students} />);
    expect(screen.getAllByTestId("cohort-cell")).toHaveLength(3);
  });

  it("shows the student alias as a visible label in each cell", () => {
    const students = [makeStudent("Amira"), makeStudent("Brody")];
    render(<CohortSparklineGrid students={students} />);
    expect(screen.getByText("Amira")).toBeInTheDocument();
    expect(screen.getByText("Brody")).toBeInTheDocument();
  });

  it("renders an SVG sparkline in cells with non-zero history", () => {
    const students = [
      makeStudent("A1", [0, 0, 0, 0, 0, 0, 1, 0, 2, 0, 1, 0, 3, 1]),
    ];
    const { container } = render(<CohortSparklineGrid students={students} />);
    const cell = container.querySelector("[data-testid='cohort-cell']");
    expect(cell?.querySelector("svg polyline")).toBeInTheDocument();
  });

  it("shows a flat baseline (no spike) for students with all-zero history", () => {
    const students = [makeStudent("Quiet", new Array(14).fill(0))];
    const { container } = render(<CohortSparklineGrid students={students} />);
    const cell = container.querySelector("[data-testid='cohort-cell']");
    expect(cell?.querySelector("svg")).toBeInTheDocument();
    expect(cell?.textContent).toContain("Quiet");
  });

  it("renders an empty-state when given zero students", () => {
    render(<CohortSparklineGrid students={[]} />);
    expect(screen.getByText(/no students/i)).toBeInTheDocument();
  });

  it("each cell exposes an aria-label combining alias and intervention total", () => {
    const students = [
      makeStudent("Amira", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 2, 0]),
    ];
    render(<CohortSparklineGrid students={students} />);
    const cell = screen.getByTestId("cohort-cell");
    expect(cell.getAttribute("aria-label")).toMatch(/amira/i);
    expect(cell.getAttribute("aria-label")).toMatch(/3/);
  });

  it("calls onStudentClick with alias when a cell is clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const students = [makeStudent("Amira"), makeStudent("Brody")];
    render(<CohortSparklineGrid students={students} onStudentClick={onClick} />);
    await user.click(screen.getByText("Amira"));
    expect(onClick).toHaveBeenCalledWith("Amira");
  });

  it("does not render click affordance when onStudentClick is omitted", () => {
    const students = [makeStudent("Amira")];
    render(<CohortSparklineGrid students={students} />);
    const cell = screen.getByTestId("cohort-cell");
    expect(cell.tagName.toLowerCase()).not.toBe("button");
  });

  it("renders a cohort baseline overlay element when more than 1 student is provided", () => {
    const students = [makeStudent("A1"), makeStudent("A2")];
    const { container } = render(<CohortSparklineGrid students={students} />);
    expect(container.querySelector("[data-testid='cohort-baseline']")).toBeInTheDocument();
  });

  it("does not render a baseline for a single student", () => {
    const students = [makeStudent("Solo")];
    const { container } = render(<CohortSparklineGrid students={students} />);
    expect(container.querySelector("[data-testid='cohort-baseline']")).toBeNull();
  });
});
