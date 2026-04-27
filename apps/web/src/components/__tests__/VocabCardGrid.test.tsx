import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import VocabCardGrid from "../VocabCardGrid";
import * as api from "../../api";

beforeEach(() => {
  vi.spyOn(api, "listCurriculumSubjects").mockResolvedValue([]);
  vi.spyOn(api, "listCurriculumEntries").mockResolvedValue([]);
});

describe("VocabCardGrid defaults", () => {
  it("initializes Grade from defaultGradeBand", () => {
    const { container } = render(
      <VocabCardGrid
        onSubmit={() => {}}
        result={null}
        loading={false}
        defaultGradeBand="Grade 3"
      />,
    );
    const grade = container.querySelector("#vocab-grade") as HTMLSelectElement;
    expect(grade).not.toBeNull();
    expect(grade.value).toBe("Grade 3");
  });

  it("initializes Target Language from defaultTargetLanguage", () => {
    render(
      <VocabCardGrid
        onSubmit={() => {}}
        result={null}
        loading={false}
        defaultTargetLanguage="ar"
      />,
    );
    const lang = screen.getByLabelText(/target language/i) as HTMLSelectElement;
    expect(lang.value).toBe("ar");
  });

  it("renders only one Subject control (the CurriculumPicker's)", () => {
    render(<VocabCardGrid onSubmit={() => {}} result={null} loading={false} />);
    const subjectControls = screen.queryAllByLabelText(/^subject$/i);
    expect(subjectControls.length).toBe(1);
  });

  it("renders model metadata with generated vocabulary cards", () => {
    render(
      <VocabCardGrid
        onSubmit={() => {}}
        loading={false}
        result={{
          card_set: {
            set_id: "vocab-test",
            artifact_id: "artifact-test",
            subject: "ELA",
            target_language: "pa",
            grade_band: "Grade 4",
            cards: [{
              term: "habitat",
              definition: "The place where a living thing lives.",
              target_translation: "nivas",
              example_sentence: "A pond is a habitat for frogs.",
              visual_hint: "Draw a pond with plants.",
            }],
            schema_version: "0.1.0",
          },
          model_id: "gemma-4-26b-a4b-it",
          latency_ms: 1400,
          total_tokens: 1200,
        }}
      />,
    );

    expect(screen.getByText("Gemma 4 · live")).toBeInTheDocument();
    expect(screen.getByText("1.4 s")).toBeInTheDocument();
    expect(screen.getByText("1.2k tokens")).toBeInTheDocument();
  });
});
