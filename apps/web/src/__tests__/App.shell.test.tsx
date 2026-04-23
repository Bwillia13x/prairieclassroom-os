import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  useSessionContext: () => ({
    recordPanelView: vi.fn(),
    recordPanelVisit: vi.fn(),
    recordGeneration: vi.fn(),
  }),
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

function mockPanelScrollState(
  element: HTMLElement,
  options: {
    visibleScrollTop: number;
    hiddenScrollTop?: number;
    scrollHeight?: number;
    clientHeight?: number;
    overflowY?: "auto" | "visible";
  },
) {
  let currentScrollTop = options.visibleScrollTop;
  const hiddenScrollTop = options.hiddenScrollTop ?? options.visibleScrollTop;

  if (options.overflowY) {
    element.style.overflowY = options.overflowY;
  }

  Object.defineProperty(element, "scrollHeight", {
    configurable: true,
    get: () => options.scrollHeight ?? 1600,
  });
  Object.defineProperty(element, "clientHeight", {
    configurable: true,
    get: () => options.clientHeight ?? 400,
  });
  Object.defineProperty(element, "scrollTop", {
    configurable: true,
    get: () => (element.hasAttribute("hidden") ? hiddenScrollTop : currentScrollTop),
    set: (value: number) => {
      currentScrollTop = value;
    },
  });

  return {
    read: () => currentScrollTop,
  };
}

function mockContainerScrollState(element: HTMLElement, scrollTop: number) {
  let currentScrollTop = scrollTop;

  Object.defineProperty(element, "scrollTop", {
    configurable: true,
    get: () => currentScrollTop,
    set: (value: number) => {
      currentScrollTop = value;
    },
  });

  return {
    read: () => currentScrollTop,
  };
}

interface RenderShellOptions {
  profile?: ClassroomProfile;
  debtCounts?: Record<string, number>;
  debtItems?: Array<{ category: string; student_refs: string[]; age_days: number }>;
}

async function renderShellWithDemo(options: RenderShellOptions | ClassroomProfile = {}) {
  // Backwards-compatible: callers may pass a ClassroomProfile directly.
  const opts: RenderShellOptions =
    options && typeof options === "object" && "classroom_id" in options
      ? { profile: options as ClassroomProfile }
      : (options as RenderShellOptions);
  const profile = opts.profile ?? makeDemoClassroom();
  mockedListClassrooms.mockResolvedValue([profile]);
  if (opts.debtCounts) {
    mockedFetchTodaySnapshot.mockResolvedValue({
      debt_register: {
        register_id: "test-register",
        classroom_id: profile.classroom_id,
        items: opts.debtItems ?? [],
        item_count_by_category: opts.debtCounts,
        generated_at: new Date().toISOString(),
        schema_version: "1.0.0",
      },
      latest_plan: null,
      latest_forecast: null,
      student_count: 0,
      last_activity_at: null,
    } as never);
  } else {
    mockedFetchTodaySnapshot.mockRejectedValue(new Error("snapshot disabled in shell test"));
  }
  const utils = render(<App />);
  await waitFor(() => {
    expect(screen.getByRole("button", { name: /active classroom/i })).toBeTruthy();
  });
  if (opts.debtCounts) {
    // Wait for the SET_DEBT_REGISTER dispatch to land after fetchTodaySnapshot resolves.
    await waitFor(() => {
      expect(mockedFetchTodaySnapshot).toHaveBeenCalled();
    });
    // Yield once more to let the .then() handler dispatch.
    await act(async () => {
      await Promise.resolve();
    });
  }
  return utils;
}

