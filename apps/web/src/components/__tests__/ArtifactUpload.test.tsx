import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ArtifactUpload from "../ArtifactUpload";

const CLASSROOMS = [
  { classroom_id: "demo", grade_band: "3-4", subject_focus: "literacy" },
];

describe("ArtifactUpload required-field legend", () => {
  it("shows an * legend describing required fields", () => {
    render(
      <ArtifactUpload
        classrooms={CLASSROOMS}
        selectedClassroom="demo"
        onSubmit={() => {}}
        loading={false}
      />,
    );
    expect(screen.getByText(/required/i)).toBeInTheDocument();
  });

  it("marks required labels with an asterisk", () => {
    render(
      <ArtifactUpload
        classrooms={CLASSROOMS}
        selectedClassroom="demo"
        onSubmit={() => {}}
        loading={false}
      />,
    );
    const titleLabel = screen.getByText(/artifact title/i).closest("label");
    const sourceLabel = screen.getByText(/artifact source/i).closest("label");
    expect(titleLabel?.querySelector(".field-required")).not.toBeNull();
    expect(sourceLabel?.querySelector(".field-required")).not.toBeNull();
  });
});

describe("ArtifactUpload Alberta Curriculum advanced toggle", () => {
  it("hides the Alberta Curriculum Alignment block by default", () => {
    render(
      <ArtifactUpload
        classrooms={CLASSROOMS}
        selectedClassroom="demo"
        onSubmit={() => {}}
        loading={false}
      />,
    );
    // The heading from CurriculumPicker should not be in the DOM.
    expect(screen.queryByRole("heading", { name: /alberta curriculum alignment/i })).not.toBeInTheDocument();
  });

  it("reveals the Alberta Curriculum Alignment block when the toggle is pressed", () => {
    render(
      <ArtifactUpload
        classrooms={CLASSROOMS}
        selectedClassroom="demo"
        onSubmit={() => {}}
        loading={false}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /alberta curriculum/i }),
    );
    expect(
      screen.getByRole("heading", { name: /alberta curriculum alignment/i }),
    ).toBeInTheDocument();
  });
});

describe("ArtifactUpload source-mode descriptions", () => {
  it("renders a sub-label describing each mode", () => {
    render(
      <ArtifactUpload
        classrooms={CLASSROOMS}
        selectedClassroom="demo"
        onSubmit={() => {}}
        loading={false}
      />,
    );
    expect(screen.getByText(/photo of a worksheet/i)).toBeInTheDocument();
    expect(screen.getByText(/pdf or word/i)).toBeInTheDocument();
    expect(screen.getByText(/paste text directly/i)).toBeInTheDocument();
  });
});
