// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  appReducer,
  createInitialState,
  defaultToolForTab,
  getVisibleTabs,
  isActiveTab,
  isActiveTool,
  isTabVisibleForRole,
  resolveLegacyPanel,
  resolveNavTarget,
  restoreNavFromUrl,
  shouldSuppressFirstRunModalsFromUrl,
  TAB_META,
  TOOLS_BY_TAB,
  type ActiveTab,
  type ActiveTool,
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

describe("seven-view top-level navigation — per-role visibility", () => {
  it("TAB_META: every top-level page declares the roles that may see it", () => {
    for (const [tab, meta] of Object.entries(TAB_META)) {
      expect(meta.roles.length).toBeGreaterThan(0);
      for (const role of meta.roles) {
        expect(["teacher", "ea", "substitute", "reviewer"]).toContain(role);
      }
      expect(tab in TAB_META).toBe(true);
    }
  });

  it("teacher sees every top-level page in the fixed canonical order", () => {
    expect(getVisibleTabs("teacher")).toEqual([
      "classroom", "today", "tomorrow", "week", "prep", "ops", "review",
    ]);
  });

  it("ea sees classroom, today, ops, review (no prep / no tomorrow / no week)", () => {
    expect(getVisibleTabs("ea")).toEqual([
      "classroom", "today", "ops", "review",
    ]);
  });

  it("substitute sees classroom, today, tomorrow, week, ops (no prep / no review)", () => {
    expect(getVisibleTabs("substitute")).toEqual([
      "classroom", "today", "tomorrow", "week", "ops",
    ]);
  });

  it("reviewer sees tomorrow, week, review only (no classroom/today/prep/ops)", () => {
    expect(getVisibleTabs("reviewer")).toEqual([
      "tomorrow", "week", "review",
    ]);
  });

  it("isTabVisibleForRole matches the TAB_META declaration", () => {
    for (const [tab, meta] of Object.entries(TAB_META)) {
      for (const role of ["teacher", "ea", "substitute", "reviewer"] as const) {
        const expected = meta.roles.includes(role);
        expect(isTabVisibleForRole(tab as ActiveTab, role)).toBe(expected);
      }
    }
  });
});

describe("embedded tool catalog", () => {
  it("lists the tools hosted by each multi-tool page", () => {
    expect(TOOLS_BY_TAB.prep).toEqual(["differentiate", "language-tools"]);
    expect(TOOLS_BY_TAB.tomorrow).toEqual(["tomorrow-plan", "complexity-forecast"]);
    expect(TOOLS_BY_TAB.ops).toEqual([
      "log-intervention",
      "ea-briefing",
      "ea-load",
      "survival-packet",
    ]);
    expect(TOOLS_BY_TAB.review).toEqual([
      "family-message",
      "support-patterns",
      "usage-insights",
    ]);
  });

  it("defaults each multi-tool page to its first tool", () => {
    expect(defaultToolForTab("prep")).toBe("differentiate");
    expect(defaultToolForTab("tomorrow")).toBe("tomorrow-plan");
    expect(defaultToolForTab("ops")).toBe("log-intervention");
    expect(defaultToolForTab("review")).toBe("family-message");
  });

  it("returns null for single-surface pages", () => {
    expect(defaultToolForTab("classroom")).toBeNull();
    expect(defaultToolForTab("today")).toBeNull();
    expect(defaultToolForTab("week")).toBeNull();
  });
});

describe("legacy panel mapping", () => {
  const legacyMap: Array<{ panel: string; tab: ActiveTab; tool: ActiveTool | null }> = [
    { panel: "today", tab: "today", tool: null },
    { panel: "differentiate", tab: "prep", tool: "differentiate" },
    { panel: "language-tools", tab: "prep", tool: "language-tools" },
    { panel: "tomorrow-plan", tab: "tomorrow", tool: "tomorrow-plan" },
    { panel: "complexity-forecast", tab: "tomorrow", tool: "complexity-forecast" },
    { panel: "log-intervention", tab: "ops", tool: "log-intervention" },
    { panel: "ea-briefing", tab: "ops", tool: "ea-briefing" },
    { panel: "ea-load", tab: "ops", tool: "ea-load" },
    { panel: "survival-packet", tab: "ops", tool: "survival-packet" },
    { panel: "family-message", tab: "review", tool: "family-message" },
    { panel: "support-patterns", tab: "review", tool: "support-patterns" },
    { panel: "usage-insights", tab: "review", tool: "usage-insights" },
  ];

  it("resolves every legacy panel id to its canonical (tab, tool) pair", () => {
    for (const { panel, tab, tool } of legacyMap) {
      expect(resolveLegacyPanel(panel)).toEqual({ tab, tool });
    }
  });

  it("falls back to today for unknown inputs", () => {
    expect(resolveLegacyPanel("not-a-panel")).toEqual({ tab: "today", tool: null });
    expect(resolveLegacyPanel(undefined)).toEqual({ tab: "today", tool: null });
    expect(resolveLegacyPanel(null)).toEqual({ tab: "today", tool: null });
  });
});

