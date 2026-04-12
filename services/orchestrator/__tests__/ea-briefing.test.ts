import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseEABriefingResponse } from "../ea-briefing.js";

describe("parseEABriefingResponse", () => {
  it("replays the hosted alias leak fixture and filters non-roster aliases from all EA briefing lists", () => {
    const fixture = JSON.parse(
      readFileSync(
        new URL("../../../evals/fixtures/regressions/ea-briefing-alias-leak.json", import.meta.url),
        "utf8",
      ),
    ) as {
      classroom_id: string;
      allowed_aliases: string[];
      raw_response: unknown;
    };

    const briefing = parseEABriefingResponse(
      JSON.stringify(fixture.raw_response),
      fixture.classroom_id,
      fixture.allowed_aliases,
    );

    expect(briefing.schedule_blocks[0]?.student_refs).toEqual(["Amira"]);
    expect(briefing.student_watch_list).toHaveLength(1);
    expect(briefing.student_watch_list[0]?.student_ref).toBe("Amira");
    expect(briefing.pending_followups).toHaveLength(1);
    expect(briefing.pending_followups[0]?.student_ref).toBe("Amira");
  });
});
