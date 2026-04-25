import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { callInference, callInferenceStream } from "../inference-client.js";
import { getRequestContext } from "../request-context.js";
import {
  getTodaySpendUsd,
  getTodayCallCount,
  resetCostBudgetStateForTests,
} from "../cost-budget.js";
import type { RouteConfig } from "../types.js";
import type { Request, Response } from "express";

function mockReq(overrides?: Partial<Request>): Request {
  return {
    body: {},
    headers: {},
    query: {},
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

const differentiateRoute: RouteConfig = {
  prompt_class: "differentiate_material",
  model_tier: "live",
  thinking_enabled: false,
  retrieval_required: false,
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

const supportPatternsRoute: RouteConfig = {
  prompt_class: "detect_support_patterns",
  model_tier: "planning",
  thinking_enabled: true,
  retrieval_required: true,
  tool_call_capable: true,
  output_schema_version: "0.1.0",
};

const forecastRoute: RouteConfig = {
  prompt_class: "forecast_complexity",
  model_tier: "planning",
  thinking_enabled: true,
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

  it("extends support-patterns beyond the generic planning timeout even without provider env", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      text: "{\"report\":{}}",
      model_id: "mock-plan",
      latency_ms: 30,
    }), { status: 200 })));

    const res = mockRes();
    await callInference({
      deps,
      req: mockReq(),
      res,
      route: supportPatternsRoute,
      prompt: { system: "sys", user: "user" },
      maxTokens: 256,
    });

    expect(getRequestContext(res).timeout_ms).toBe(180_000);
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

    const patternsRes = mockRes();
    await callInference({
      deps,
      req: mockReq(),
      res: patternsRes,
      route: supportPatternsRoute,
      prompt: { system: "sys", user: "user" },
      maxTokens: 256,
    });

    expect(getRequestContext(liveRes).timeout_ms).toBe(100_000);
    expect(getRequestContext(planningRes).timeout_ms).toBe(130_000);
    expect(getRequestContext(eaRes).timeout_ms).toBe(130_000);
    expect(getRequestContext(patternsRes).timeout_ms).toBe(180_000);
  });

  it("extends hosted complexity forecasts past the Gemini planning client deadline", async () => {
    vi.stubEnv("PRAIRIE_INFERENCE_PROVIDER", "gemini");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      text: "{\"forecast\":{}}",
      model_id: "gemma-4-31b-it",
      latency_ms: 42,
    }), { status: 200 })));

    const res = mockRes();
    await callInference({
      deps,
      req: mockReq(),
      res,
      route: forecastRoute,
      prompt: { system: "sys", user: "user" },
      maxTokens: 256,
    });

    expect(getRequestContext(res).timeout_ms).toBe(180_000);
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

  it("retries transient hosted provider internal errors wrapped as 502s", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: "{\"error\":\"500 INTERNAL. {'error': {'code': 500, 'message': 'Internal error encountered.', 'status': 'INTERNAL'}}\"}",
      }), { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        text: "{\"ok\":true}",
        model_id: "gemma-4-31b-it",
        latency_ms: 23,
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const res = mockRes();
    await callInference({
      deps,
      req: mockReq(),
      res,
      route: planningRoute,
      prompt: { system: "sys", user: "user" },
      maxTokens: 256,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getRequestContext(res).retry_count).toBe(1);
  });

  it("forwards thinking=true on planning routes by default", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      text: "{\"plan\":[]}",
      model_id: "mock",
      latency_ms: 9,
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await callInference({
      deps,
      req: mockReq(),
      res: mockRes(),
      route: planningRoute,
      prompt: { system: "sys", user: "user" },
      maxTokens: 256,
    });

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(sent.thinking).toBe(true);
  });

  it("overrides thinking to false when ?fast=true is on the query", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      text: "{\"plan\":[]}",
      model_id: "mock",
      latency_ms: 9,
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await callInference({
      deps,
      req: mockReq({ query: { fast: "true" } as never }),
      res: mockRes(),
      route: planningRoute, // route default has thinking_enabled=true
      prompt: { system: "sys", user: "user" },
      maxTokens: 256,
    });

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(sent.thinking).toBe(false);
  });

  it("ignores ?fast on routes that already disable thinking (no-op)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      text: "{\"ok\":true}",
      model_id: "mock",
      latency_ms: 9,
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await callInference({
      deps,
      req: mockReq({ query: { fast: "true" } as never }),
      res: mockRes(),
      route: liveRoute, // thinking_enabled=false already
      prompt: { system: "sys", user: "user" },
      maxTokens: 128,
    });

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(sent.thinking).toBe(false);
  });

  it("treats ?fast=1 and ?fast=yes as truthy aliases", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({
      text: "{\"plan\":[]}",
      model_id: "mock",
      latency_ms: 9,
    }), { status: 200 })));
    vi.stubGlobal("fetch", fetchMock);

    for (const value of ["1", "yes", "on", "TRUE"]) {
      fetchMock.mockClear();
      await callInference({
        deps,
        req: mockReq({ query: { fast: value } as never }),
        res: mockRes(),
        route: planningRoute,
        prompt: { system: "sys", user: "user" },
        maxTokens: 256,
      });
      const sent = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(sent.thinking, `fast=${value} should disable thinking`).toBe(false);
    }
  });

  it("ignores ?fast=anything-else and keeps the route default", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      text: "{\"plan\":[]}",
      model_id: "mock",
      latency_ms: 9,
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await callInference({
      deps,
      req: mockReq({ query: { fast: "maybe" } as never }),
      res: mockRes(),
      route: planningRoute,
      prompt: { system: "sys", user: "user" },
      maxTokens: 256,
    });

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(sent.thinking).toBe(true);
  });

  it("sends route-scoped tool definitions on tool-capable routes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      text: "{\"ok\":true}",
      model_id: "mock",
      latency_ms: 9,
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await callInference({
      deps,
      req: mockReq({ body: { classroom_id: "demo-okafor-grade34" } }),
      res: mockRes(),
      route: differentiateRoute,
      prompt: { system: "sys", user: "user" },
      maxTokens: 128,
    });

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(sent.tools).toEqual([
      expect.objectContaining({ name: "lookup_curriculum_outcome" }),
    ]);
  });

  it("executes model tool calls and asks for a final follow-up generation", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        text: "{\"tool_calls\":[]}",
        model_id: "mock",
        latency_ms: 5,
        prompt_tokens: 10,
        output_tokens: 3,
        tool_calls: [
          {
            id: "call_curriculum_1",
            name: "lookup_curriculum_outcome",
            arguments: { grade: "3", subject: "math", keyword: "multiplication" },
          },
        ],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        text: "{\"ok\":true}",
        model_id: "mock",
        latency_ms: 7,
        prompt_tokens: 20,
        output_tokens: 8,
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const res = mockRes();
    const result = await callInference({
      deps,
      req: mockReq({ body: { classroom_id: "demo-okafor-grade34" } }),
      res,
      route: differentiateRoute,
      prompt: { system: "sys", user: "CLASSROOM CONTEXT:\nGrade 3" },
      maxTokens: 128,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(firstBody.tools[0].name).toBe("lookup_curriculum_outcome");
    expect(secondBody.tools).toBeUndefined();
    expect(secondBody.tool_interactions).toBeUndefined();
    expect(secondBody.prompt).toContain("TOOL RESULTS:");
    expect(secondBody.prompt).toContain("lookup_curriculum_outcome");
    expect(secondBody.prompt).toContain("ab-math-3");
    expect(result.text).toBe("{\"ok\":true}");
    expect(result.tool_calls[0]).toMatchObject({
      tool_call_id: "call_curriculum_1",
      tool_name: "lookup_curriculum_outcome",
      executed: true,
    });
    expect(result.prompt_tokens).toBe(30);
    expect(result.output_tokens).toBe(11);
    expect(result.total_tokens).toBe(41);
    expect(getRequestContext(res).latency_ms).toBe(12);
    expect(getRequestContext(res).debug_prompt_body).toContain("TOOL RESULTS:");
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

describe("callInferenceStream", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function streamResponse(events: string): globalThis.Response {
    return new Response(events, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  it("consumes inference SSE events and returns the final response metadata", async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamResponse([
      "event: ready",
      "data: {\"mode\":\"mock\"}",
      "",
      "event: thinking",
      "data: {\"text\":\"Reviewing memory\"}",
      "",
      "event: chunk",
      "data: {\"text\":\"{\\\"ok\\\":\"}",
      "",
      "event: chunk",
      "data: {\"text\":\"true}\"}",
      "",
      "event: complete",
      "data: {\"text\":\"{\\\"ok\\\":true}\",\"model_id\":\"mock-stream\",\"latency_ms\":31,\"prompt_tokens\":4,\"output_tokens\":6,\"total_tokens\":10}",
      "",
    ].join("\n")));
    vi.stubGlobal("fetch", fetchMock);

    const emit = vi.fn();
    const res = mockRes();
    const result = await callInferenceStream({
      deps,
      req: mockReq(),
      res,
      route: liveRoute,
      prompt: { system: "sys", user: "user" },
      maxTokens: 128,
    }, emit);

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3200/generate/stream", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ "Accept": "text/event-stream" }),
    }));
    expect(emit).toHaveBeenCalledWith({ type: "thinking", text: "Reviewing memory" });
    expect(emit).toHaveBeenCalledWith({ type: "chunk", text: "{\"ok\":" });
    expect(result).toMatchObject({
      text: "{\"ok\":true}",
      model_id: "mock-stream",
      latency_ms: 31,
      prompt_tokens: 4,
      output_tokens: 6,
      total_tokens: 10,
    });
    expect(getRequestContext(res).model_id).toBe("mock-stream");
  });

  it("runs a streaming tool turn and then streams the final follow-up generation", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(streamResponse([
        "event: complete",
        "data: {\"text\":\"{\\\"tool_calls\\\":[]}\",\"model_id\":\"mock\",\"latency_ms\":5,\"tool_calls\":[{\"id\":\"call_curriculum_1\",\"name\":\"lookup_curriculum_outcome\",\"arguments\":{\"grade\":\"3\",\"subject\":\"math\",\"keyword\":\"multiplication\"}}]}",
        "",
      ].join("\n")))
      .mockResolvedValueOnce(streamResponse([
        "event: chunk",
        "data: {\"text\":\"{\\\"ok\\\":true}\"}",
        "",
        "event: complete",
        "data: {\"text\":\"{\\\"ok\\\":true}\",\"model_id\":\"mock\",\"latency_ms\":7}",
        "",
      ].join("\n")));
    vi.stubGlobal("fetch", fetchMock);

    const emit = vi.fn();
    const result = await callInferenceStream({
      deps,
      req: mockReq({ body: { classroom_id: "demo-okafor-grade34" } }),
      res: mockRes(),
      route: differentiateRoute,
      prompt: { system: "sys", user: "CLASSROOM CONTEXT:\nGrade 3" },
      maxTokens: 128,
    }, emit);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(firstBody.tools[0].name).toBe("lookup_curriculum_outcome");
    expect(secondBody.tools).toBeUndefined();
    expect(secondBody.prompt).toContain("TOOL RESULTS:");
    expect(emit).toHaveBeenCalledWith({
      type: "thinking",
      text: "\nCross-checking classroom memory…",
    });
    expect(result.text).toBe("{\"ok\":true}");
    expect(result.tool_calls[0]).toMatchObject({
      tool_call_id: "call_curriculum_1",
      tool_name: "lookup_curriculum_outcome",
      executed: true,
    });
  });
});

