// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { getCompleted, toggle, reset } from "../prepChecklistStore";

describe("prepChecklistStore", () => {
  beforeEach(() => window.localStorage.clear());

  it("toggles membership and persists", () => {
    toggle("demo-class", "2026-04-18", "Set out visual timer");
    expect(getCompleted("demo-class", "2026-04-18")).toEqual(
      new Set(["Set out visual timer"]),
    );
    toggle("demo-class", "2026-04-18", "Set out visual timer");
    expect(getCompleted("demo-class", "2026-04-18")).toEqual(new Set());
  });

  it("scopes state to classroom+date", () => {
    toggle("demo-class", "2026-04-18", "Item A");
    expect(getCompleted("demo-class", "2026-04-19").size).toBe(0);
    expect(getCompleted("other-class", "2026-04-18").size).toBe(0);
  });

  it("reset clears the scope", () => {
    toggle("demo-class", "2026-04-18", "Item A");
    toggle("demo-class", "2026-04-18", "Item B");
    reset("demo-class", "2026-04-18");
    expect(getCompleted("demo-class", "2026-04-18").size).toBe(0);
  });

  it("survives corrupt localStorage payloads", () => {
    window.localStorage.setItem(
      "prairie-prep-checklist:demo:2026-04-18",
      "not-json",
    );
    expect(getCompleted("demo", "2026-04-18")).toEqual(new Set());
  });
});
