import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StudentTagGroupView from "../StudentTagGroupView";
import type { DrillDownContext } from "../../types";

type StudentTagGroupContext = Extract<DrillDownContext, { type: "student-tag-group" }>;

const EAL_CONTEXT: StudentTagGroupContext = {
  type: "student-tag-group",
  groupKind: "eal",
  tag: "eal_level_2",
  label: "EAL Level 2",
  students: [
    { alias: "Maya", eal_flag: true, support_tags: ["eal_level_2", "reading_support"] },
    { alias: "Ranbir", eal_flag: true, support_tags: ["eal_level_2"] },
    { alias: "Jordan", eal_flag: true, support_tags: ["eal_level_2", "math_support"] },
  ],
};

const SUPPORT_CLUSTER_CONTEXT: StudentTagGroupContext = {
  type: "student-tag-group",
  groupKind: "support_cluster",
  tag: "sensory",
  label: "Sensory Support Cluster",
  students: [
    { alias: "Alex", support_tags: ["sensory"] },
    { alias: "Sam", support_tags: ["sensory", "eal_level_1"] },
  ],
};

const EMPTY_CONTEXT: StudentTagGroupContext = {
  type: "student-tag-group",
  groupKind: "eal",
  tag: "eal_level_3",
  label: "EAL Level 3",
  students: [],
};

describe("StudentTagGroupView", () => {
  it("renders heading with label and student count for groupKind eal", () => {
    render(
      <StudentTagGroupView context={EAL_CONTEXT} onStudentSelect={vi.fn()} />
    );
    const heading = screen.getByRole("heading");
    expect(heading.textContent).toContain("EAL Level 2");
    expect(heading.textContent).toContain("3 students");
  });

  it("renders each student alias for groupKind eal", () => {
    render(
      <StudentTagGroupView context={EAL_CONTEXT} onStudentSelect={vi.fn()} />
    );
    expect(screen.getByText("Maya")).toBeInTheDocument();
    expect(screen.getByText("Ranbir")).toBeInTheDocument();
    expect(screen.getByText("Jordan")).toBeInTheDocument();
  });

  it("wraps each student row in a button type=button for groupKind eal", () => {
    render(
      <StudentTagGroupView context={EAL_CONTEXT} onStudentSelect={vi.fn()} />
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
    buttons.forEach((btn) => {
      expect(btn).toHaveAttribute("type", "button");
    });
  });

  it("renders students in a list for groupKind support_cluster", () => {
    render(
      <StudentTagGroupView context={SUPPORT_CLUSTER_CONTEXT} onStudentSelect={vi.fn()} />
    );
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(screen.getByText("Sam")).toBeInTheDocument();
  });

  it("fires onStudentSelect with correct alias when Enter is pressed on a button", async () => {
    const onStudentSelect = vi.fn();
    render(
      <StudentTagGroupView
        context={SUPPORT_CLUSTER_CONTEXT}
        onStudentSelect={onStudentSelect}
      />
    );
    const alexButton = screen.getByText("Alex").closest("button")!;
    alexButton.focus();
    await userEvent.keyboard("{Enter}");
    expect(onStudentSelect).toHaveBeenCalledWith("Alex");
  });

  it("renders empty state when students list is empty", () => {
    render(
      <StudentTagGroupView context={EMPTY_CONTEXT} onStudentSelect={vi.fn()} />
    );
    expect(screen.getByText("No students in this group.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
