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

  it("renders model metadata with a generated simplification", () => {
    render(
      <SimplifiedViewer
        onSubmit={() => {}}
        loading={false}
        result={{
          simplified: {
            simplified_id: "simp-test",
            source_text: "Photosynthesis is the process plants use to make food.",
            grade_band: "Grade 4",
            eal_level: "beginner",
            simplified_text: "Plants use sunlight to make food.",
            key_vocabulary: ["sunlight"],
            visual_cue_suggestions: ["Use a plant picture."],
            schema_version: "0.1.0",
          },
          model_id: "mock",
          latency_ms: 120,
          total_tokens: 321,
        }}
      />,
    );

    expect(screen.getByText("Mock (offline)")).toBeInTheDocument();
    expect(screen.getByText("120 ms")).toBeInTheDocument();
    expect(screen.getByText("321 tokens")).toBeInTheDocument();
  });
});
