import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthMiddleware, requireClassroomRole } from "../auth.js";
import type { Request, Response, NextFunction } from "express";
import type { ClassroomProfile } from "../../../packages/shared/schemas/classroom.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function mockReq(overrides: {
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  headers?: Record<string, string>;
}): Partial<Request> {
  return {
    body: overrides.body ?? {},
    params: overrides.params ?? {},
    headers: overrides.headers ?? {},
  };
}

type MockResponse = {
  _status: number | null;
  _json: Record<string, unknown> | null;
  locals: Record<string, unknown>;
  status: (code: number) => MockResponse;
  json: (data: Record<string, unknown>) => MockResponse;
};

function mockRes(): MockResponse {
  const res: MockResponse = {
    _status: null,
    _json: null,
    locals: {},
    status(code: number) {
      res._status = code;
      return res;
    },
    json(data: Record<string, unknown>) {
      res._json = data;
      return res;
    },
  };
  return res;
}

const CLASSROOMS: Record<string, ClassroomProfile> = {
  "alpha-grade4": {
    classroom_id: "alpha-grade4",
    grade_band: "3-4",
    subject_focus: "general",
    classroom_notes: [],
    routines: {},
    students: [],
    access_code: "prairie-alpha-2026",
  },
  "open-room": {
    classroom_id: "open-room",
    grade_band: "K-1",
    subject_focus: "general",
    classroom_notes: [],
    routines: {},
    students: [],
  },
};

function loadClassroom(id: string): ClassroomProfile | undefined {
  return CLASSROOMS[id];
}