describe("callInference — cost budget gate", () => {
  let stateDir: string;

  beforeEach(() => {
    stateDir = mkdtempSync(join(tmpdir(), "prairie-inference-cost-"));
    vi.stubEnv("PRAIRIE_COST_STATE_DIR", stateDir);
    vi.stubEnv("PRAIRIE_DAILY_BUDGET_USD", "0.0001"); // tiny cap
    resetCostBudgetStateForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    resetCostBudgetStateForTests();
    if (existsSync(stateDir)) {
      rmSync(stateDir, { recursive: true, force: true });
    }
  });

  it("accumulates priced spend after each successful Gemini call", async () => {
    vi.stubEnv("PRAIRIE_DAILY_BUDGET_USD", "100"); // big enough cap so we don't trip
    resetCostBudgetStateForTests();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      text: "{\"ok\":true}",
      model_id: "gemma-4-31b-it",
      latency_ms: 9,
      prompt_tokens: 1000,
      output_tokens: 500,
    }), { status: 200 })));

    expect(getTodaySpendUsd()).toBe(0);
    await callInference({
      deps,
      req: mockReq(),
      res: mockRes(),
      route: planningRoute,
      prompt: { system: "sys", user: "user" },
      maxTokens: 128,
    });
    expect(getTodayCallCount()).toBe(1);
    expect(getTodaySpendUsd()).toBeGreaterThan(0);
  });

  it("does not accumulate spend for self-deploy lanes (Vertex/Ollama report 0)", async () => {
    vi.stubEnv("PRAIRIE_DAILY_BUDGET_USD", "100");
    resetCostBudgetStateForTests();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      text: "{\"ok\":true}",
      model_id: "gemma4:27b",
      latency_ms: 8,
      prompt_tokens: 5000,
      output_tokens: 2500,
    }), { status: 200 })));

    await callInference({
      deps,
      req: mockReq(),
      res: mockRes(),
      route: planningRoute,
      prompt: { system: "sys", user: "user" },
      maxTokens: 128,
    });

    expect(getTodayCallCount()).toBe(1);
    expect(getTodaySpendUsd()).toBe(0);
  });

  it("refuses subsequent calls with 429 once today's spend reaches the cap", async () => {
    // Tiny cap means a single priced call exhausts the budget.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      text: "{\"ok\":true}",
      model_id: "gemma-4-31b-it",
      latency_ms: 9,
      prompt_tokens: 1000,
      output_tokens: 1000,
    }), { status: 200 })));

    // First call: should succeed and tip us past the cap.
    await callInference({
      deps,
      req: mockReq(),
      res: mockRes(),
      route: planningRoute,
      prompt: { system: "sys", user: "user" },
      maxTokens: 128,
    });

    // Second call: pre-flight check refuses with 429 cost_budget.
    await expect(callInference({
      deps,
      req: mockReq(),
      res: mockRes(),
      route: planningRoute,
      prompt: { system: "sys", user: "user" },
      maxTokens: 128,
    })).rejects.toMatchObject({
      statusCode: 429,
      category: "cost_budget",
      detailCode: "daily_budget_exceeded",
    });
  });

  it("disables enforcement when PRAIRIE_DAILY_BUDGET_USD=0", async () => {
    vi.stubEnv("PRAIRIE_DAILY_BUDGET_USD", "0");
    resetCostBudgetStateForTests();

    // mockImplementation (not mockResolvedValue) is required so each call
    // gets a fresh Response — Response.text() consumes the body, so the
    // same instance can't serve two awaits.
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({
      text: "{\"ok\":true}",
      model_id: "gemma-4-31b-it",
      latency_ms: 9,
      prompt_tokens: 1_000_000,
      output_tokens: 500_000,
    }), { status: 200 }))));

    // Even a comically expensive simulated call goes through.
    await callInference({
      deps,
      req: mockReq(),
      res: mockRes(),
      route: planningRoute,
      prompt: { system: "sys", user: "user" },
      maxTokens: 128,
    });
    await expect(callInference({
      deps,
      req: mockReq(),
      res: mockRes(),
      route: planningRoute,
      prompt: { system: "sys", user: "user" },
      maxTokens: 128,
    })).resolves.toBeDefined();
  });
});
