import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    // jsdom does not implement matchMedia; useAmbientCursorGlow reads it.
    if (!("matchMedia" in window) || typeof window.matchMedia !== "function") {
      vi.stubGlobal("matchMedia", (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
    }
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

  it("rolls stale follow-up debt up to the Ops top-level nav button with alert tone", async () => {
    await renderShellWithDemo({ debtCounts: { stale_followup: 8 } });
    // Seven-view shell: the stale_followup counter now lives on the Ops
    // top-level nav tab; the old secondary sub-tab row is gone.
    const tab = screen.getByTestId("shell-nav-group-ops");
    const badge = tab.querySelector(".shell-nav__badge");
    expect(badge).not.toBeNull();
    expect(badge?.classList.contains("shell-nav__badge--alert")).toBe(true);
    expect(badge?.textContent).toContain("8");
  });

  it("renders the brand unboxed and the primary rail as a full segmented tablist", async () => {
    await renderShellWithDemo();

    const brand = document.querySelector(".shell-brand");
    expect(brand).not.toBeNull();
    expect(brand?.querySelector(".brand-mark__wordmark")?.textContent).toBe("PrairieClassroom");
    expect(brand?.querySelector(".brand-mark__badge")?.textContent).toBe("OS");
    expect(brand?.querySelector("button, [role='button']")).toBeNull();

    const rail = screen.getByRole("tablist", { name: /primary navigation/i });
    expect(rail.classList.contains("shell-nav__groups")).toBe(true);
    expect(within(rail).getAllByRole("tab")).toHaveLength(7);
    expect(rail.querySelector(".shell-nav__group-indicator")).toBeNull();
    expect(rail.querySelector(".shell-nav__kbd")).toBeNull();
  });

  it("mounts the collapsible page drawer across every main page", async () => {
    await renderShellWithDemo();

    const pages = [
      ["classroom", "Classroom sections", /01.*Command/i],
      ["today", "Today sections", /01.*Command Center/i],
      ["tomorrow", "Tomorrow sections", /01.*Planning Hub/i],
      ["week", "Week sections", /01.*Week Command/i],
      ["prep", "Prep sections", /01.*Prep Command/i],
      ["ops", "Ops sections", /01.*Ops Command/i],
      ["review", "Review sections", /01.*Review Command/i],
    ] as const;

    for (const [tab, label, firstAnchor] of pages) {
      fireEvent.click(screen.getByTestId(`shell-nav-group-${tab}`));
      await waitFor(() => {
        expect(screen.getByRole("navigation", { name: label })).toBeInTheDocument();
      });
      expect(screen.getByRole("link", { name: firstAnchor })).toBeInTheDocument();
    }

    const collapse = screen.getByRole("button", { name: /collapse review sections navigation/i });
    fireEvent.click(collapse);

    expect(screen.getByRole("button", { name: /expand review sections navigation/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(localStorage.getItem("prairie:page-rail-collapsed")).toBe("1");
    expect(screen.queryByRole("link", { name: /01.*Review Command/i })).not.toBeInTheDocument();
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

  it("keeps the global Action Atlas out of the page-owned top-level workspaces", async () => {
    await renderShellWithDemo({
      debtCounts: { stale_followup: 1 },
      debtItems: [
        { category: "stale_followup", student_refs: ["Brody"], age_days: 5 },
      ],
    });

    for (const tab of ["classroom", "today", "tomorrow", "week", "prep", "ops", "review"] as const) {
      fireEvent.click(screen.getByTestId(`shell-nav-group-${tab}`));
      expect(screen.queryByRole("region", { name: /action atlas/i })).not.toBeInTheDocument();
    }
  });

  it("saves the current panel scroll before the previous tab is hidden", async () => {
    window.history.replaceState({}, "", "/?tab=today");
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
    window.history.replaceState({}, "", "/?tab=today");
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

  it("redirects legacy ?tab=<old-panel> links to their new canonical destinations", async () => {
    window.history.replaceState({}, "", "/?tab=tomorrow-plan");
    await renderShellWithDemo();
    await waitFor(() => {
      expect(window.location.search).toContain("tab=tomorrow");
      expect(window.location.search).toContain("tool=tomorrow-plan");
    });
  });

  it("moves queued Tomorrow actions out of the header and into the Tomorrow page", async () => {
    const note = {
      id: "shell-chip-note-1",
      sourcePanel: "differentiate",
      sourceType: "differentiate_material",
      summary: "Queued from shell test",
      createdAt: "2026-04-23T10:00:00Z",
    };
    localStorage.setItem("prairie-tomorrow-notes", JSON.stringify([note]));
    localStorage.setItem("prairie-onboarding-done", "true");

    await renderShellWithDemo();

    const header = document.querySelector(".app-header");
    expect(header?.querySelector(".tomorrow-chip")).toBeNull();

    const tomorrowTab = screen.getByTestId("shell-nav-group-tomorrow");
    expect(within(tomorrowTab).getByText("1")).toBeInTheDocument();

    fireEvent.click(tomorrowTab);
    await waitFor(() => {
      expect(window.location.search).toContain("tab=tomorrow");
    });

    fireEvent.click(screen.getByRole("button", { name: /tomorrow plan has 1 queued item/i }));
    fireEvent.click(screen.getByRole("button", { name: /review all/i }));

    await waitFor(() => {
      expect(window.location.search).toContain("tab=tomorrow");
      expect(window.location.search).toContain("tool=tomorrow-plan");
    });

    expect(screen.getByTestId("shell-nav-group-tomorrow").getAttribute("aria-selected")).toBe("true");
  });
});
