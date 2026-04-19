// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  appReducer,
  createInitialState,
  getVisibleTabs,
  getVisibleTabsForGroup,
  getVisibleNavGroups,
  isTabVisibleForRole,
  shouldSuppressFirstRunModalsFromUrl,
  TAB_META,
  type ActiveTab,
  type AppState,
} from "../appReducer";
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

function setUrl(pathAndSearch: string) {
  window.history.replaceState({}, "", pathAndSearch);
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
    setUrl("/");
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

describe("createInitialState — judge/demo first-run modals", () => {
  beforeEach(() => {
    installLocalStorage();
    localStorage.clear();
    setUrl("/");
  });

  it("shows onboarding for a normal first visit", () => {
    const state = createInitialState();
    expect(state.showOnboarding).toBe(true);
    expect(shouldSuppressFirstRunModalsFromUrl()).toBe(false);
  });

  it("suppresses onboarding when the demo query flag is present", () => {
    setUrl("/?demo=true&tab=today&classroom=demo-okafor-grade34");
    const state = createInitialState();
    expect(state.showOnboarding).toBe(false);
    expect(shouldSuppressFirstRunModalsFromUrl()).toBe(true);
  });

  it("also supports explicit presentation and judge query flags", () => {
    setUrl("/?presentation=true");
    expect(shouldSuppressFirstRunModalsFromUrl()).toBe(true);

    setUrl("/?judge=1");
    expect(shouldSuppressFirstRunModalsFromUrl()).toBe(true);

    setUrl("/?demo=on");
    expect(shouldSuppressFirstRunModalsFromUrl()).toBe(true);
  });
});

describe("appReducer — role prompt", () => {
  beforeEach(() => {
    installLocalStorage();
    localStorage.clear();
    setUrl("/");
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

describe("tab visibility helpers — per-role", () => {
  it("TAB_META: every tab declares the roles that may see it", () => {
    for (const [tab, meta] of Object.entries(TAB_META)) {
      expect(meta.roles.length).toBeGreaterThan(0);
      for (const role of meta.roles) {
        expect(["teacher", "ea", "substitute", "reviewer"]).toContain(role);
      }
      expect(tab in TAB_META).toBe(true);
    }
  });

  it("teacher sees every tab", () => {
    const tabs = getVisibleTabs("teacher");
    const allTabs: ActiveTab[] = [
      "today", "differentiate", "tomorrow-plan", "family-message",
      "log-intervention", "language-tools", "support-patterns",
      "ea-briefing", "ea-load", "complexity-forecast",
      "survival-packet", "usage-insights",
    ];
    for (const tab of allTabs) expect(tabs).toContain(tab);
  });

  it("ea sees today, ea-briefing, ea-load, log-intervention, usage-insights only", () => {
    const tabs = getVisibleTabs("ea");
    const expected: ActiveTab[] = [
      "today", "ea-briefing", "ea-load", "log-intervention", "usage-insights",
    ];
    expect([...tabs].sort()).toEqual([...expected].sort());
  });

  it("substitute sees today, ea-briefing, complexity-forecast (read), log-intervention only", () => {
    const tabs = getVisibleTabs("substitute");
    const expected: ActiveTab[] = [
      "today", "ea-briefing", "complexity-forecast", "log-intervention",
    ];
    expect([...tabs].sort()).toEqual([...expected].sort());
  });

  it("reviewer sees read-only history & aggregate surfaces only (tomorrow-plan, complexity-forecast, log-intervention, family-message, support-patterns, usage-insights)", () => {
    const tabs = getVisibleTabs("reviewer");
    const expected: ActiveTab[] = [
      "tomorrow-plan",
      "complexity-forecast",
      "log-intervention",
      "family-message",
      "support-patterns",
      "usage-insights",
    ];
    expect([...tabs].sort()).toEqual([...expected].sort());
  });

  it("substitute never sees the sub-packet tab — it exists to consume the packet, but the read surface is not built yet", () => {
    const tabs = getVisibleTabs("substitute");
    expect(tabs).not.toContain("survival-packet");
  });

  it("reviewer never sees today (reviewer works from history, not the live operational view)", () => {
    const tabs = getVisibleTabs("reviewer");
    expect(tabs).not.toContain("today");
  });

  it("ea never sees tomorrow-plan, differentiate, language-tools, family-message, support-patterns, survival-packet, complexity-forecast", () => {
    const tabs = getVisibleTabs("ea");
    expect(tabs).not.toContain("tomorrow-plan");
    expect(tabs).not.toContain("differentiate");
    expect(tabs).not.toContain("language-tools");
    expect(tabs).not.toContain("family-message");
    expect(tabs).not.toContain("support-patterns");
    expect(tabs).not.toContain("survival-packet");
    expect(tabs).not.toContain("complexity-forecast");
  });

  it("isTabVisibleForRole matches the TAB_META declaration", () => {
    for (const [tab, meta] of Object.entries(TAB_META)) {
      for (const role of ["teacher", "ea", "substitute", "reviewer"] as const) {
        const expected = meta.roles.includes(role);
        expect(isTabVisibleForRole(tab as ActiveTab, role)).toBe(expected);
      }
    }
  });

  it("getVisibleTabsForGroup returns only tabs the role may see in that group", () => {
    expect(getVisibleTabsForGroup("prep", "reviewer")).toEqual([]);
    expect(getVisibleTabsForGroup("prep", "teacher")).toEqual(["differentiate", "language-tools"]);
    // OPS order (2026-04-19 OPS audit): log-intervention leads the row,
    // forecast/ea-briefing follow. Substitute sees those three.
    expect(getVisibleTabsForGroup("ops", "substitute")).toEqual([
      "log-intervention",
      "complexity-forecast",
      "ea-briefing",
    ]);
  });

  it("getVisibleNavGroups hides a group with zero visible tabs (reviewer has no Prep)", () => {
    expect(getVisibleNavGroups("reviewer")).not.toContain("prep");
    expect(getVisibleNavGroups("teacher")).toEqual(["today", "prep", "ops", "review"]);
    expect(getVisibleNavGroups("ea")).toEqual(["today", "ops", "review"]);
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