describe("App shell — classroom pill trigger", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", makeStorageMock());
    vi.stubGlobal("sessionStorage", makeStorageMock());
    window.history.replaceState({}, "", "/");
    // jsdom does not implement scrollIntoView; App's tab-change effect relies on it.
    Element.prototype.scrollIntoView = vi.fn();
    // jsdom does not implement Element.scrollTo; OPS sub-tab scroll-into-view path uses it.
    (Element.prototype as { scrollTo?: unknown }).scrollTo = vi.fn();
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

  it("renders the LOG INTERVENTION badge in the corner with alert tone", async () => {
    await renderShellWithDemo({ debtCounts: { stale_followup: 8 } });
    // Switch to OPS group so the sub-tab is in the DOM
    fireEvent.click(screen.getByTestId("shell-nav-group-ops"));
    const tab = await screen.findByRole("tab", { name: /Log Intervention/i });
    const badge = tab.querySelector(".shell-nav__badge");
    expect(badge).not.toBeNull();
    expect(badge?.classList.contains("shell-nav__badge--alert")).toBe(true);
  });

  it("renders the actions divider as a real element between role pill and utilities", async () => {
    await renderShellWithDemo();
    const divider = document.querySelector(".shell-bar__divider");
    expect(divider).not.toBeNull();
    expect(divider?.previousElementSibling?.classList.contains("role-pill-anchor")).toBe(true);
  });

  it("feeds Today debt into the command palette for per-student actions", async () => {
    await renderShellWithDemo({
      debtCounts: { stale_followup: 1, unapproved_message: 1 },
      debtItems: [
        { category: "stale_followup", student_refs: ["Brody"], age_days: 5 },
        { category: "unapproved_message", student_refs: ["Amira"], age_days: 1 },
      ],
    });

    fireEvent.click(screen.getByRole("button", { name: /open command palette/i }));

    expect(await screen.findByText("Log follow-up for Brody")).toBeInTheDocument();
    expect(screen.getByText("Draft family message for Amira")).toBeInTheDocument();
  });

  it("keeps the global Action Atlas out of the Today first-open flow", async () => {
    await renderShellWithDemo({
      debtCounts: { stale_followup: 1 },
      debtItems: [
        { category: "stale_followup", student_refs: ["Brody"], age_days: 5 },
      ],
    });

    expect(screen.queryByRole("region", { name: /action atlas/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("shell-nav-group-prep"));

    expect(await screen.findByRole("region", { name: /action atlas/i })).toBeInTheDocument();
  });

  it("saves the current panel scroll before the previous tab is hidden", async () => {
    await renderShellWithDemo();

    const todayPanel = document.querySelector(
      '.app-main > [role="tabpanel"][data-tab="today"]',
    ) as HTMLElement | null;
    expect(todayPanel).toBeTruthy();

    const scrollState = mockPanelScrollState(todayPanel!, {
      visibleScrollTop: 321,
      hiddenScrollTop: 12,
      overflowY: "auto",
    });

    fireEvent.click(screen.getByTestId("shell-nav-group-prep"));

    await waitFor(() => {
      expect(sessionStorage.getItem("prairie-scroll-today")).toBe("321");
    });

    fireEvent.click(screen.getByTestId("shell-nav-group-today"));

    await waitFor(() => {
      expect(scrollState.read()).toBe(321);
    });
  });

  it("uses app-main as the scroll container when panels relinquish scrolling", async () => {
    await renderShellWithDemo();

    const todayPanel = document.querySelector(
      '.app-main > [role="tabpanel"][data-tab="today"]',
    ) as HTMLElement | null;
    const appMain = document.querySelector(".app-main") as HTMLElement | null;
    expect(todayPanel).toBeTruthy();
    expect(appMain).toBeTruthy();

    mockPanelScrollState(todayPanel!, {
      visibleScrollTop: 14,
      hiddenScrollTop: 3,
      overflowY: "visible",
    });
    const mainScrollState = mockContainerScrollState(appMain!, 77);

    fireEvent.click(screen.getByTestId("shell-nav-group-prep"));

    await waitFor(() => {
      expect(sessionStorage.getItem("prairie-scroll-today")).toBe("77");
    });

    fireEvent.click(screen.getByTestId("shell-nav-group-today"));

    await waitFor(() => {
      expect(mainScrollState.read()).toBe(77);
    });
  });
});
