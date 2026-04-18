import { describe, expect, it } from "vitest";
import { ApiError } from "../api";
import { getClassroomLoadErrorMessage } from "../appErrors";

describe("App bootstrap errors", () => {
  it("explains classroom load rate limits instead of calling the API offline", () => {
    expect(getClassroomLoadErrorMessage(new ApiError(429, { error: "rate_limit_exceeded" })))
      .toBe("Too many quick classroom refreshes. Wait a minute, then reload the page.");
  });

  it("keeps the generic classroom load message for network or server failures", () => {
    expect(getClassroomLoadErrorMessage(new TypeError("fetch failed")))
      .toBe("Failed to load classrooms. Is the API server running?");
  });
});
