import { describe, expect, it } from "vitest";
import type { ClassroomProfile } from "../../../packages/shared/schemas/classroom.js";
import {
  buildRosterScope,
  filterRosterScoped,
  isRosterScopedValue,
} from "../roster-scope.js";

function classroom(classroomId: string, aliases: string[]): ClassroomProfile {
  return {
    classroom_id: classroomId,
    grade_band: "3-4",
    subject_focus: "general",
    classroom_notes: [],
    routines: {},
    students: aliases.map((alias) => ({
      student_id: `${classroomId}-${alias}`,
      alias,
      eal_flag: false,
      support_tags: [],
      known_successful_scaffolds: [],
    })),
  };
}

describe("roster-scoped memory filtering", () => {
  const demoRoom = classroom("demo-okafor-grade34", ["Mika", "Leo", "Nia"]);
  const staleRoom = classroom("old-demo-room", ["Ari", "Sam"]);
  const scope = buildRosterScope(demoRoom, [demoRoom, staleRoom]);

  it("keeps records that only reference the active roster", () => {
    expect(isRosterScopedValue({
      student_refs: ["Mika", "Leo"],
      observation: "Mika and Leo used the math routine after lunch.",
    }, scope)).toBe(true);
  });

  it("drops records with structured aliases outside the active roster", () => {
    expect(isRosterScopedValue({
      student_refs: ["Ari"],
      observation: "Legacy fixture record",
    }, scope)).toBe(false);
  });

  it("drops records that mention a known outside alias in free text", () => {
    expect(isRosterScopedValue({
      student_refs: ["Mika"],
      observation: "Mika used the same routine Ari tried last week.",
    }, scope)).toBe(false);
  });

  it("filters mixed retrieval sets without mutating callers' arrays", () => {
    const records = [
      { record_id: "safe", student_refs: ["Nia"], observation: "Nia used a checklist." },
      { record_id: "leak", student_refs: ["Ari"], observation: "Ari struggled with fractions." },
    ];

    expect(filterRosterScoped(records, scope).map((record) => record.record_id)).toEqual(["safe"]);
    expect(records).toHaveLength(2);
  });
});
