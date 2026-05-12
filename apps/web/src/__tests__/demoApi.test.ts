import { describe, expect, it, vi } from "vitest";
import {
  emitStaticDemoStream,
  resolveStaticDemoRequest,
} from "../demoApi";
import type { ClassroomProfile, TomorrowPlanResponse } from "../types";

describe("static demo API fallback", () => {
  it("serves a public classroom summary without exposing the full roster", () => {
    const result = resolveStaticDemoRequest<ClassroomProfile[]>("/classrooms");

    expect(result.handled).toBe(true);
    if (!result.handled) return;
    expect(result.value).toHaveLength(1);
    expect(result.value[0]).toMatchObject({
      classroom_id: "demo-okafor-grade34",
      is_demo: true,
      requires_access_code: false,
      classroom_notes: [],
      students: [],
    });
  });

  it("serves deterministic generation payloads for the Vercel demo path", () => {
    const result = resolveStaticDemoRequest<TomorrowPlanResponse>("/tomorrow-plan", {
      method: "POST",
      body: {
        classroom_id: "demo-okafor-grade34",
        teacher_reflection: "Brody needed help after lunch.",
      },
    });

    expect(result.handled).toBe(true);
    if (!result.handled) return;
    expect(result.value.model_id).toBe("static-demo-fallback");
    expect(result.value.plan.classroom_id).toBe("demo-okafor-grade34");
    expect(result.value.plan.family_followups[0]?.student_ref).toBe("Amira");
    expect(result.value.retrieval_trace?.citations.length).toBeGreaterThan(0);
  });

  it("returns unhandled for non-demo routes so the real API can take over", () => {
    expect(resolveStaticDemoRequest("/unknown-route")).toEqual({ handled: false });
  });

  it("emits lightweight stream progress for static generation responses", () => {
    const onThinking = vi.fn();
    const onChunk = vi.fn();

    emitStaticDemoStream({ onThinking, onChunk }, { ok: true });

    expect(onThinking).toHaveBeenCalledWith(expect.stringContaining("synthetic classroom fixture"));
    expect(onChunk).toHaveBeenCalledWith(expect.stringContaining("ok"));
  });
});
