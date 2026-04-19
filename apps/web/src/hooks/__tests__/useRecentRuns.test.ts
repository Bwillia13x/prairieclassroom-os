import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRecentRuns } from "../useRecentRuns";

beforeEach(() => {
  sessionStorage.clear();
});

describe("useRecentRuns", () => {
  it("starts empty", () => {
    const { result } = renderHook(() => useRecentRuns("differentiate", "demo", 3));
    expect(result.current.runs).toEqual([]);
  });

  it("records a run and keeps most recent first", () => {
    const { result } = renderHook(() => useRecentRuns("differentiate", "demo", 3));
    act(() => {
      result.current.record({ id: "a", label: "First", at: 1 });
    });
    act(() => {
      result.current.record({ id: "b", label: "Second", at: 2 });
    });
    expect(result.current.runs.map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("caps the list at the limit", () => {
    const { result } = renderHook(() => useRecentRuns("differentiate", "demo", 2));
    act(() => {
      result.current.record({ id: "a", label: "1", at: 1 });
    });
    act(() => {
      result.current.record({ id: "b", label: "2", at: 2 });
    });
    act(() => {
      result.current.record({ id: "c", label: "3", at: 3 });
    });
    expect(result.current.runs.map((r) => r.id)).toEqual(["c", "b"]);
  });

  it("scopes runs by tool + classroom", () => {
    const { result: a } = renderHook(() => useRecentRuns("differentiate", "demo", 3));
    act(() => {
      a.current.record({ id: "x", label: "x", at: 1 });
    });
    const { result: b } = renderHook(() => useRecentRuns("simplify", "demo", 3));
    expect(b.current.runs).toEqual([]);
  });

  it("survives remount via sessionStorage", () => {
    const { result, unmount } = renderHook(() => useRecentRuns("vocab", "demo", 3));
    act(() => {
      result.current.record({ id: "a", label: "A", at: 1 });
    });
    unmount();
    const { result: reloaded } = renderHook(() => useRecentRuns("vocab", "demo", 3));
    expect(reloaded.current.runs.map((r) => r.id)).toEqual(["a"]);
  });
});
