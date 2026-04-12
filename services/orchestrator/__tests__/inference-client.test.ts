import { beforeEach, describe, expect, it, vi } from "vitest";
import { callInference } from "../inference-client.js";
import { getRequestContext } from "../request-context.js";
import { RouteError } from "../errors.js";
import type { RouteConfig } from "../types.js";
import type { Request, Response } from "express";

function mockReq(overrides?: Partial<Request>): Request {
  return {
    body: {},
    headers: {},
    ...overrides,
  } as Request;
}

function mockRes(): Response {
  return {
    locals: {},
    setHeader: vi.fn(),
  } as unknown as Response;
}

const deps = {
  inferenceUrl: "http://localhost:3200",
  dataDir: "",
  loadClassroom: () => undefined,
  loadClassrooms: () => [],
  authMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
};

const liveRoute: RouteConfig = {
  prompt_class: "draft_family_message",
  model_tier: "live",
  thinking_enabled: false,
  retrieval_required: false,
  tool_call_capable: false,
  output_schema_version: "0.1.0",
};

const planningRoute: RouteConfig = {
  prompt_class: "prepare_tomorrow_plan",
  model_tier: "planning",
  thinking_enabled: true,
  retrieval_required: true,
  tool_call_capable: true,
  output_schema_version: "0.1.0",
};

const eaBriefingRoute: RouteConfig = {
  prompt_class: "generate_ea_briefing",
  model_tier: "live",
  thinking_enabled: false,
  retrieval_required: true,
  tool_call_capable: false,
  output_schema_version: "0.1.0",
};

describe("callInference", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("records the live-tier timeout and metadata", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      text: "{\"ok\":true}",
      model_id: "mock",
      latency_ms: 12,
    }), { status: 200 })));

    const req = mockReq();
    const res = mockRes();
    const result = await callInference({
      deps,
      req,
      res,
      route: liveRoute,
      prompt: { system: "sys", user: "user" },
      maxTokens: 128,
    });

    expect(result.model_id).toBe("mock");
    expect(getRequestContext(res).timeout_ms).toBe(30_000);
    expect(getRequestContext(res).retry_count).toBe(0);
  });

  it("records the planning-tier timeout", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      text: "{\"plan\":[]}",
      model_id: "mock-plan",
      latency_ms: 24,
    }), { status: 200 })));

    const res = mockRes();
    await callInference({
      deps,
      req: mockReq(),
      res,
      route: planningRoute,
      prompt: { system: "sys", user: "user" },
      maxTokens: 256,
    });

    expect(getRequestContext(res).timeout_ms).toBe(60_000);
  });

  it("uses longer hosted timeouts for the gemini lane", async () => {
    vi.stubEnv("PRAIRIE_INFERENCE_PROVIDER", "gemini");
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({
      text: "{\"ok\":true}",
      model_id: "gemma-4-26b-a4b-it",
      latency_ms: 42,
    }), { status: 200 }))));

    const liveRes = mockRes();
    await callInference({
      deps,
      req: mockReq(),
      res: liveRes,
      route: liveRoute,
      prompt: { system: "sys", user: "user" },
      maxTokens: 128,
    });

    const planningRes = mockRes();
    await callInference({
      deps,
      req: mockReq(),
      res: planningRes,
      route: planningRoute,
      prompt: { system: "sys", user: "user" },
      maxTokens: 256,
    });

    const eaRes = mockRes();
    await callInference({
      deps,
      req: mockReq(),
      res: eaRes,
      route: eaBriefingRoute,
      prompt: { system: "sys", user: "user" },
      maxTokens: 128,
    });

    expect(getRequestContext(liveRes).timeout_ms).toBe(100_000);
    expect(getRequestContext(planningRes).timeout_ms).toBe(130_000);
    expect(getRequestContext(eaRes).timeout_ms).toBe(130_000);
  });

  it("retries retryable HTTP failures only", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        text: "{\"ok\":true}",
        model_id: "mock",
        latency_ms: 7,
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const res = mockRes();
    await callInference({
      deps,
      req: mockReq(),
      res,
      route: liveRoute,
      prompt: { system: "sys", user: "user" },
      maxTokens: 128,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getRequestContext(res).retry_count).toBe(1);
  });

  it("retries transient upstream network failures wrapped as 502s", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: "{\"error\":\"HTTPSConnectionPool(host='generativelanguage.googleapis.com', port=443): Max retries exceeded with url: /v1beta/models/gemma-4-26b-a4b-it:generateContent (Caused by NameResolutionError('failed to resolve host'))\"}",
      }), { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        text: "{\"ok\":true}",
        model_id: "gemma-4-26b-a4b-it",
        latency_ms: 19,
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const res = mockRes();
    await callInference({
      deps,
      req: mockReq(),
      res,
      route: liveRoute,
      prompt: { system: "sys", user: "user" },
      maxTokens: 128,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getRequestContext(res).retry_count).toBe(1);
  });

  it("does not retry invalid inference JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("not-json", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(callInference({
      deps,
      req: mockReq(),
      res: mockRes(),
      route: liveRoute,
      prompt: { system: "sys", user: "user" },
      maxTokens: 128,
    })).rejects.toMatchObject({
      detailCode: "inference_response_invalid",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
