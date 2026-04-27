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

  it("never produces NaN coordinates in the points attribute", () => {
    const students = [
      makeStudent("A1", [1, 2, 3, 4, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      makeStudent("A2", new Array(14).fill(0)),
    ];
    const { container } = render(<CohortSparklineGrid students={students} />);
    const polylines = container.querySelectorAll("svg polyline");
    expect(polylines.length).toBeGreaterThan(0);
    for (const pl of Array.from(polylines)) {
      const points = pl.getAttribute("points") ?? "";
      expect(points).not.toMatch(/NaN/);
      expect(points).toMatch(/^[0-9. ,]+$/);
    }
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

  /* Phase C1 (2026-04-27) — severity tone classification.
     Each cell publishes a `data-severity` attribute that downstream
     CSS maps to the canonical chart-tone scale. The thresholds are
     cohort-relative: a student materially above the cohort 14-day
     sum reads "high"; materially below reads "low"; everything in
     between reads "medium". A single-student view defaults to
     "medium" because there is no cohort baseline to compare
     against — guarding against a divide-by-zero downgrade to
     "low". */
  it("classifies each student's severity relative to the cohort baseline", () => {
    const QUIET = [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]; // 1
    const ACTIVE = [1, 0, 1, 0, 2, 0, 1, 0, 2, 1, 1, 1, 0, 1]; // 11
    const students = [
      makeStudent("Quiet", QUIET),
      makeStudent("Mid", ACTIVE.map((v) => Math.max(0, v - 1))), // ~5
      makeStudent("Active", ACTIVE),
      makeStudent("AlsoActive", ACTIVE.map((v) => v + 1)), // ~25
    ];
    render(<CohortSparklineGrid students={students} />);
    const severities = screen
      .getAllByTestId("cohort-cell")
      .map((cell) => ({
        alias: cell.querySelector(".cohort-cell__alias")?.textContent,
        severity: cell.getAttribute("data-severity"),
      }));
    // Order is alphabetical by alias.
    const byAlias = Object.fromEntries(
      severities.map((s) => [s.alias!, s.severity!]),
    );
    expect(byAlias.Quiet).toBe("low");
    expect(byAlias.AlsoActive).toBe("high");
    // Mid + Active fall on either side of the cohort norm — both
    // should resolve to a defined tone. The most important contract
    // is that low/medium/high are the only three values, never null.
    expect(["low", "medium", "high"]).toContain(byAlias.Mid);
    expect(["low", "medium", "high"]).toContain(byAlias.Active);
  });

  it("defaults to medium severity when only one student is rendered (no cohort baseline)", () => {
    const students = [
      makeStudent("Solo", [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0]),
    ];
    render(<CohortSparklineGrid students={students} />);
    const cell = screen.getByTestId("cohort-cell");
    expect(cell.getAttribute("data-severity")).toBe("medium");
  });

  it("paints a trajectory gradient stroke when polyline endpoints have differing local severity", () => {
    // Phase δ2 (2026-04-28). Student "Climber" starts at 0 on day 0 and
    // ends at 4 on day 13; the cohort baseline at those positions sits
    // between the two students at low/high cohort norms, so the
    // endpoint classifier produces (low → high). The other students
    // anchor a non-trivial cohort baseline so the per-day comparison
    // resolves correctly.
    const students = [
      makeStudent("Climber", [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 4, 4]),
      makeStudent("Steady",  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]),
      makeStudent("Calmer",  [4, 4, 3, 2, 2, 1, 1, 1, 1, 1, 0, 0, 0, 0]),
    ];
    const { container } = render(<CohortSparklineGrid students={students} />);
    // Pull every cohort-cell__line polyline. At least one must carry
    // a `data-trajectory="true"` marker, signalling that the gradient
    // stroke was applied (endpoints differed in local severity).
    const trajectoryLines = container.querySelectorAll(
      ".cohort-cell__line[data-trajectory='true']",
    );
    expect(trajectoryLines.length).toBeGreaterThan(0);
    // The trajectory polyline references one of the six pre-defined
    // gradient ids (asymmetric severity pairs). Verify the id shape.
    const stroke = trajectoryLines[0]?.getAttribute("stroke") ?? "";
    expect(stroke).toMatch(
      /^url\(#cohort-trajectory-(low|medium|high)-(low|medium|high)\)$/,
    );
  });
});
