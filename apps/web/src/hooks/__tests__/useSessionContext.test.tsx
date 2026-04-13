/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSessionContext, flushSessionQueue } from "../useSessionContext";
import * as api from "../../api";

function installLocalStorage() {
  const existing = globalThis.localStorage;
  if (existing && typeof existing.clear === "function") return;
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => { store.set(key, String(value)); },
      removeItem: (key: string) => { store.delete(key); },
      clear: () => { store.clear(); },
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() { return store.size; },
    },
  });
}

describe("useSessionContext", () => {
  beforeEach(() => {
    installLocalStorage();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("generates a unique session ID on mount", () => {
    const { result } = renderHook(() => useSessionContext("demo"));
    expect(result.current.sessionId).toMatch(/^sess-[a-z0-9]+-[a-z0-9]+$/);
  });

  it("provides stable callback identities across renders", () => {
    const { result, rerender } = renderHook(() => useSessionContext("demo"));
    const first = result.current.recordPanelVisit;
    rerender();
    expect(result.current.recordPanelVisit).toBe(first);
  });

  it("dedupes consecutive duplicate panel visits", () => {
    const spy = vi.spyOn(api, "submitSessionApi").mockResolvedValue({ id: "sess-1" });

    const { result, unmount } = renderHook(() => useSessionContext("demo"));

    act(() => {
      result.current.recordPanelVisit("today");
      result.current.recordPanelVisit("today");
      result.current.recordPanelVisit("differentiate");
      result.current.recordPanelVisit("differentiate");
      result.current.recordPanelVisit("today");
    });

    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    unmount();

    expect(spy).toHaveBeenCalled();
    const call = spy.mock.calls[0][0];
    expect(call.panels_visited).toEqual(["today", "differentiate", "today"]);
  });

  it("records generation events with panel, prompt class, and timestamp", () => {
    const spy = vi.spyOn(api, "submitSessionApi").mockResolvedValue({ id: "sess-1" });

    const { result, unmount } = renderHook(() => useSessionContext("demo"));
    act(() => {
      result.current.recordPanelVisit("differentiate");
      result.current.recordGeneration("differentiate", "differentiate_material");
      result.current.recordFeedback();
    });

    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    unmount();

    expect(spy).toHaveBeenCalled();
    const call = spy.mock.calls[0][0];
    expect(call.classroom_id).toBe("demo");
    expect(call.panels_visited).toEqual(["differentiate"]);
    expect(call.generations_triggered).toHaveLength(1);
    expect(call.generations_triggered[0]).toMatchObject({
      panel_id: "differentiate",
      prompt_class: "differentiate_material",
    });
    expect(call.feedback_count).toBe(1);
  });

  it("does not flush when no panels have been visited", () => {
    const spy = vi.spyOn(api, "submitSessionApi").mockResolvedValue({ id: "sess-1" });

    const { result } = renderHook(() => useSessionContext("demo"));

    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(spy).not.toHaveBeenCalled();
    expect(result.current.sessionId).toBeTruthy();
  });

  it("resets session state when classroomId changes", () => {
    const spy = vi.spyOn(api, "submitSessionApi").mockResolvedValue({ id: "sess-1" });

    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useSessionContext(id),
      { initialProps: { id: "classroom-a" } },
    );

    const firstSessionId = result.current.sessionId;
    act(() => {
      result.current.recordPanelVisit("today");
    });

    rerender({ id: "classroom-b" });

    const secondSessionId = result.current.sessionId;
    expect(secondSessionId).not.toBe(firstSessionId);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      classroom_id: "classroom-a",
      panels_visited: ["today"],
    }), undefined, { keepalive: true });
  });
});

describe("flushSessionQueue", () => {
  beforeEach(() => {
    installLocalStorage();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns 0 when queue is empty", async () => {
    const flushed = await flushSessionQueue();
    expect(flushed).toBe(0);
  });

  it("flushes queued items and clears storage on full success", async () => {
    const spy = vi.spyOn(api, "submitSessionApi").mockResolvedValue({ id: "sess-1" });
    localStorage.setItem(
      "prairie:session-queue",
      JSON.stringify([
        {
          classroom_id: "demo",
          session_id: "sess-1",
          started_at: "2026-04-11T09:00:00Z",
          ended_at: "2026-04-11T09:10:00Z",
          panels_visited: ["today"],
          generations_triggered: [],
          feedback_count: 0,
        },
      ]),
    );

    const flushed = await flushSessionQueue();
    expect(flushed).toBe(1);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("prairie:session-queue")).toBeNull();
  });

  it("retains failed items", async () => {
    vi.spyOn(api, "submitSessionApi").mockRejectedValue(new Error("down"));
    localStorage.setItem(
      "prairie:session-queue",
      JSON.stringify([
        {
          classroom_id: "demo",
          session_id: "sess-1",
          started_at: "2026-04-11T09:00:00Z",
          ended_at: "2026-04-11T09:10:00Z",
          panels_visited: ["today"],
          generations_triggered: [],
          feedback_count: 0,
        },
      ]),
    );

    const flushed = await flushSessionQueue();
    expect(flushed).toBe(0);
    const remaining = JSON.parse(localStorage.getItem("prairie:session-queue") ?? "[]");
    expect(remaining).toHaveLength(1);
  });
});
