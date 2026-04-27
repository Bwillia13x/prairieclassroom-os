import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMondayMoment } from "../useMondayMoment";

/**
 * Hook-direct tests migrated from the deleted MondayResetMoment standalone
 * component. Locks the same four behaviors the component test covered, but
 * exercises the hook directly so the contract isn't mediated through dead
 * markup.
 */

describe("useMondayMoment", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it("returns active=true on Monday when not dismissed this week", () => {
    vi.setSystemTime(new Date("2026-04-20T12:00:00"));
    const { result } = renderHook(() => useMondayMoment("demo"));
    expect(result.current.active).toBe(true);
  });

  it("returns active=false on Tuesday", () => {
    vi.setSystemTime(new Date("2026-04-21T12:00:00"));
    const { result } = renderHook(() => useMondayMoment("demo"));
    expect(result.current.active).toBe(false);
  });

  it("returns active=false after the week's banner has been dismissed", () => {
    vi.setSystemTime(new Date("2026-04-20T12:00:00"));
    window.localStorage.setItem("prairie:monday-reset:demo:2026-W17", "dismissed");
    const { result } = renderHook(() => useMondayMoment("demo"));
    expect(result.current.active).toBe(false);
  });

  it("persists dismissal for the classroom and week and flips active to false", () => {
    vi.setSystemTime(new Date("2026-04-20T12:00:00"));
    const { result } = renderHook(() => useMondayMoment("demo"));
    expect(result.current.active).toBe(true);

    act(() => {
      result.current.dismiss();
    });

    expect(window.localStorage.getItem("prairie:monday-reset:demo:2026-W17")).toBe("dismissed");
    expect(result.current.active).toBe(false);
  });
});
