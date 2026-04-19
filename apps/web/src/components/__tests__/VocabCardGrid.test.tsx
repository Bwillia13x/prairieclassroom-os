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
});
