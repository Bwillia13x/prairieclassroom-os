import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { useStreamingRequest } from "../useStreamingRequest";
import AppContext, { type AppContextValue } from "../../AppContext";
import type { StreamingState } from "../../appReducer";

function makeContext(dispatch = vi.fn()): AppContextValue {
  const streaming: StreamingState = {
    active: false,
    phase: "idle",
    thinkingText: "",
    partialSections: [],
    progress: 0,
    elapsedSeconds: 0,
  };
  return {
    classrooms: [],
    activeClassroom: "demo",
    activeTab: "today",
    setActiveClassroom: vi.fn(),
    setActiveTab: vi.fn(),
    profile: undefined,
    students: [],
    classroomAccessCodes: {},
    classroomRoles: {},
    activeRole: "teacher" as const,
    setClassroomRole: vi.fn(),
    authPrompt: null,
    showSuccess: vi.fn(),
    showError: vi.fn(),
    dispatch,
    streaming,
    toasts: [],
    featuresSeen: {},
    submitFeedback: vi.fn(),
    showUndo: vi.fn(),
    dismissToast: vi.fn(),
    tomorrowNotes: [],
    appendTomorrowNote: vi.fn(),
    removeTomorrowNote: vi.fn(),
  };
}

function wrapper(ctx: AppContextValue) {
  return ({ children }: { children: ReactNode }) =>
    createElement(AppContext.Provider, { value: ctx }, children);
}

describe("useStreamingRequest", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("dispatches reducer updates from real stream callbacks", async () => {
    const dispatch = vi.fn();
    const ctx = makeContext(dispatch);
    const { result } = renderHook(
      () => useStreamingRequest<{ ok: true }>(),
      { wrapper: wrapper(ctx) },
    );

    await act(async () => {
      const promise = result.current.execute(async (stream) => {
        stream.onThinking?.("Reading live SSE");
        stream.onChunk?.("{\"ok\":");
        stream.onChunk?.("true}");
        return { ok: true };
      });
      await vi.advanceTimersByTimeAsync(250);
      await expect(promise).resolves.toEqual({ ok: true });
    });

    expect(dispatch).toHaveBeenCalledWith({ type: "STREAM_START", phase: "thinking" });
    expect(dispatch).toHaveBeenCalledWith({ type: "STREAM_THINKING_CHUNK", text: "Reading live SSE" });
    expect(dispatch).toHaveBeenCalledWith({ type: "STREAM_COMPLETE" });
  });

  it("does not emit canned thinking messages while waiting for SSE", async () => {
    const dispatch = vi.fn();
    const ctx = makeContext(dispatch);
    const { result } = renderHook(() => useStreamingRequest(), {
      wrapper: wrapper(ctx),
    });

    const neverResolves = new Promise<{ ok: true }>(() => {});
    act(() => {
      void result.current.execute(() => neverResolves);
    });

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    const thinkingCalls = dispatch.mock.calls.filter(
      (call) => (call[0] as { type: string }).type === "STREAM_THINKING_CHUNK",
    );
    expect(thinkingCalls).toHaveLength(0);
  });
});
