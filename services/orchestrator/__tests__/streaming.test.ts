import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import type { Request, Response } from "express";
import { attachStreamJob, createStreamJob } from "../streaming.js";

function mockReq(overrides?: Partial<Request>): Request {
  const req = new EventEmitter() as Request;
  req.body = {};
  req.query = {};
  req.headers = {};
  req.params = {};
  return Object.assign(req, overrides);
}

function mockRes(locals: Record<string, unknown> = {}): Response {
  return { locals } as Response;
}

describe("stream job authorization snapshots", () => {
  it("fails closed when a stream job has no classroom auth snapshot", () => {
    const streamId = createStreamJob(mockReq({ body: { classroom_id: "alpha-grade4" } }), mockRes());

    expect(() => attachStreamJob(mockReq(), mockRes(), streamId)).toThrow(
      expect.objectContaining({
        statusCode: 403,
        detailCode: "stream_job_auth_missing",
      }),
    );
  });

  it("restores the original classroom auth snapshot before route role checks run", () => {
    const classroomAuth = {
      classroomId: "alpha-grade4",
      role: "ea",
      demoBypass: false,
    };
    const streamId = createStreamJob(
      mockReq({
        body: { classroom_id: "alpha-grade4", ea_name: "Ms. Lee" },
        query: { fast: "true" },
        headers: { "x-classroom-role": "ea" },
      }),
      mockRes({ classroomAuth }),
    );

    const req = mockReq();
    const res = mockRes();
    const signal = attachStreamJob(req, res, streamId);

    expect(signal).toBeInstanceOf(AbortSignal);
    expect(req.body).toEqual({ classroom_id: "alpha-grade4", ea_name: "Ms. Lee" });
    expect(req.query).toEqual({ fast: "true" });
    expect(res.locals.classroomAuth).toEqual(classroomAuth);
  });
});
