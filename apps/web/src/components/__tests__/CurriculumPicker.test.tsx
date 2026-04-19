import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CurriculumPicker from "../CurriculumPicker";
import * as api from "../../api";

describe("CurriculumPicker entry label", () => {
  it("shows only the entry title when subject + grade filters are both set", async () => {
    vi.spyOn(api, "listCurriculumSubjects").mockResolvedValue([
      {
        subject_code: "english_language_arts_and_literature",
        subject_label: "English Language Arts and Literature",
      },
    ]);
    vi.spyOn(api, "listCurriculumEntries").mockResolvedValue([
      {
        entry_id: "ela-4-reading",
        jurisdiction: "ab",
        subject_code: "english_language_arts_and_literature",
        subject_label: "English Language Arts and Literature",
        grade: "4",
        grade_label: "Grade 4",
        title: "Reading — Comprehension Strategies",
        summary: "",
        implementation_status: "implemented",
        source_kind: "grade_at_a_glance",
        source_title: "Alberta Grade 4 ELA overview",
        source_url: "https://example.org/ela-4",
        source_updated_at: "2026-01-01",
        last_verified_at: "2026-01-01",
        focus_items: [{ focus_id: "f1", text: "Focus" }],
      },
    ]);

    render(
      <CurriculumPicker
        value={null}
        onChange={() => {}}
        subjectHint="ELA"
        gradeHint="4"
      />,
    );

    const option = await screen.findByRole("option", {
      name: /comprehension strategies/i,
    });
    expect(option.textContent).toBe("Reading — Comprehension Strategies");
    expect(option.textContent).not.toMatch(/grade 4/i);
    expect(option.textContent).not.toMatch(/english language arts/i);
  });
});
