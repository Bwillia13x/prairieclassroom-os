import { describe, expect, it } from "vitest";
import { buildSupportPatternsPrompt } from "../support-patterns.js";

describe("buildSupportPatternsPrompt", () => {
  it("includes an explicit classroom roster allowlist", () => {
    const prompt = buildSupportPatternsPrompt(
      {
        classroom_id: "demo-okafor-grade34",
        grade_band: "3-4",
        subject_focus: "Literacy and Math",
        classroom_notes: [],
        routines: {},
        students: [
          {
            student_id: "student-1",
            alias: "Amira",
            eal_flag: true,
            support_tags: [],
            known_successful_scaffolds: [],
          },
          {
            student_id: "student-2",
            alias: "Brody",
            eal_flag: false,
            support_tags: [],
            known_successful_scaffolds: [],
          },
        ],
      },
      {
        classroom_id: "demo-okafor-grade34",
        time_window: 10,
      },
      "INTERVENTION RECORDS:\n- [int-1] Amira: observation -> action",
    );

    expect(prompt.system).toContain("ONLY use student aliases that appear in the classroom roster provided below");
    expect(prompt.user).toContain("Roster aliases: Amira, Brody");
    expect(prompt.system).toContain("NEVER borrow or reuse aliases from another classroom");
  });
});