describe("URL restore — default + legacy + canonical", () => {
  beforeEach(() => {
    installLocalStorage();
    localStorage.clear();
    setUrl("/");
  });

  it("lands on the classroom page when no ?tab= is present", () => {
    expect(restoreNavFromUrl()).toEqual({ tab: "classroom", tool: null });
  });

  it("accepts a canonical top-level tab and defaults to its first tool", () => {
    setUrl("/?tab=prep");
    expect(restoreNavFromUrl()).toEqual({ tab: "prep", tool: "differentiate" });
  });

  it("honors an explicit ?tool= when valid for the resolved page", () => {
    setUrl("/?tab=prep&tool=language-tools");
    expect(restoreNavFromUrl()).toEqual({ tab: "prep", tool: "language-tools" });
  });

  it("redirects every legacy ?tab=<old-panel> link to its new destination", () => {
    const legacy: Array<[string, { tab: ActiveTab; tool: ActiveTool | null }]> = [
      ["differentiate", { tab: "prep", tool: "differentiate" }],
      ["language-tools", { tab: "prep", tool: "language-tools" }],
      ["tomorrow-plan", { tab: "tomorrow", tool: "tomorrow-plan" }],
      ["complexity-forecast", { tab: "tomorrow", tool: "complexity-forecast" }],
      ["log-intervention", { tab: "ops", tool: "log-intervention" }],
      ["ea-briefing", { tab: "ops", tool: "ea-briefing" }],
      ["ea-load", { tab: "ops", tool: "ea-load" }],
      ["survival-packet", { tab: "ops", tool: "survival-packet" }],
      ["family-message", { tab: "review", tool: "family-message" }],
      ["support-patterns", { tab: "review", tool: "support-patterns" }],
      ["usage-insights", { tab: "review", tool: "usage-insights" }],
    ];
    for (const [legacyTab, expected] of legacy) {
      setUrl(`/?tab=${legacyTab}`);
      expect(restoreNavFromUrl()).toEqual(expected);
    }
  });
});

describe("SET_ACTIVE_TAB — embedded tool handling", () => {
  beforeEach(() => {
    installLocalStorage();
    localStorage.clear();
    setUrl("/");
  });

  it("seeds the embedded tool with the page default when no tool is supplied", () => {
    const initial = baseState({ activeTab: "classroom", activeTool: null });
    const next = appReducer(initial, { type: "SET_ACTIVE_TAB", tab: "prep" });
    expect(next.activeTab).toBe("prep");
    expect(next.activeTool).toBe("differentiate");
  });

  it("honors an explicit tool when valid for the target page", () => {
    const initial = baseState({ activeTab: "classroom", activeTool: null });
    const next = appReducer(initial, { type: "SET_ACTIVE_TAB", tab: "prep", tool: "language-tools" });
    expect(next.activeTool).toBe("language-tools");
  });

  it("falls back to the page default when the explicit tool is not hosted there", () => {
    const initial = baseState({ activeTab: "classroom", activeTool: null });
    const next = appReducer(initial, {
      type: "SET_ACTIVE_TAB",
      tab: "ops",
      tool: "differentiate" as unknown as ActiveTool,
    });
    expect(next.activeTool).toBe("log-intervention");
  });

  it("SET_ACTIVE_TOOL ignores tools not hosted by the active page", () => {
    const initial = baseState({ activeTab: "prep", activeTool: "differentiate" });
    const ignored = appReducer(initial, { type: "SET_ACTIVE_TOOL", tool: "log-intervention" });
    expect(ignored.activeTool).toBe("differentiate");
  });
});

describe("resolveNavTarget — call-site shortcut", () => {
  it("maps a legacy tool id to (host tab, tool)", () => {
    expect(resolveNavTarget("tomorrow-plan")).toEqual({ tab: "tomorrow", tool: "tomorrow-plan" });
  });

  it("applies a page default when only a top-level tab is provided", () => {
    expect(resolveNavTarget("review")).toEqual({ tab: "review", tool: "family-message" });
  });

  it("clears the tool when the caller explicitly passes null", () => {
    expect(resolveNavTarget("today", null)).toEqual({ tab: "today", tool: null });
  });
});

describe("type-guard helpers", () => {
  it("isActiveTab / isActiveTool split panel-id strings correctly", () => {
    expect(isActiveTab("classroom")).toBe(true);
    expect(isActiveTab("today")).toBe(true);
    expect(isActiveTab("tomorrow-plan")).toBe(false);
    expect(isActiveTool("tomorrow-plan")).toBe(true);
    expect(isActiveTool("classroom")).toBe(false);
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
