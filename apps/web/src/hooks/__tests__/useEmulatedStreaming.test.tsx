import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEmulatedStreaming } from "../useEmulatedStreaming";
import AppContext, { type AppContextValue } from "../../AppContext";
import type { StreamingState } from "../../appReducer";
import { createElement, type ReactNode } from "react";

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

describe("useEmulatedStreaming", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("dispatches STREAM_START at phase 'thinking' when execute is called", async () => {
    const dispatch = vi.fn();
    const ctx = makeContext(dispatch);
    const { result } = renderHook(() => useEmulatedStreaming(), {
      wrapper: wrapper(ctx),
    });

    const neverResolves = new Promise<{ ok: true }>(() => {});
    act(() => {
      void result.current.execute(() => neverResolves);
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: "STREAM_START",
      phase: "thinking",
    });
  });

  it("transitions to 'structuring' after the configured delay", async () => {
    const dispatch = vi.fn();
    const ctx = makeContext(dispatch);
    const { result } = renderHook(
      () =>
        useEmulatedStreaming({
          structuringDelayMs: 2000,
          sectionLabels: ["Variants"],
        }),
      { wrapper: wrapper(ctx) },
    );

    let resolveFn: (v: { ok: true }) => void = () => {};
    const pending = new Promise<{ ok: true }>((r) => { resolveFn = r; });

    act(() => {
      void result.current.execute(() => pending);
    });

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    const progressCalls = dispatch.mock.calls.filter(
      (call) => (call[0] as { type: string }).type === "STREAM_PROGRESS",
    );
    expect(progressCalls.length).toBeGreaterThan(0);

    await act(async () => {
      resolveFn({ ok: true });
      await Promise.resolve();
      vi.advanceTimersByTime(500);
    });

    expect(dispatch).toHaveBeenCalledWith({ type: "STREAM_COMPLETE" });
  });

  it("emits STREAM_TICK once per second while active", async () => {
    const dispatch = vi.fn();
    const ctx = makeContext(dispatch);
    const { result } = renderHook(() => useEmulatedStreaming(), {
      wrapper: wrapper(ctx),
    });

    const neverResolves = new Promise<{ ok: true }>(() => {});
    act(() => {
      void result.current.execute(() => neverResolves);
    });

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    const tickCalls = dispatch.mock.calls.filter(
      (call) => (call[0] as { type: string }).type === "STREAM_TICK",
    );
    expect(tickCalls.length).toBeGreaterThanOrEqual(2);
  });

  it("dispatches STREAM_RESET when the inner promise returns null (cancelled)", async () => {
    const dispatch = vi.fn();
    const ctx = makeContext(dispatch);
    const { result } = renderHook(() => useEmulatedStreaming(), {
      wrapper: wrapper(ctx),
    });

    await act(async () => {
      const resp = await result.current.execute(async () => null);
      expect(resp).toBeNull();
    });

    expect(dispatch).toHaveBeenCalledWith({ type: "STREAM_RESET" });
  });

  it("propagates a rejected promise and still dispatches STREAM_RESET", async () => {
    const dispatch = vi.fn();
    const ctx = makeContext(dispatch);
    const { result } = renderHook(() => useEmulatedStreaming(), {
      wrapper: wrapper(ctx),
    });

    await act(async () => {
      await expect(
        result.current.execute(async () => {
          throw new Error("boom");
        }),
      ).rejects.toThrow("boom");
    });

    expect(dispatch).toHaveBeenCalledWith({ type: "STREAM_RESET" });
  });
});
