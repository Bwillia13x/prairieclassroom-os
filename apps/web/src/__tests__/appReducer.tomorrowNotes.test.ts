import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { appReducer, createInitialState } from "../appReducer";
import type { TomorrowNote } from "../types";

// Provide a localStorage stub for the node test environment
function makeLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
}

const localStorageMock = makeLocalStorageMock();

beforeAll(() => {
  vi.stubGlobal("localStorage", localStorageMock);
});

const SAMPLE_NOTE: TomorrowNote = {
  id: "note-1",
  sourcePanel: "differentiate",
  sourceType: "differentiate_material",
  summary: "Variants for Lesson 3.2",
  createdAt: "2026-04-14T10:00:00Z",
};

describe("appReducer tomorrowNotes", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("fresh state has empty tomorrowNotes", () => {
    const state = createInitialState();
    expect(state.tomorrowNotes).toEqual([]);
  });

  it("APPEND_TOMORROW_NOTE pushes the note onto tomorrowNotes", () => {
    const initial = createInitialState();
    const next = appReducer(initial, { type: "APPEND_TOMORROW_NOTE", note: SAMPLE_NOTE });
    expect(next.tomorrowNotes).toHaveLength(1);
    expect(next.tomorrowNotes[0]).toEqual(SAMPLE_NOTE);
  });

  it("two APPEND_TOMORROW_NOTE actions preserve order", () => {
    const initial = createInitialState();
    const note2: TomorrowNote = { ...SAMPLE_NOTE, id: "note-2", summary: "Second note" };
    const after1 = appReducer(initial, { type: "APPEND_TOMORROW_NOTE", note: SAMPLE_NOTE });
    const after2 = appReducer(after1, { type: "APPEND_TOMORROW_NOTE", note: note2 });
    expect(after2.tomorrowNotes).toHaveLength(2);
    expect(after2.tomorrowNotes[0].id).toBe("note-1");
    expect(after2.tomorrowNotes[1].id).toBe("note-2");
  });

  it("CLEAR_TOMORROW_NOTES empties the array", () => {
    const initial = createInitialState();
    const withNote = appReducer(initial, { type: "APPEND_TOMORROW_NOTE", note: SAMPLE_NOTE });
    const cleared = appReducer(withNote, { type: "CLEAR_TOMORROW_NOTES" });
    expect(cleared.tomorrowNotes).toEqual([]);
  });

  it("APPEND_TOMORROW_NOTE persists to localStorage", () => {
    const setItemSpy = vi.spyOn(localStorageMock, "setItem");
    const initial = createInitialState();
    appReducer(initial, { type: "APPEND_TOMORROW_NOTE", note: SAMPLE_NOTE });
    expect(setItemSpy).toHaveBeenCalledWith(
      "prairie-tomorrow-notes",
      expect.stringContaining("note-1"),
    );
    const storedCall = setItemSpy.mock.calls.find((c) => c[0] === "prairie-tomorrow-notes");
    expect(storedCall).toBeDefined();
    const parsed = JSON.parse(storedCall![1]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe("note-1");
  });
});
