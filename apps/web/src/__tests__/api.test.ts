import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ApiError,
  configureApiClient,
  listClassrooms,
  differentiate,
  fetchTodaySnapshot,
  generateSurvivalPacket,
  approveFamilyMessage,
} from "../api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();

function jsonResponse(status: number, body: unknown, ok?: boolean): Response {
  return {
    ok: ok ?? (status >= 200 && status < 300),
    status,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function textResponse(status: number, text: string): Response {
  return {
    ok: false,
    status,
    headers: new Headers({ "content-type": "text/plain" }),
    json: async () => { throw new Error("not json"); },
    text: async () => text,
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

const originalFetch = globalThis.fetch;

beforeEach(() => {
  mockFetch.mockReset();
  globalThis.fetch = mockFetch;
  // Reset the api client config to a clean state between tests
  configureApiClient({
    getClassroomCode: undefined,
    requestClassroomCode: undefined,
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// ===========================================================================
// API client basics
// ===========================================================================

describe("API client basics", () => {
  it("successful GET request returns parsed JSON", async () => {
    const payload = [
      { classroom_id: "c1", grade_band: "3-4", subject_focus: "math", classroom_notes: [], students: [] },
    ];
    mockFetch.mockResolvedValueOnce(jsonResponse(200, payload));

    const result = await listClassrooms();

    expect(result).toEqual(payload);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/classrooms");
    expect(init.method).toBe("GET");
  });

  it("successful POST request sends body and returns parsed JSON", async () => {
    const responsePayload = {
      artifact_id: "a1",
      variants: [],
      model_id: "mock",
      latency_ms: 42,
    };
    mockFetch.mockResolvedValueOnce(jsonResponse(200, responsePayload));

    const request = {
      artifact: {
        artifact_id: "a1",
        title: "Math Lesson",
        subject: "math",
        source_type: "text" as const,
        raw_text: "Add fractions",
      },
      classroom_id: "c1",
    };
    const result = await differentiate(request);

    expect(result).toEqual(responsePayload);
    const [, init] = mockFetch.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(request);
    // Content-Type should be set for POST
    const headers = new Headers(init.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("non-OK response throws ApiError with status and payload fields", async () => {
    const errorPayload = {
      error: "Validation failed",
      category: "client",
      retryable: false,
    };
    mockFetch.mockResolvedValueOnce(jsonResponse(422, errorPayload));

    await expect(listClassrooms()).rejects.toThrow(ApiError);

    try {
      await listClassrooms();
    } catch (err) {
      // First call already consumed the mock; this block uses the assertion above.
    }
    // Re-mock for a clean assertion
    mockFetch.mockResolvedValueOnce(jsonResponse(422, errorPayload));
    try {
      await listClassrooms();
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr).toBeInstanceOf(ApiError);
      expect(apiErr.status).toBe(422);
      expect(apiErr.message).toBe("Validation failed");
      expect(apiErr.category).toBe("client");
      expect(apiErr.retryable).toBe(false);
    }
  });

  it("non-OK response with no error text uses default message", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(500, {}));

    try {
      await listClassrooms();
      expect.unreachable("should have thrown");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(500);
      expect(apiErr.message).toBe("Request failed (500)");
    }
  });

  it("non-JSON error response uses text as error message", async () => {
    mockFetch.mockResolvedValueOnce(textResponse(502, "Bad Gateway"));

    try {
      await listClassrooms();
      expect.unreachable("should have thrown");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(502);
      expect(apiErr.message).toBe("Bad Gateway");
    }
  });
});

// ===========================================================================
// X-Classroom-Code header injection
// ===========================================================================

describe("X-Classroom-Code header", () => {
  it("is included when getClassroomCode returns a code for the classroom", async () => {
    configureApiClient({
      getClassroomCode: (id: string) => (id === "c1" ? "secret-123" : undefined),
    });
    mockFetch.mockResolvedValueOnce(jsonResponse(200, {
      debt_register: { register_id: "r1", classroom_id: "c1", items: [], item_count_by_category: {}, generated_at: "", schema_version: "1" },
      latest_plan: null,
      latest_forecast: null,
      student_count: 0,
      last_activity_at: null,
    }));

    await fetchTodaySnapshot("c1");

    const [, init] = mockFetch.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get("X-Classroom-Code")).toBe("secret-123");
  });

  it("is NOT included when getClassroomCode returns undefined", async () => {
    configureApiClient({
      getClassroomCode: () => undefined,
    });
    mockFetch.mockResolvedValueOnce(jsonResponse(200, {
      debt_register: { register_id: "r1", classroom_id: "c1", items: [], item_count_by_category: {}, generated_at: "", schema_version: "1" },
      latest_plan: null,
      latest_forecast: null,
      student_count: 0,
      last_activity_at: null,
    }));

    await fetchTodaySnapshot("c1");

    const [, init] = mockFetch.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get("X-Classroom-Code")).toBeNull();
  });

  it("is NOT included when no getClassroomCode is configured", async () => {
    const payload = [{ classroom_id: "c1", grade_band: "3-4", subject_focus: "math", classroom_notes: [], students: [] }];
    mockFetch.mockResolvedValueOnce(jsonResponse(200, payload));

    await listClassrooms();

    const [, init] = mockFetch.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get("X-Classroom-Code")).toBeNull();
  });

  it("uses explicit classroomCode over getClassroomCode", async () => {
    configureApiClient({
      getClassroomCode: () => "from-config",
    });
    mockFetch.mockResolvedValueOnce(jsonResponse(200, {
      packet: { packet_id: "p1", classroom_id: "c1", generated_for_date: "2026-04-10", routines: [], student_support: [], ea_coordination: { schedule_summary: "", primary_students: [], if_ea_absent: "" }, simplified_day_plan: [], family_comms: [], complexity_peaks: [], heads_up: [], schema_version: "1" },
      model_id: "mock",
      latency_ms: 10,
    }));

    // generateSurvivalPacket passes classroomCode directly
    await generateSurvivalPacket("c1", "2026-04-10", undefined, "explicit-code");

    const [, init] = mockFetch.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get("X-Classroom-Code")).toBe("explicit-code");
  });

  it("resolves classroomId from request body when not explicit", async () => {
    configureApiClient({
      getClassroomCode: (id: string) => (id === "c1" ? "body-resolved" : undefined),
    });
    mockFetch.mockResolvedValueOnce(jsonResponse(200, {
      artifact_id: "a1",
      variants: [],
      model_id: "mock",
      latency_ms: 10,
    }));

    await differentiate({
      artifact: { artifact_id: "a1", title: "T", subject: "math", source_type: "text" },
      classroom_id: "c1",
    });

    const [, init] = mockFetch.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get("X-Classroom-Code")).toBe("body-resolved");
  });
});

// ===========================================================================
// Auth challenge flow (401 / 403)
// ===========================================================================

describe("auth challenge flow", () => {
  it("401 with classroom_code_missing triggers requestClassroomCode and retries", async () => {
    const requestClassroomCode = vi.fn().mockResolvedValue("new-code");

    configureApiClient({
      getClassroomCode: () => undefined,
      requestClassroomCode,
    });

    const errorPayload = {
      error: "Authentication required",
      category: "auth",
      retryable: false,
      detail_code: "classroom_code_missing",
    };
    const successPayload = {
      debt_register: { register_id: "r1", classroom_id: "c1", items: [], item_count_by_category: {}, generated_at: "", schema_version: "1" },
      latest_plan: null,
      latest_forecast: null,
      student_count: 5,
      last_activity_at: null,
    };

    // First call: 401, second call (retry): 200
    mockFetch
      .mockResolvedValueOnce(jsonResponse(401, errorPayload))
      .mockResolvedValueOnce(jsonResponse(200, successPayload));

    const result = await fetchTodaySnapshot("c1");

    expect(requestClassroomCode).toHaveBeenCalledOnce();
    expect(requestClassroomCode).toHaveBeenCalledWith({
      classroomId: "c1",
      status: 401,
      message: "Authentication required",
    });
    expect(result.student_count).toBe(5);
    // Retry should include the new code
    const [, retryInit] = mockFetch.mock.calls[1];
    const retryHeaders = new Headers(retryInit.headers);
    expect(retryHeaders.get("X-Classroom-Code")).toBe("new-code");
  });

  it("403 with classroom_code_invalid triggers requestClassroomCode and retries", async () => {
    const requestClassroomCode = vi.fn().mockResolvedValue("correct-code");

    configureApiClient({
      getClassroomCode: () => "wrong-code",
      requestClassroomCode,
    });

    const errorPayload = {
      error: "Invalid classroom code",
      category: "auth",
      retryable: false,
      detail_code: "classroom_code_invalid",
    };
    const successPayload = {
      debt_register: { register_id: "r1", classroom_id: "c1", items: [], item_count_by_category: {}, generated_at: "", schema_version: "1" },
      latest_plan: null,
      latest_forecast: null,
      student_count: 3,
      last_activity_at: null,
    };

    mockFetch
      .mockResolvedValueOnce(jsonResponse(403, errorPayload))
      .mockResolvedValueOnce(jsonResponse(200, successPayload));

    const result = await fetchTodaySnapshot("c1");

    expect(requestClassroomCode).toHaveBeenCalledOnce();
    expect(result.student_count).toBe(3);
  });

  it("throws handled ApiError when user cancels the auth prompt (returns null)", async () => {
    const requestClassroomCode = vi.fn().mockResolvedValue(null);

    configureApiClient({
      getClassroomCode: () => undefined,
      requestClassroomCode,
    });

    mockFetch.mockResolvedValueOnce(jsonResponse(401, {
      error: "Authentication required",
      category: "auth",
      detail_code: "classroom_code_missing",
    }));

    try {
      await fetchTodaySnapshot("c1");
      expect.unreachable("should have thrown");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr).toBeInstanceOf(ApiError);
      expect(apiErr.status).toBe(401);
      expect(apiErr.handled).toBe(true);
    }
  });

  it("throws unhandled ApiError when no requestClassroomCode is configured", async () => {
    configureApiClient({ getClassroomCode: () => undefined });

    mockFetch.mockResolvedValueOnce(jsonResponse(401, {
      error: "Authentication required",
      category: "auth",
      detail_code: "classroom_code_missing",
    }));

    try {
      await fetchTodaySnapshot("c1");
      expect.unreachable("should have thrown");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr).toBeInstanceOf(ApiError);
      expect(apiErr.status).toBe(401);
      expect(apiErr.handled).toBe(false);
    }
  });

  it("does not trigger auth challenge when classroomId is not resolvable", async () => {
    const requestClassroomCode = vi.fn();

    configureApiClient({ requestClassroomCode });

    // listClassrooms has no classroomId in path or body
    mockFetch.mockResolvedValueOnce(jsonResponse(401, {
      error: "Auth required",
      category: "auth",
      detail_code: "classroom_code_missing",
    }));

    try {
      await listClassrooms();
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(requestClassroomCode).not.toHaveBeenCalled();
      expect((err as ApiError).status).toBe(401);
      expect((err as ApiError).handled).toBe(false);
    }
  });

  it("does not trigger auth challenge for 401 without auth detail_code", async () => {
    const requestClassroomCode = vi.fn();

    configureApiClient({
      getClassroomCode: () => undefined,
      requestClassroomCode,
    });

    mockFetch.mockResolvedValueOnce(jsonResponse(401, {
      error: "Unauthorized",
      category: "auth",
      // No detail_code matching classroom_code_missing/invalid
    }));

    try {
      await fetchTodaySnapshot("c1");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(requestClassroomCode).not.toHaveBeenCalled();
      expect((err as ApiError).status).toBe(401);
    }
  });
});

// ===========================================================================
// Error classification (from server payloads)
// ===========================================================================

describe("ApiError properties from server payloads", () => {
  it("preserves category from server response", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(400, {
      error: "Bad request",
      category: "client",
      retryable: true,
    }));

    try {
      await listClassrooms();
      expect.unreachable("should have thrown");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.category).toBe("client");
      expect(apiErr.retryable).toBe(true);
    }
  });

  it("preserves server category on 5xx", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(503, {
      error: "Service unavailable",
      category: "server",
      retryable: true,
    }));

    try {
      await listClassrooms();
      expect.unreachable("should have thrown");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.category).toBe("server");
      expect(apiErr.retryable).toBe(true);
    }
  });

  it("preserves auth category on 401", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(401, {
      error: "Auth required",
      category: "auth",
      retryable: false,
      detail_code: "classroom_code_missing",
    }));

    try {
      await listClassrooms();
      expect.unreachable("should have thrown");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.category).toBe("auth");
      expect(apiErr.detailCode).toBe("classroom_code_missing");
    }
  });

  it("preserves auth category on 403", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(403, {
      error: "Invalid code",
      category: "auth",
      retryable: false,
      detail_code: "classroom_code_invalid",
    }));

    try {
      await listClassrooms();
      expect.unreachable("should have thrown");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.category).toBe("auth");
      expect(apiErr.detailCode).toBe("classroom_code_invalid");
    }
  });

  it("has undefined category when server omits it", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(418, { error: "I'm a teapot" }));

    try {
      await listClassrooms();
      expect.unreachable("should have thrown");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(418);
      expect(apiErr.category).toBeUndefined();
    }
  });
});

