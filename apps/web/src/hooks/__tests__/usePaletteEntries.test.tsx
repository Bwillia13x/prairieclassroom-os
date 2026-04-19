import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePaletteEntries } from "../usePaletteEntries";
import type { ClassroomProfile } from "../../types";

const CLASSROOM: ClassroomProfile = {
  classroom_id: "demo-okafor-grade34",
  grade_band: "3-4",
  subject_focus: "literacy_numeracy",
  students: [{ alias: "Amara", family_language: "en" }],
} as unknown as ClassroomProfile;

describe("usePaletteEntries", () => {
  it("produces a panel entry for every TAB_ORDER entry", () => {
    const { result } = renderHook(() =>
      usePaletteEntries({ classrooms: [CLASSROOM], activeClassroom: CLASSROOM.classroom_id, debtRegister: null }),
    );
    const panelEntries = result.current.filter((e) => e.kind === "panel");
    expect(panelEntries.length).toBeGreaterThanOrEqual(12);
  });

  it("produces a classroom entry for every non-active classroom", () => {
    const { result } = renderHook(() =>
      usePaletteEntries({ classrooms: [CLASSROOM], activeClassroom: "other-id", debtRegister: null }),
    );
    const classroomEntries = result.current.filter((e) => e.kind === "classroom");
    expect(classroomEntries).toHaveLength(1);
    expect(classroomEntries[0].label).toMatch(/grade 3-4/i);
  });

  it("does not include active classroom", () => {
    const { result } = renderHook(() =>
      usePaletteEntries({ classrooms: [CLASSROOM], activeClassroom: CLASSROOM.classroom_id, debtRegister: null }),
    );
    const classroomEntries = result.current.filter((e) => e.kind === "classroom");
    expect(classroomEntries).toHaveLength(0);
  });

  it("produces an action entry for Draft family message", () => {
    const { result } = renderHook(() =>
      usePaletteEntries({ classrooms: [CLASSROOM], activeClassroom: CLASSROOM.classroom_id, debtRegister: null }),
    );
    expect(result.current.some((e) => e.kind === "action" && /draft family message/i.test(e.label))).toBe(true);
  });

  it("includes per-student actions when debtRegister has flagged students", () => {
    const { result } = renderHook(() =>
      usePaletteEntries({
        classrooms: [CLASSROOM],
        activeClassroom: CLASSROOM.classroom_id,
        debtRegister: {
          items: [
            { category: "unapproved_message", student_refs: ["Amara"], age_days: 1 },
            { category: "stale_followup", student_refs: ["Brody"], age_days: 5 },
          ],
        },
      }),
    );
    expect(result.current.some((e) => e.kind === "action" && /draft family message for amara/i.test(e.label))).toBe(true);
    expect(result.current.some((e) => e.kind === "action" && /log follow-up for brody/i.test(e.label))).toBe(true);
  });
});
