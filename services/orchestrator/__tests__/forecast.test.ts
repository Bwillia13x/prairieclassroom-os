import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildComplexityForecastPrompt, parseComplexityForecastResponse } from "../complexity-forecast.js";

describe("buildComplexityForecastPrompt", () => {
  it("includes an explicit classroom roster allowlist", () => {
    const prompt = buildComplexityForecastPrompt(
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
        forecast_date: "2026-04-10",
        teacher_notes: "Assembly at 10am and limited EA coverage after lunch.",
      },
      "INTERVENTION HISTORY:\n- Brody needed a visual timer during transitions.",
    );

    expect(prompt.system).toContain("Use only student aliases from the provided classroom roster.");
    expect(prompt.system).toContain("Never reuse aliases from another classroom.");
    expect(prompt.user).toContain("ROSTER ALIASES: Amira, Brody");
  });
});

describe("parseComplexityForecastResponse", () => {
  it("replays the hosted alias leak fixture and scrubs non-roster aliases from narrative text", () => {
    const fixture = JSON.parse(
      readFileSync(
        new URL("../../../evals/fixtures/regressions/complexity-forecast-alias-leak.json", import.meta.url),
        "utf8",
      ),
    ) as {
      classroom_id: string;
      forecast_date: string;
      allowed_aliases: string[];
      known_aliases: string[];
      raw_response: unknown;
    };

    const forecast = parseComplexityForecastResponse(
      JSON.stringify(fixture.raw_response),
      fixture.classroom_id,
      fixture.forecast_date,
      fixture.allowed_aliases,
      fixture.known_aliases,
    );

    expect(forecast.overall_summary).toContain("another student");
    expect(forecast.blocks[0]?.contributing_factors.join(" ")).toContain("another student");
    expect(forecast.blocks[0]?.suggested_mitigation).toContain("another student");
    expect(JSON.stringify(forecast)).not.toContain("Ari");
    expect(JSON.stringify(forecast)).not.toContain("Mika");
    expect(JSON.stringify(forecast)).not.toContain("Jae");
  });
});
