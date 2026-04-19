import { describe, it, expect } from "vitest";
import {
  pickDefaultTargetLanguage,
  pickDefaultGradeBand,
  mostCommonFamilyLanguage,
} from "../classroomLanguageDefaults";
import type { ClassroomProfile } from "../../types";

function makeProfile(partial: Partial<ClassroomProfile>): ClassroomProfile {
  return {
    classroom_id: "demo",
    grade_band: "3-4",
    subject_focus: "literacy",
    classroom_notes: [],
    students: [],
    ...partial,
  };
}

describe("pickDefaultTargetLanguage", () => {
  it("returns the language code of the most common non-English family language", () => {
    const profile = makeProfile({
      students: [
        { alias: "A", family_language: "Arabic" },
        { alias: "B", family_language: "Arabic" },
        { alias: "C", family_language: "Spanish" },
        { alias: "D", family_language: "English" },
      ],
    });
    expect(pickDefaultTargetLanguage(profile)).toBe("ar");
  });

  it("returns 'es' as fallback when no family languages are recorded", () => {
    expect(pickDefaultTargetLanguage(makeProfile({ students: [] }))).toBe("es");
  });

  it("ignores English (any case) and defaults to the next most common", () => {
    const profile = makeProfile({
      students: [
        { alias: "A", family_language: "english" },
        { alias: "B", family_language: "English" },
        { alias: "C", family_language: "Tagalog" },
      ],
    });
    expect(pickDefaultTargetLanguage(profile)).toBe("tl");
  });

  it("falls back to 'es' when the most common language has no code mapping", () => {
    const profile = makeProfile({
      students: [{ alias: "A", family_language: "Klingon" }],
    });
    expect(pickDefaultTargetLanguage(profile)).toBe("es");
  });
});

describe("pickDefaultGradeBand", () => {
  it("normalizes numeric grade_band to 'Grade N'", () => {
    expect(pickDefaultGradeBand(makeProfile({ grade_band: "4" }))).toBe("Grade 4");
  });

  it("returns the first numeric segment of a range like '3-4'", () => {
    expect(pickDefaultGradeBand(makeProfile({ grade_band: "3-4" }))).toBe("Grade 3");
  });

  it("falls back to 'Grade 4' when grade_band is unrecognized", () => {
    expect(pickDefaultGradeBand(makeProfile({ grade_band: "" }))).toBe("Grade 4");
  });
});

describe("mostCommonFamilyLanguage", () => {
  it("returns null when students is empty", () => {
    expect(mostCommonFamilyLanguage([])).toBeNull();
  });
});