// ===========================================================================
// Network errors
// ===========================================================================

describe("network errors", () => {
  it("fetch rejection propagates as a native error (not ApiError)", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    try {
      await listClassrooms();
      expect.unreachable("should have thrown");
    } catch (err) {
      // Network failures are raw TypeError from fetch, not wrapped in ApiError
      expect(err).toBeInstanceOf(TypeError);
      expect((err as TypeError).message).toBe("Failed to fetch");
    }
  });

  it("abort signal rejection propagates as-is", async () => {
    const abortError = new DOMException("The operation was aborted.", "AbortError");
    mockFetch.mockRejectedValueOnce(abortError);

    try {
      await differentiate({
        artifact: { artifact_id: "a1", title: "T", subject: "math", source_type: "text" },
        classroom_id: "c1",
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect((err as DOMException).name).toBe("AbortError");
    }
  });
});

// ===========================================================================
// ApiError class
// ===========================================================================

describe("ApiError class", () => {
  it("extends Error and has correct name", () => {
    const err = new ApiError(404, { error: "Not found" });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ApiError");
  });

  it("uses payload.error as message", () => {
    const err = new ApiError(400, { error: "Bad request" });
    expect(err.message).toBe("Bad request");
  });

  it("uses fallback message when payload.error is missing", () => {
    const err = new ApiError(500, {});
    expect(err.message).toBe("Request failed (500)");
  });

  it("stores all payload fields", () => {
    const err = new ApiError(403, {
      error: "Forbidden",
      category: "auth",
      retryable: false,
      detail_code: "classroom_code_invalid",
    });
    expect(err.status).toBe(403);
    expect(err.category).toBe("auth");
    expect(err.retryable).toBe(false);
    expect(err.detailCode).toBe("classroom_code_invalid");
  });

  it("defaults handled to false", () => {
    const err = new ApiError(500, { error: "fail" });
    expect(err.handled).toBe(false);
  });

  it("accepts handled=true for user-cancelled auth", () => {
    const err = new ApiError(401, { error: "auth" }, true);
    expect(err.handled).toBe(true);
  });
});

// ===========================================================================
// POST with classroomId from body (approveFamilyMessage)
// ===========================================================================

describe("classroomId resolution from body", () => {
  it("resolves classroomId from body.classroom_id for auth code lookup", async () => {
    configureApiClient({
      getClassroomCode: (id: string) => (id === "c1" ? "code-from-body" : undefined),
    });
    mockFetch.mockResolvedValueOnce(jsonResponse(200, {}));

    await approveFamilyMessage("c1", "draft-1");

    const [, init] = mockFetch.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get("X-Classroom-Code")).toBe("code-from-body");
  });
});
