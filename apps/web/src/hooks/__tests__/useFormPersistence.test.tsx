import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFormPersistence } from "../useFormPersistence";

function makeSessionStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
  };
}

describe("useFormPersistence", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", makeSessionStorageMock());
  });

  it("returns hasPendingDraft=false when no stored value", () => {
    const setter = vi.fn();
    const { result } = renderHook(() =>
      useFormPersistence("test-key", { text: "" }, setter, { minChars: 20 })
    );
    expect(result.current.hasPendingDraft).toBe(false);
  });

  it("returns hasPendingDraft=true when stored draft >= minChars and age < maxAgeMs", () => {
    const saved = { text: "a".repeat(25), __ts: Date.now() - 60_000 };
    sessionStorage.setItem("test-key", JSON.stringify(saved));
    const setter = vi.fn();
    const { result } = renderHook(() =>
      useFormPersistence("test-key", { text: "" }, setter, { minChars: 20, maxAgeMs: 12 * 3600 * 1000, autoRestore: false })
    );
    expect(result.current.hasPendingDraft).toBe(true);
  });

  it("returns hasPendingDraft=false when stored draft age exceeds maxAgeMs", () => {
    const saved = { text: "a".repeat(25), __ts: Date.now() - 13 * 3600 * 1000 };
    sessionStorage.setItem("test-key", JSON.stringify(saved));
    const setter = vi.fn();
    const { result } = renderHook(() =>
      useFormPersistence("test-key", { text: "" }, setter, { minChars: 20, maxAgeMs: 12 * 3600 * 1000, autoRestore: false })
    );
    expect(result.current.hasPendingDraft).toBe(false);
  });

  it("returns hasPendingDraft=false when total chars < minChars", () => {
    const saved = { text: "short", __ts: Date.now() };
    sessionStorage.setItem("test-key", JSON.stringify(saved));
    const setter = vi.fn();
    const { result } = renderHook(() =>
      useFormPersistence("test-key", { text: "" }, setter, { minChars: 20, autoRestore: false })
    );
    expect(result.current.hasPendingDraft).toBe(false);
  });

  it("restore() applies the saved draft when called", () => {
    const saved = { text: "a".repeat(25), __ts: Date.now() };
    sessionStorage.setItem("test-key", JSON.stringify(saved));
    const setter = vi.fn();
    const { result } = renderHook(() =>
      useFormPersistence("test-key", { text: "" }, setter, { autoRestore: false })
    );
    act(() => result.current.restore());
    expect(setter).toHaveBeenCalledWith(expect.objectContaining({ text: "a".repeat(25) }));
  });

  it("dismiss() clears stored value and sets hasPendingDraft=false", () => {
    const saved = { text: "a".repeat(25), __ts: Date.now() };
    sessionStorage.setItem("test-key", JSON.stringify(saved));
    const setter = vi.fn();
    const { result } = renderHook(() =>
      useFormPersistence("test-key", { text: "" }, setter, { autoRestore: false })
    );
    act(() => result.current.dismiss());
    expect(sessionStorage.getItem("test-key")).toBeNull();
    expect(result.current.hasPendingDraft).toBe(false);
  });

  it("remains backward compatible — default autoRestore=true preserves existing behavior", () => {
    const saved = { text: "hello world" };
    sessionStorage.setItem("test-key", JSON.stringify(saved));
    const setter = vi.fn();
    renderHook(() => useFormPersistence("test-key", { text: "" }, setter));
    expect(setter).toHaveBeenCalledWith({ text: "hello world" });
  });
});
