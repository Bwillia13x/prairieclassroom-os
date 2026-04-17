import path from "node:path";
import { describe, expect, it, beforeEach } from "vitest";
import type { Request, Response } from "express";
import {
  buildRequestLogRecord,
  getRequestLogDir,
  initializeRequestContext,
  setRequestContext,
} from "../request-context.js";

describe("getRequestLogDir", () => {
  it("resolves request logs inside the repo output directory", () => {
    expect(getRequestLogDir()).toBe(
      path.resolve(process.cwd(), "output", "request-logs"),
    );
  });
});

// Build the smallest Request / Response stubs that exercise writeRequestLog's
// code paths. We avoid spinning up a real Express app so the tests stay fast
// and focused on the record shape.
function makeReq(overrides: Record<string, unknown> = {}): Request {
  return {
    method: "GET",
    baseUrl: "",
    path: "/api/today/cls-one",
    headers: {},
    body: {},
    params: { classroomId: "cls-one" },
    route: { path: "/api/today/:classroomId" },
    ...overrides,
  } as unknown as Request;
}

function makeRes(statusCode = 200): Response {
  const headers: Record<string, string> = {};
  const locals: Record<string, unknown> = {};
  return {
    statusCode,
    locals,
    setHeader: (name: string, value: string) => {
      headers[name] = value;
    },
    getHeader: (name: string) => headers[name],
  } as unknown as Response;
}

describe("buildRequestLogRecord — access audit enrichment", () => {
  let req: Request;
  let res: Response;

  beforeEach(() => {
    req = makeReq();
    res = makeRes(200);
    initializeRequestContext(req, res);
  });

  it("records classroom_role, demo_bypass, and auth_outcome=allowed on a normal auth success", () => {
    (res.locals as Record<string, unknown>).classroomAuth = {
      classroomId: "cls-one",
      role: "teacher",
      demoBypass: false,
    };

    const record = buildRequestLogRecord(req, res);
    expect(record.classroom_role).toBe("teacher");
    expect(record.demo_bypass).toBe(false);
    expect(record.auth_outcome).toBe("allowed");
    expect(record.classroom_id).toBe("cls-one");
  });

  it("records auth_outcome=demo_bypass when the demo classroom skips code checks", () => {
    (res.locals as Record<string, unknown>).classroomAuth = {
      classroomId: "demo-okafor-grade34",
      role: "teacher",
      demoBypass: true,
    };

    const record = buildRequestLogRecord(req, res);
    expect(record.demo_bypass).toBe(true);
    expect(record.auth_outcome).toBe("demo_bypass");
  });

  it("records the ea role distinctly from teacher", () => {
    (res.locals as Record<string, unknown>).classroomAuth = {
      classroomId: "cls-one",
      role: "ea",
      demoBypass: false,
    };

    const record = buildRequestLogRecord(req, res);
    expect(record.classroom_role).toBe("ea");
    expect(record.auth_outcome).toBe("allowed");
  });

  it("records auth_outcome=classroom_code_missing when auth.ts rejects a missing code", () => {
    res = makeRes(401);
    initializeRequestContext(req, res);
    setRequestContext(res, {
      category: "auth",
      detail_code: "classroom_code_missing",
    });

    const record = buildRequestLogRecord(req, res);
    expect(record.auth_outcome).toBe("classroom_code_missing");
    expect(record.classroom_role).toBeNull();
    expect(record.demo_bypass).toBeNull();
  });

  it("records auth_outcome=classroom_code_invalid on a wrong code", () => {
    res = makeRes(403);
    initializeRequestContext(req, res);
    setRequestContext(res, {
      category: "auth",
      detail_code: "classroom_code_invalid",
    });

    const record = buildRequestLogRecord(req, res);
    expect(record.auth_outcome).toBe("classroom_code_invalid");
  });

  it("records auth_outcome=classroom_role_forbidden when a valid code has the wrong role", () => {
    res = makeRes(403);
    initializeRequestContext(req, res);
    setRequestContext(res, {
      category: "auth",
      detail_code: "classroom_role_forbidden",
    });
    // The auth middleware DOES set classroomAuth before the role check runs,
    // so a role_forbidden denial still has a classroom context to log.
    (res.locals as Record<string, unknown>).classroomAuth = {
      classroomId: "cls-one",
      role: "ea",
      demoBypass: false,
    };

    const record = buildRequestLogRecord(req, res);
    expect(record.auth_outcome).toBe("classroom_role_forbidden");
    expect(record.classroom_role).toBe("ea");
  });

  it("records auth_outcome=none on routes with no classroom context", () => {
    req = makeReq({ params: {}, body: {} });
    res = makeRes(200);
    initializeRequestContext(req, res);

    const record = buildRequestLogRecord(req, res);
    expect(record.auth_outcome).toBe("none");
    expect(record.classroom_role).toBeNull();
    expect(record.demo_bypass).toBeNull();
  });
});

describe("buildRequestLogRecord — token usage capture", () => {
  it("records prompt/output/total tokens and model_id when supplied", () => {
    const req = makeReq();
    const res = makeRes(200);
    initializeRequestContext(req, res);
    setRequestContext(res, {
      prompt_class: "differentiate_material",
      model_tier: "live",
      model_id: "gemma-4-26b-a4b-it",
      prompt_tokens: 412,
      output_tokens: 180,
      total_tokens: 592,
    });

    const record = buildRequestLogRecord(req, res);
    expect(record.prompt_tokens).toBe(412);
    expect(record.output_tokens).toBe(180);
    expect(record.total_tokens).toBe(592);
    expect(record.model_id).toBe("gemma-4-26b-a4b-it");
    expect(record.prompt_class).toBe("differentiate_material");
    expect(record.model_tier).toBe("live");
  });

  it("defaults token fields to null when the backend cannot report them (mock/local)", () => {
    const req = makeReq();
    const res = makeRes(200);
    initializeRequestContext(req, res);
    setRequestContext(res, {
      prompt_class: "draft_family_message",
      model_tier: "live",
    });

    const record = buildRequestLogRecord(req, res);
    expect(record.prompt_tokens).toBeNull();
    expect(record.output_tokens).toBeNull();
    expect(record.total_tokens).toBeNull();
    expect(record.model_id).toBeNull();
  });
});
