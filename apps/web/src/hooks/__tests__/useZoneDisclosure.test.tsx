import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useZoneDisclosure } from "../useZoneDisclosure";

describe("useZoneDisclosure", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults to collapsed when no persisted state", () => {
    const { result } = renderHook(() =>
      useZoneDisclosure("classroom-panel", "intel", { defaultOpen: false }),
    );
    expect(result.current.open).toBe(false);
  });

  it("defaults to open when defaultOpen is true", () => {
    const { result } = renderHook(() =>
      useZoneDisclosure("classroom-panel", "watchlist", { defaultOpen: true }),
    );
    expect(result.current.open).toBe(true);
  });

  it("toggles and persists to localStorage", () => {
    const { result } = renderHook(() =>
      useZoneDisclosure("classroom-panel", "intel", { defaultOpen: false }),
    );
    act(() => result.current.toggle());
    expect(result.current.open).toBe(true);
    expect(window.localStorage.getItem("prairie:disclosure:classroom-panel:intel")).toBe("open");
  });

  it("scopes persistence per key+zone", () => {
    const { result: intel } = renderHook(() =>
      useZoneDisclosure("classroom-panel", "intel", { defaultOpen: false }),
    );
    const { result: roster } = renderHook(() =>
      useZoneDisclosure("classroom-panel", "roster", { defaultOpen: false }),
    );
    act(() => intel.current.toggle());
    expect(intel.current.open).toBe(true);
    expect(roster.current.open).toBe(false);
  });
});
