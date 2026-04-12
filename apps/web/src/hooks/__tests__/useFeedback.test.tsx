/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFeedback, flushFeedbackQueue } from "../useFeedback";
import * as api from "../../api";

/**
 * Install a minimal in-memory localStorage polyfill when not already present.
 * Node 25 + vitest jsdom env does not always expose window.localStorage, so
 * tests that depend on localStorage.clear()/setItem()/getItem() set up their
 * own store. Called from beforeEach to reset between tests.
 */
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

describe("useFeedback", () => {
  beforeEach(() => {
    installLocalStorage();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("sets submitted=true immediately (optimistic UI)", () => {
    vi.spyOn(api, "submitFeedbackApi").mockResolvedValue({
      id: "fb-1",
      created_at: "2026-04-11T10:00:00Z",
    });

    const { result } = renderHook(() => useFeedback("demo-classroom", "sess-abc"));
    expect(result.current.submitted).toBe(false);

    act(() => {
      result.current.submit("differentiate", 4);
    });

    expect(result.current.submitted).toBe(true);
  });

  it("posts feedback payload with classroomId and sessionId", () => {
    const spy = vi.spyOn(api, "submitFeedbackApi").mockResolvedValue({
      id: "fb-1",
      created_at: "2026-04-11T10:00:00Z",
    });

    const { result } = renderHook(() => useFeedback("demo-classroom", "sess-xyz"));
    act(() => {
      result.current.submit("today", 5, "Great!", "gen-123", "differentiate_material");
    });

    expect(spy).toHaveBeenCalledWith({
      classroom_id: "demo-classroom",
      panel_id: "today",
      rating: 5,
      comment: "Great!",
      generation_id: "gen-123",
      prompt_class: "differentiate_material",
      session_id: "sess-xyz",
    });
  });

  it("omits empty comment, generationId, and promptClass", () => {
    const spy = vi.spyOn(api, "submitFeedbackApi").mockResolvedValue({
      id: "fb-1",
      created_at: "",
    });

    const { result } = renderHook(() => useFeedback("demo", "sess"));
    act(() => {
      result.current.submit("complexity-forecast", 3);
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        comment: undefined,
        generation_id: undefined,
        prompt_class: undefined,
      }),
    );
  });

  it("queues feedback to localStorage on network failure", async () => {
    vi.spyOn(api, "submitFeedbackApi").mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useFeedback("demo", "sess"));

    await act(async () => {
      result.current.submit("differentiate", 2, "Not great");
      // Yield to the microtask queue so the rejected promise .catch() runs
      await Promise.resolve();
      await Promise.resolve();
    });

    const queued = JSON.parse(localStorage.getItem("prairie:feedback-queue") ?? "[]");
    expect(queued).toHaveLength(1);
    expect(queued[0]).toMatchObject({
      classroom_id: "demo",
      panel_id: "differentiate",
      rating: 2,
      comment: "Not great",
      session_id: "sess",
    });
    expect(result.current.error).toBe("network");
  });
});

describe("flushFeedbackQueue", () => {
  beforeEach(() => {
    installLocalStorage();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns 0 when queue is empty", async () => {
    const flushed = await flushFeedbackQueue();
    expect(flushed).toBe(0);
  });

  it("flushes queued items and clears storage on full success", async () => {
    const spy = vi.spyOn(api, "submitFeedbackApi").mockResolvedValue({ id: "fb", created_at: "" });
    localStorage.setItem(
      "prairie:feedback-queue",
      JSON.stringify([
        { classroom_id: "a", panel_id: "today", rating: 5, session_id: "s1" },
        { classroom_id: "a", panel_id: "complexity-forecast", rating: 4, session_id: "s1" },
      ]),
    );

    const flushed = await flushFeedbackQueue();
    expect(flushed).toBe(2);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem("prairie:feedback-queue")).toBeNull();
  });

  it("retains failed items and re-queues them", async () => {
    let callCount = 0;
    vi.spyOn(api, "submitFeedbackApi").mockImplementation(() => {
      callCount++;
      return callCount === 1
        ? Promise.resolve({ id: "fb-1", created_at: "" })
        : Promise.reject(new Error("still failing"));
    });

    localStorage.setItem(
      "prairie:feedback-queue",
      JSON.stringify([
        { classroom_id: "a", panel_id: "today", rating: 5, session_id: "s1" },
        { classroom_id: "a", panel_id: "complexity-forecast", rating: 4, session_id: "s1" },
      ]),
    );

    const flushed = await flushFeedbackQueue();
    expect(flushed).toBe(1);
    const remaining = JSON.parse(localStorage.getItem("prairie:feedback-queue") ?? "[]");
    expect(remaining).toHaveLength(1);
    expect(remaining[0].panel_id).toBe("complexity-forecast");
  });
});
