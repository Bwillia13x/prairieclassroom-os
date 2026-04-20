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

  it("includes section keywords (prep/ops/review) in generic action entries", () => {
    const { result } = renderHook(() =>
      usePaletteEntries({ classrooms: [CLASSROOM], activeClassroom: CLASSROOM.classroom_id, debtRegister: null }),
    );
    const actions = result.current.filter((e) => e.kind === "action");
    const prepActions = actions.filter((a) => a.keywords.includes("prep"));
    const opsActions = actions.filter((a) => a.keywords.includes("ops"));
    const reviewActions = actions.filter((a) => a.keywords.includes("review"));
    expect(prepActions.length).toBeGreaterThanOrEqual(2);
    expect(opsActions.length).toBeGreaterThanOrEqual(4);
    expect(reviewActions.length).toBeGreaterThanOrEqual(2);
  });

  it("includes 'Start lesson prep' and 'Review support patterns' as new action labels", () => {
    const { result } = renderHook(() =>
      usePaletteEntries({ classrooms: [CLASSROOM], activeClassroom: CLASSROOM.classroom_id, debtRegister: null }),
    );
    expect(result.current.some((e) => e.kind === "action" && /start lesson prep/i.test(e.label))).toBe(true);
    expect(result.current.some((e) => e.kind === "action" && /review support patterns/i.test(e.label))).toBe(true);
  });
});
