import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthMiddleware } from "../auth.js";
import type { Request, Response, NextFunction } from "express";
import type { ClassroomProfile } from "../../../packages/shared/schemas/classroom.js";

function mockReq(overrides: {
  body?: Record<string, any>;
  params?: Record<string, any>;
  headers?: Record<string, string>;
}): Partial<Request> {
  return {
    body: overrides.body ?? {},
    params: (overrides.params ?? {}) as any,
    headers: overrides.headers ?? {},
  };
}

function mockRes(): { status: any; json: any; _status: number | null; _json: any } {
  const res: any = {
    _status: null,
    _json: null,
    locals: {},
    status(code: number) { res._status = code; return res; },
    json(data: any) { res._json = data; return res; },
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
  });

  it("returns 401 when code is required but not provided", () => {
    const req = mockReq({ body: { classroom_id: "alpha-grade4" } });
    const res = mockRes();
    middleware(req as Request, res as unknown as Response, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
    expect(res._json.error).toContain("Authentication required");
    expect(res._json.category).toBe("auth");
    expect(res._json.retryable).toBe(false);
    expect(res._json.detail_code).toBe("classroom_code_missing");
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
    expect(res._json.error).toContain("Invalid classroom code");
    expect(res._json.category).toBe("auth");
    expect(res._json.retryable).toBe(false);
    expect(res._json.detail_code).toBe("classroom_code_invalid");
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
    expect(res._json.detail_code).toBe("classroom_code_missing");
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
    expect(res._json.detail_code).toBe("classroom_code_invalid");
  });
});
