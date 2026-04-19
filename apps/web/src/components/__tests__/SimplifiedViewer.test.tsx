import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SimplifiedViewer from "../SimplifiedViewer";

describe("SimplifiedViewer defaults", () => {
  it("initializes Grade from defaultGradeBand prop", () => {
    render(
      <SimplifiedViewer
        onSubmit={() => {}}
        result={null}
        loading={false}
        defaultGradeBand="Grade 3"
      />,
    );
    const grade = screen.getByLabelText(/grade$/i) as HTMLSelectElement;
    expect(grade.value).toBe("Grade 3");
  });

  it("falls back to Grade 4 when defaultGradeBand is undefined", () => {
    render(
      <SimplifiedViewer onSubmit={() => {}} result={null} loading={false} />,
    );
    const grade = screen.getByLabelText(/grade$/i) as HTMLSelectElement;
    expect(grade.value).toBe("Grade 4");
  });
});
