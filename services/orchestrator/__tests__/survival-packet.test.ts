import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildSurvivalPacketPrompt, parseSurvivalPacketResponse } from "../survival-packet.js";

describe("buildSurvivalPacketPrompt", () => {
  it("includes an explicit classroom roster allowlist", () => {
    const prompt = buildSurvivalPacketPrompt(
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
        target_date: "2026-04-09",
        teacher_notes: "Keep numeracy calm after lunch.",
      },
      "SURVIVAL CONTEXT:\n- [support] Amira benefits from oral rehearsal.",
    );

    expect(prompt.system).toContain("Use only student aliases from the provided classroom roster.");
    expect(prompt.system).toContain("Never reuse aliases from another classroom.");
    expect(prompt.user).toContain("ROSTER ALIASES: Amira, Brody");
  });
});

describe("parseSurvivalPacketResponse", () => {
  it("replays the hosted alias leak fixture and filters non-roster aliases from structured fields and narrative text", () => {
    const fixture = JSON.parse(
      readFileSync(
        new URL("../../../evals/fixtures/regressions/survival-packet-alias-leak.json", import.meta.url),
        "utf8",
      ),
    ) as {
      classroom_id: string;
      allowed_aliases: string[];
      known_aliases: string[];
      raw_response: unknown;
    };

    const packet = parseSurvivalPacketResponse(
      JSON.stringify(fixture.raw_response),
      fixture.classroom_id,
      "2026-04-09",
      fixture.allowed_aliases,
      fixture.known_aliases,
    );

    expect(packet.student_support).toHaveLength(1);
    expect(packet.student_support[0]?.student_ref).toBe("Amira");
    expect(packet.family_comms).toHaveLength(1);
    expect(packet.family_comms[0]?.student_ref).toBe("Amira");
    expect(packet.ea_coordination.primary_students).toEqual(["Amira"]);
    expect(packet.heads_up[0]).toContain("another student");
    expect(JSON.stringify(packet)).not.toContain("Ari");
    expect(JSON.stringify(packet)).not.toContain("Mika");
    expect(JSON.stringify(packet)).not.toContain("Jae");
  });
});
