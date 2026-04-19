import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, beforeEach, afterEach, expect } from "vitest";
import type { ClassroomProfile } from "../types";

vi.mock("../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api")>();
  return {
    ...actual,
    listClassrooms: vi.fn(),
    fetchTodaySnapshot: vi.fn(),
    fetchClassroomHealth: vi.fn(),
    fetchStudentSummary: vi.fn(),
    fetchInterventionHistoryForStudent: vi.fn(),
    fetchMessageHistoryForStudent: vi.fn(),
  };
});

vi.mock("../hooks/useFeedback", () => ({
  flushFeedbackQueue: vi.fn().mockResolvedValue(undefined),
  useFeedback: () => ({ submit: vi.fn(), flush: vi.fn() }),
}));

vi.mock("../hooks/useSessionContext", () => ({
  flushSessionQueue: vi.fn().mockResolvedValue(undefined),
  useSessionContext: () => ({ recordPanelView: vi.fn(), recordGeneration: vi.fn() }),
}));

import App from "../App";
import { listClassrooms, fetchTodaySnapshot } from "../api";

const mockedListClassrooms = vi.mocked(listClassrooms);
const mockedFetchTodaySnapshot = vi.mocked(fetchTodaySnapshot);

function makeStorageMock(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
    key: () => null,
    length: 0,
  };
}

function makeDemoClassroom(overrides: Partial<ClassroomProfile> = {}): ClassroomProfile {
  return {
    classroom_id: "demo-okafor-grade34",
    grade_band: "3-4",
    subject_focus: "literacy_numeracy",
    classroom_notes: [],
    students: [],
    requires_access_code: true,
    is_demo: true,
    ...overrides,
  };
}

async function renderShellWithDemo(profile: ClassroomProfile = makeDemoClassroom()) {
  mockedListClassrooms.mockResolvedValue([profile]);
  mockedFetchTodaySnapshot.mockRejectedValue(new Error("snapshot disabled in shell test"));
  const utils = render(<App />);
  await waitFor(() => {
    expect(screen.getByRole("button", { name: /active classroom/i })).toBeTruthy();
  });
  return utils;
}

describe("App shell — classroom pill trigger", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", makeStorageMock());
    vi.stubGlobal("sessionStorage", makeStorageMock());
    window.history.replaceState({}, "", "/");
    // jsdom does not implement scrollIntoView; App's tab-change effect relies on it.
    Element.prototype.scrollIntoView = vi.fn();
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders a switcher icon (not a lock) on the classroom pill trigger", async () => {
    await renderShellWithDemo();
    const trigger = screen.getByRole("button", { name: /active classroom/i });
    const switcherIcon = trigger.querySelector(".shell-classroom-pill__switcher");
    expect(switcherIcon).not.toBeNull();
    expect(trigger.innerHTML).not.toMatch(/M5\.5 8V5\.9/);
  });

  it("renders the command-palette trigger with a visible 'Jump to' label and ⌘K hint", async () => {
    await renderShellWithDemo();
    const btn = screen.getByRole("button", { name: /open command palette/i });
    expect(btn.textContent).toMatch(/jump to/i);
    expect(btn.textContent).toMatch(/⌘K/);
  });

  it("renders the help button as an icon-only `?` control with contextual aria-label", async () => {
    await renderShellWithDemo();
    const btn = screen.getByRole("button", { name: /open onboarding tour|restore panel tip/i });
    expect(btn.classList.contains("app-help-btn")).toBe(true);
    expect(btn.textContent?.trim()).toBe("?");
  });
});
