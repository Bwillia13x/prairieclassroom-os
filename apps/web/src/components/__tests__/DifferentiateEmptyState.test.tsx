import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DifferentiateEmptyState from "../DifferentiateEmptyState";

describe("DifferentiateEmptyState sample preview", () => {
  it("renders a labeled sample snippet for each of the three lanes", () => {
    render(<DifferentiateEmptyState onStart={() => {}} />);
    expect(screen.getByText(/sample — core/i)).toBeInTheDocument();
    expect(screen.getByText(/sample — chunked/i)).toBeInTheDocument();
    expect(screen.getByText(/sample — language/i)).toBeInTheDocument();
  });

  it("no longer renders the numbered step list", () => {
    render(<DifferentiateEmptyState onStart={() => {}} />);
    expect(
      screen.queryByText(/select the classroom and confirm/i),
    ).not.toBeInTheDocument();
  });

  it("when classroom summary is supplied, shows readiness band + EAL count", () => {
    render(
      <DifferentiateEmptyState
        onStart={() => {}}
        classroomSummary={{ totalStudents: 26, ealStudents: 7, gradeBand: "3-4" }}
      />,
    );
    expect(screen.getByText(/26 students/i)).toBeInTheDocument();
    expect(screen.getByText(/7 eal/i)).toBeInTheDocument();
    expect(screen.getByText(/grade 3-4/i)).toBeInTheDocument();
  });
});