describe("createAuthMiddleware", () => {
  let middleware: ReturnType<typeof createAuthMiddleware>;
  let next: NextFunction;

  beforeEach(() => {
    middleware = createAuthMiddleware(loadClassroom);
    next = vi.fn();
  });

  it("calls next() when no classroom_id is present", () => {
    const req = mockReq({ body: {} });
    const res = mockRes();
    middleware(req as Request, res as unknown as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it("bypasses auth for demo classroom", () => {
    const req = mockReq({ body: { classroom_id: "demo-okafor-grade34" } });
    const res = mockRes();
    middleware(req as Request, res as unknown as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it("bypasses auth for any classroom that sets is_demo: true (not just the legacy ID)", () => {
    // Second demo classroom, not using the legacy ID. Should still bypass
    // via the first-class is_demo field on the profile.
    const classrooms: Record<string, ClassroomProfile> = {
      "pilot-demo-grade1": {
        classroom_id: "pilot-demo-grade1",
        is_demo: true,
        grade_band: "1",
        subject_focus: "general",
        classroom_notes: [],
        routines: {},
        students: [],
        access_code: "would-normally-require-this",
      },
    };
    const loadWithDemoFlag = (id: string) => classrooms[id];
    const mw = createAuthMiddleware(loadWithDemoFlag);

    const req = mockReq({ body: { classroom_id: "pilot-demo-grade1" } });
    const res = mockRes();
    mw(req as Request, res as unknown as Response, next);
    expect(next).toHaveBeenCalled();
    expect(res.locals.classroomAuth).toMatchObject({
      classroomId: "pilot-demo-grade1",
      demoBypass: true,
    });
  });

  it("calls next() when classroom is not found (let route 404)", () => {
    const req = mockReq({ body: { classroom_id: "nonexistent" } });
    const res = mockRes();
    middleware(req as Request, res as unknown as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it("calls next() when classroom has no access_code", () => {
    const req = mockReq({ body: { classroom_id: "open-room" } });
    const res = mockRes();
    middleware(req as Request, res as unknown as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it("calls next() when correct code is provided", () => {
    const req = mockReq({
      body: { classroom_id: "alpha-grade4" },
      headers: { "x-classroom-code": "prairie-alpha-2026" },
    });
    const res = mockRes();
    middleware(req as Request, res as unknown as Response, next);
    expect(next).toHaveBeenCalled();
    expect(res.locals.classroomAuth).toMatchObject({
      classroomId: "alpha-grade4",
      role: "teacher",
      demoBypass: false,
    });
  });

  it("stores a supported classroom role from X-Classroom-Role", () => {
    const req = mockReq({
      body: { classroom_id: "alpha-grade4" },
      headers: {
        "x-classroom-code": "prairie-alpha-2026",
        "x-classroom-role": "ea",
      },
    });
    const res = mockRes();
    middleware(req as Request, res as unknown as Response, next);
    expect(next).toHaveBeenCalled();
    expect(res.locals.classroomAuth).toMatchObject({
      classroomId: "alpha-grade4",
      role: "ea",
    });
  });

  it("returns 400 when X-Classroom-Role is unsupported", () => {
    const req = mockReq({
      body: { classroom_id: "alpha-grade4" },
      headers: {
        "x-classroom-code": "prairie-alpha-2026",
        "x-classroom-role": "student",
      },
    });
    const res = mockRes();
    middleware(req as Request, res as unknown as Response, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(400);
    expect(res._json?.detail_code).toBe("classroom_role_invalid");
  });

  it("returns 401 when code is required but not provided", () => {
    const req = mockReq({ body: { classroom_id: "alpha-grade4" } });
    const res = mockRes();
    middleware(req as Request, res as unknown as Response, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
    expect(res._json?.error).toContain("Authentication required");
    expect(res._json?.category).toBe("auth");
    expect(res._json?.retryable).toBe(false);
    expect(res._json?.detail_code).toBe("classroom_code_missing");
  });

  it("returns 403 when wrong code is provided", () => {
    const req = mockReq({
      body: { classroom_id: "alpha-grade4" },
      headers: { "x-classroom-code": "wrong-code" },
    });
    const res = mockRes();
    middleware(req as Request, res as unknown as Response, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(403);
    expect(res._json?.error).toContain("Invalid classroom code");
    expect(res._json?.category).toBe("auth");
    expect(res._json?.retryable).toBe(false);
    expect(res._json?.detail_code).toBe("classroom_code_invalid");
  });

  it("reads classroom_id from params when not in body", () => {
    const req = mockReq({
      body: {},
      params: { classroomId: "alpha-grade4" },
      headers: { "x-classroom-code": "prairie-alpha-2026" },
    });
    const res = mockRes();
    middleware(req as Request, res as unknown as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it("returns 401 when classroom_id is in params and code is missing", () => {
    const req = mockReq({
      body: {},
      params: { classroomId: "alpha-grade4" },
    });
    const res = mockRes();
    middleware(req as Request, res as unknown as Response, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
  });

  it("returns 403 when classroom_id is in params and code is wrong", () => {
    const req = mockReq({
      body: {},
      params: { classroomId: "alpha-grade4" },
      headers: { "x-classroom-code": "wrong-code" },
    });
    const res = mockRes();
    middleware(req as Request, res as unknown as Response, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(403);
  });

  it("reads classroom_id from params.id when classroomId is not present", () => {
    const req = mockReq({
      body: {},
      params: { id: "alpha-grade4" },
      headers: { "x-classroom-code": "prairie-alpha-2026" },
    });
    const res = mockRes();
    middleware(req as Request, res as unknown as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it("returns 401 when params.id route is protected and code is missing", () => {
    const req = mockReq({
      body: {},
      params: { id: "alpha-grade4" },
    });
    const res = mockRes();
    middleware(req as Request, res as unknown as Response, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
    expect(res._json?.detail_code).toBe("classroom_code_missing");
  });

  it("returns 403 when params.id route is protected and code is wrong", () => {
    const req = mockReq({
      body: {},
      params: { id: "alpha-grade4" },
      headers: { "x-classroom-code": "wrong-code" },
    });
    const res = mockRes();
    middleware(req as Request, res as unknown as Response, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(403);
    expect(res._json?.detail_code).toBe("classroom_code_invalid");
  });
});

describe("requireClassroomRole", () => {
  it("allows a permitted classroom role", () => {
    const middleware = requireClassroomRole(["teacher", "ea"]);
    const req = mockReq({ body: {} });
    const res = mockRes();
    const next = vi.fn();
    res.locals.classroomAuth = { classroomId: "alpha-grade4", role: "ea", demoBypass: false };

    middleware(req as Request, res as unknown as Response, next);

    expect(next).toHaveBeenCalled();
  });

  it("blocks a classroom role outside the allowed scope", () => {
    const middleware = requireClassroomRole(["teacher"]);
    const req = mockReq({ body: {} });
    const res = mockRes();
    const next = vi.fn();
    res.locals.classroomAuth = { classroomId: "alpha-grade4", role: "ea", demoBypass: false };

    middleware(req as Request, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(403);
    expect(res._json?.detail_code).toBe("classroom_role_forbidden");
    expect(res._json?.details).toEqual({
      role: "ea",
      allowed_roles: ["teacher"],
    });
  });
});

// ─── Scope matrix ────────────────────────────────────────────────────────────
// This matrix is the single source of truth for which classroom roles may
// reach each Express endpoint. It mirrors the generated table in
// docs/api-surface.md; if you add, remove, or rename an endpoint, update this
// matrix before shipping. Tests below iterate the matrix and assert that the
// same role list is enforced by the route file.
//
// Keys: `${METHOD} ${ROUTE_PATH}` matching the generated docs/api-surface.md
// Values: lowercase role names allowed; `"*"` means open (no scope).

type Role = "teacher" | "ea" | "substitute" | "reviewer";

const ALL_ROLES: readonly Role[] = ["teacher", "ea", "substitute", "reviewer"];

const SCOPE_MATRIX: Record<string, readonly Role[] | "*"> = {
  // Open / metadata
  "GET /health": "*",
  "GET /api/health": "*",
  "GET /api/classrooms": "*",
  "GET /api/classrooms/:id/schedule": "*",
  "GET /api/curriculum/subjects": "*",
  "GET /api/curriculum/entries": "*",
  "GET /api/curriculum/entries/:entryId": "*",
  // Teacher-only generation & owner surfaces
  "PUT /api/classrooms/:id/schedule": ["teacher"],
  "POST /api/differentiate": ["teacher"],
  "POST /api/tomorrow-plan": ["teacher"],
  "POST /api/tomorrow-plan/stream": ["teacher"],
  "GET /api/tomorrow-plan/stream/:streamId/events": ["teacher"],
  "POST /api/family-message": ["teacher"],
  "POST /api/family-message/approve": ["teacher"],
  "POST /api/simplify": ["teacher"],
  "POST /api/vocab-cards": ["teacher"],
  "POST /api/support-patterns": ["teacher"],
  "POST /api/support-patterns/stream": ["teacher"],
  "GET /api/support-patterns/stream/:streamId/events": ["teacher"],
  "POST /api/complexity-forecast": ["teacher"],
  "POST /api/complexity-forecast/stream": ["teacher"],
  "GET /api/complexity-forecast/stream/:streamId/events": ["teacher"],
  "POST /api/scaffold-decay": ["teacher"],
  "GET /api/scaffold-decay/latest/:classroomId/:studentRef": ["teacher"],
  "POST /api/survival-packet": ["teacher"],
  "POST /api/survival-packet/stream": ["teacher"],
  "GET /api/survival-packet/stream/:streamId/events": ["teacher"],
  "POST /api/extract-worksheet": ["teacher"],
  "GET /api/classrooms/:id/health": ["teacher"],
  "GET /api/classrooms/:id/student-summary": ["teacher"],
  // Teacher + EA
  "POST /api/ea-load": ["teacher", "ea"],
  "POST /api/ea-load/stream": ["teacher", "ea"],
  "GET /api/ea-load/stream/:streamId/events": ["teacher", "ea"],
  "POST /api/feedback": ["teacher", "ea"],
  // Recent-runs cache (Prep panel): teacher writes the run record after
  // generation; teacher + EA both read the chip row preview.
  "POST /api/classrooms/:id/runs": ["teacher"],
  "GET /api/classrooms/:id/runs": ["teacher", "ea"],
  // Teacher + EA + substitute (EA already had UI `canLogInterventions` so
  // aligning backend with that pre-existing capability — see roleCapabilities)
  "POST /api/intervention": ["teacher", "ea", "substitute"],
  // Teacher + reviewer (reviewer can read history surfaces)
  "GET /api/classrooms/:id/plans": ["teacher", "reviewer"],
  "GET /api/classrooms/:id/messages": ["teacher", "reviewer"],
  "GET /api/classrooms/:id/interventions": ["teacher", "reviewer"],
  "GET /api/classrooms/:id/patterns": ["teacher", "reviewer"],
  "GET /api/support-patterns/latest/:classroomId": ["teacher", "reviewer"],
  // Teacher + EA + substitute (operational working views)
  "POST /api/ea-briefing": ["teacher", "ea", "substitute"],
  "GET /api/today/:classroomId": ["teacher", "ea", "substitute"],
  "POST /api/sessions": ["teacher", "ea", "substitute"],
  // Teacher + EA + reviewer (aggregated summaries, feedback evidence)
  "GET /api/feedback/summary/:classroomId": ["teacher", "ea", "reviewer"],
  "GET /api/sessions/summary/:classroomId": ["teacher", "ea", "reviewer"],
  // Teacher + substitute + reviewer (read-only forecast)
  "GET /api/complexity-forecast/latest/:classroomId": ["teacher", "substitute", "reviewer"],
  // Teacher + EA + substitute + reviewer (debt-register coordination surface)
  "GET /api/debt-register/:classroomId": ["teacher", "ea", "substitute", "reviewer"],
};

function endpointKey(method: string, path: string): string {
  return `${method.toUpperCase()} ${path}`;
}

function allowedFor(scope: readonly Role[] | "*"): readonly Role[] {
  return scope === "*" ? ALL_ROLES : scope;
}

function deniedFor(scope: readonly Role[] | "*"): readonly Role[] {
  if (scope === "*") return [];
  return ALL_ROLES.filter((role) => !scope.includes(role));
}

describe("scope matrix (substitute/reviewer + teacher/ea coverage)", () => {
  it("covers every endpoint listed in docs/api-surface.md", async () => {
    const { readFile } = await import("node:fs/promises");
    const repoRoot = path.join(__dirname, "../../..");
    const surface = await readFile(path.join(repoRoot, "docs/api-surface.md"), "utf-8");

    const rowPattern = /^\|\s+(GET|POST|PUT|DELETE|PATCH)\s+\|\s+`([^`]+)`/gm;
    const generatedEndpoints: string[] = [];
    for (const match of surface.matchAll(rowPattern)) {
      generatedEndpoints.push(endpointKey(match[1], match[2]));
    }

    const matrixKeys = new Set(Object.keys(SCOPE_MATRIX));
    const missing = generatedEndpoints.filter((key) => !matrixKeys.has(key));
    expect(missing).toEqual([]);

    const extra = [...matrixKeys].filter((key) => !generatedEndpoints.includes(key));
    expect(extra).toEqual([]);
  });

  for (const [key, scope] of Object.entries(SCOPE_MATRIX)) {
    const allowed = allowedFor(scope);
    const denied = deniedFor(scope);

    for (const role of allowed) {
      it(`allows ${role} on ${key}`, () => {
        if (scope === "*") return; // Open endpoints don't call requireClassroomRole.
        const middleware = requireClassroomRole(scope);
        const req = mockReq({ body: {} });
        const res = mockRes();
        const next = vi.fn();
        res.locals.classroomAuth = {
          classroomId: "alpha-grade4",
          role,
          demoBypass: false,
        };
        middleware(req as Request, res as unknown as Response, next);
        expect(next).toHaveBeenCalled();
        expect(res._status).toBeNull();
      });
    }

    for (const role of denied) {
      it(`denies ${role} on ${key}`, () => {
        const middleware = requireClassroomRole(scope as readonly Role[]);
        const req = mockReq({ body: {} });
        const res = mockRes();
        const next = vi.fn();
        res.locals.classroomAuth = {
          classroomId: "alpha-grade4",
          role,
          demoBypass: false,
        };
        middleware(req as Request, res as unknown as Response, next);
        expect(next).not.toHaveBeenCalled();
        expect(res._status).toBe(403);
        expect(res._json?.detail_code).toBe("classroom_role_forbidden");
      });
    }
  }
});

describe("substitute view coverage (high-level)", () => {
  // Named, grouped assertions so a contributor reading the test output can
  // quickly see what the substitute view does/doesn't cover without manually
  // scanning the matrix.
  const substituteAllowed = Object.entries(SCOPE_MATRIX)
    .filter(([, scope]) => scope !== "*" && (scope as readonly Role[]).includes("substitute"))
    .map(([key]) => key);
  const substituteDenied = Object.entries(SCOPE_MATRIX)
    .filter(([, scope]) => scope !== "*" && !(scope as readonly Role[]).includes("substitute"))
    .map(([key]) => key);

  it("allows substitute on today snapshot, ea-briefing, debt-register, latest forecast, intervention log, sessions", () => {
    const expected = [
      "GET /api/today/:classroomId",
      "POST /api/ea-briefing",
      "GET /api/debt-register/:classroomId",
      "GET /api/complexity-forecast/latest/:classroomId",
      "POST /api/intervention",
      "POST /api/sessions",
    ];
    for (const key of expected) {
      expect(substituteAllowed).toContain(key);
    }
  });

  it("denies substitute on planning generation, approvals, survival-packet generation, history archives", () => {
    const expected = [
      "POST /api/tomorrow-plan",
      "POST /api/family-message",
      "POST /api/family-message/approve",
      "POST /api/support-patterns",
      "POST /api/scaffold-decay",
      "POST /api/survival-packet",
      "POST /api/complexity-forecast",
      "GET /api/classrooms/:id/plans",
      "GET /api/classrooms/:id/messages",
      "GET /api/classrooms/:id/interventions",
      "GET /api/classrooms/:id/patterns",
    ];
    for (const key of expected) {
      expect(substituteDenied).toContain(key);
    }
  });
});

describe("reviewer view coverage (high-level)", () => {
  const reviewerAllowed = Object.entries(SCOPE_MATRIX)
    .filter(([, scope]) => scope !== "*" && (scope as readonly Role[]).includes("reviewer"))
    .map(([key]) => key);
  const reviewerDenied = Object.entries(SCOPE_MATRIX)
    .filter(([, scope]) => scope !== "*" && !(scope as readonly Role[]).includes("reviewer"))
    .map(([key]) => key);

  it("allows reviewer on latest-plan/message/intervention/pattern history, latest forecast, latest pattern, debt-register, summaries", () => {
    const expected = [
      "GET /api/classrooms/:id/plans",
      "GET /api/classrooms/:id/messages",
      "GET /api/classrooms/:id/interventions",
      "GET /api/classrooms/:id/patterns",
      "GET /api/support-patterns/latest/:classroomId",
      "GET /api/complexity-forecast/latest/:classroomId",
      "GET /api/debt-register/:classroomId",
      "GET /api/feedback/summary/:classroomId",
      "GET /api/sessions/summary/:classroomId",
    ];
    for (const key of expected) {
      expect(reviewerAllowed).toContain(key);
    }
  });

  it("denies reviewer on every POST endpoint (no writes or generation)", () => {
    const writeEndpoints = Object.keys(SCOPE_MATRIX).filter(
      (key) => key.startsWith("POST ") || key.startsWith("PUT "),
    );
    for (const key of writeEndpoints) {
      expect(reviewerDenied).toContain(key);
    }
  });

  it("denies reviewer on today snapshot (active operational view, not a review surface)", () => {
    expect(reviewerDenied).toContain("GET /api/today/:classroomId");
  });

  it("denies reviewer on classroom-health and student-summary (teacher owner surfaces)", () => {
    expect(reviewerDenied).toContain("GET /api/classrooms/:id/health");
    expect(reviewerDenied).toContain("GET /api/classrooms/:id/student-summary");
  });
});
