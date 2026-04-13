import { describe, expect, it } from "vitest";
import {
  formatCurriculumSelectionForPrompt,
  listCurriculumEntries,
  listCurriculumSubjects,
  resolveCurriculumSelection,
  suggestCurriculumEntries,
} from "../curriculum-registry.js";
import type { ClassroomProfile } from "../../../packages/shared/schemas/classroom.js";

describe("curriculum registry", () => {
  it("lists the Alberta curriculum subjects once each", () => {
    const subjects = listCurriculumSubjects();
    expect(subjects).toHaveLength(4);
    expect(subjects.map((subject) => subject.subject_code)).toContain("mathematics");
    expect(subjects.map((subject) => subject.subject_code)).toContain("science");
  });

  it("filters entries by subject and grade", () => {
    const entries = listCurriculumEntries({ subjectCode: "mathematics", grade: "3" });
    expect(entries).toHaveLength(1);
    expect(entries[0].entry_id).toBe("ab-math-3");
  });

  it("resolves a valid selection and formats prompt text", () => {
    const hydrated = resolveCurriculumSelection({
      entry_id: "ab-science-4",
      selected_focus_ids: ["waste-management", "non-contact-forces"],
    });

    expect(hydrated?.entry.subject_code).toBe("science");
    expect(hydrated?.focusItems).toHaveLength(2);
    expect(formatCurriculumSelectionForPrompt(hydrated)).toContain("ALBERTA CURRICULUM ALIGNMENT");
  });

  it("rejects selections with unknown focus ids", () => {
    const hydrated = resolveCurriculumSelection({
      entry_id: "ab-science-4",
      selected_focus_ids: ["missing-focus-id"],
    });
    expect(hydrated).toBeNull();
  });

  it("suggests curriculum entries from classroom context and extracted text", () => {
    const classroom: ClassroomProfile = {
      classroom_id: "test-science-room",
      grade_band: "4-5",
      subject_focus: "science_and_writing",
      classroom_notes: [],
      routines: {},
      students: [],
    };

    const suggestions = suggestCurriculumEntries(
      classroom,
      "Students observe habitats, gather evidence, and explain how energy moves through an ecosystem.",
    );

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].subject_code).toBe("science");
    expect(["4", "5"]).toContain(suggestions[0].grade);
  });
});
