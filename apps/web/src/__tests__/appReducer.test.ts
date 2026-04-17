// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { appReducer, createInitialState, type AppState } from "../appReducer";
import type { ClassroomRole } from "../appReducer";

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

function baseState(overrides: Partial<AppState> = {}): AppState {
  return {
    ...createInitialState(),
    ...overrides,
  };
}

describe("appReducer — SET_CLASSROOM_ROLE", () => {
  beforeEach(() => {
    installLocalStorage();
    localStorage.clear();
  });

  it("stores the role for the given classroom", () => {
    const initial = baseState({ classroomRoles: {} });
    const next = appReducer(initial, {
      type: "SET_CLASSROOM_ROLE",
      classroomId: "demo-okafor-grade34",
      role: "ea",
    });
    expect(next.classroomRoles).toEqual({ "demo-okafor-grade34": "ea" });
  });

  it("preserves existing role entries for other classrooms", () => {
    const initial = baseState({ classroomRoles: { "classroom-a": "teacher" } });
    const next = appReducer(initial, {
      type: "SET_CLASSROOM_ROLE",
      classroomId: "classroom-b",
      role: "substitute",
    });
    expect(next.classroomRoles).toEqual({
      "classroom-a": "teacher",
      "classroom-b": "substitute",
    });
  });

  it("overwrites an existing role for the same classroom", () => {
    const initial = baseState({ classroomRoles: { "classroom-a": "teacher" } });
    const next = appReducer(initial, {
      type: "SET_CLASSROOM_ROLE",
      classroomId: "classroom-a",
      role: "reviewer",
    });
    expect(next.classroomRoles).toEqual({ "classroom-a": "reviewer" });
  });

  it("persists the role map to localStorage under prairie-classroom-roles", () => {
    const initial = baseState({ classroomRoles: {} });
    appReducer(initial, {
      type: "SET_CLASSROOM_ROLE",
      classroomId: "classroom-a",
      role: "ea",
    });
    expect(localStorage.getItem("prairie-classroom-roles")).toBe(
      JSON.stringify({ "classroom-a": "ea" }),
    );
  });
});

describe("createInitialState — classroomRoles hydration", () => {
  beforeEach(() => {
    installLocalStorage();
    localStorage.clear();
  });

  it("defaults classroomRoles to {} when no stored value is present", () => {
    const state = createInitialState();
    expect(state.classroomRoles).toEqual({});
  });

  it("hydrates classroomRoles from localStorage", () => {
    localStorage.setItem(
      "prairie-classroom-roles",
      JSON.stringify({ "classroom-a": "teacher", "classroom-b": "ea" }),
    );
    const state = createInitialState();
    expect(state.classroomRoles).toEqual({
      "classroom-a": "teacher",
      "classroom-b": "ea",
    });
  });

  it("drops unknown role strings and falls back to teacher with a console warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    localStorage.setItem(
      "prairie-classroom-roles",
      JSON.stringify({ "classroom-a": "admin", "classroom-b": "ea" }),
    );
    const state = createInitialState();
    expect(state.classroomRoles).toEqual({
      "classroom-a": "teacher",
      "classroom-b": "ea",
    });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("ignores malformed JSON and returns an empty map", () => {
    localStorage.setItem("prairie-classroom-roles", "{not json");
    const state = createInitialState();
    expect(state.classroomRoles).toEqual({});
  });
});

describe("appReducer — role prompt", () => {
  beforeEach(() => {
    installLocalStorage();
    localStorage.clear();
  });

  it("OPEN_ROLE_PROMPT sets the prompt classroom id", () => {
    const initial = baseState();
    const next = appReducer(initial, {
      type: "OPEN_ROLE_PROMPT",
      classroomId: "classroom-a",
    });
    expect(next.rolePrompt).toEqual({ classroomId: "classroom-a" });
  });

  it("CLOSE_ROLE_PROMPT clears the prompt", () => {
    const initial = baseState({ rolePrompt: { classroomId: "classroom-a" } });
    const next = appReducer(initial, { type: "CLOSE_ROLE_PROMPT" });
    expect(next.rolePrompt).toBeNull();
  });
});

describe("ClassroomRole literal shape", () => {
  it("exports the four supported role values", () => {
    const roles: ClassroomRole[] = ["teacher", "ea", "substitute", "reviewer"];
    expect(roles).toHaveLength(4);
  });
});

describe("appReducer — featuresSeen lifecycle", () => {
  beforeEach(() => {
    installLocalStorage();
    localStorage.clear();
  });

  it("MARK_FEATURE_SEEN records a feature and persists to localStorage", () => {
    const initial = baseState({ featuresSeen: {} });
    const next = appReducer(initial, { type: "MARK_FEATURE_SEEN", feature: "differentiate" });
    expect(next.featuresSeen.differentiate).toBe(true);
    expect(JSON.parse(localStorage.getItem("prairie-features-seen") ?? "{}")).toEqual({
      differentiate: true,
    });
  });

  it("CLEAR_FEATURE_SEEN removes a single feature and updates storage", () => {
    const initial = baseState({
      featuresSeen: { differentiate: true, "family-message": true },
    });
    const next = appReducer(initial, {
      type: "CLEAR_FEATURE_SEEN",
      feature: "differentiate",
    });
    expect(next.featuresSeen).toEqual({ "family-message": true });
    expect(JSON.parse(localStorage.getItem("prairie-features-seen") ?? "{}")).toEqual({
      "family-message": true,
    });
  });

  it("CLEAR_FEATURE_SEEN removes the storage key when the last feature is cleared", () => {
    localStorage.setItem("prairie-features-seen", JSON.stringify({ differentiate: true }));
    const initial = baseState({ featuresSeen: { differentiate: true } });
    const next = appReducer(initial, {
      type: "CLEAR_FEATURE_SEEN",
      feature: "differentiate",
    });
    expect(next.featuresSeen).toEqual({});
    expect(localStorage.getItem("prairie-features-seen")).toBeNull();
  });

  it("CLEAR_FEATURE_SEEN is a no-op when the feature is not present", () => {
    const initial = baseState({ featuresSeen: { differentiate: true } });
    const next = appReducer(initial, {
      type: "CLEAR_FEATURE_SEEN",
      feature: "never-seen",
    });
    expect(next).toBe(initial);
  });

  it("RESET_FEATURES_SEEN clears every feature and removes the storage key", () => {
    localStorage.setItem(
      "prairie-features-seen",
      JSON.stringify({ differentiate: true, "ea-briefing": true }),
    );
    const initial = baseState({
      featuresSeen: { differentiate: true, "ea-briefing": true },
    });
    const next = appReducer(initial, { type: "RESET_FEATURES_SEEN" });
    expect(next.featuresSeen).toEqual({});
    expect(localStorage.getItem("prairie-features-seen")).toBeNull();
  });
});
