import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi, describe, it, beforeEach, afterEach, expect } from "vitest";
import type { ClassroomProfile } from "../types";

const mockUseSessionContext = vi.hoisted(() => vi.fn(() => ({
  sessionId: "test-session",
  recordPanelView: vi.fn(),
  recordPanelVisit: vi.fn(),
  recordGeneration: vi.fn(),
  recordFeedback: vi.fn(),
})));

vi.mock("../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api")>();
  return {
    ...actual,
    listClassrooms: vi.fn(),
    fetchClassroomProfile: vi.fn(),
    fetchTodaySnapshot: vi.fn(),
    fetchClassroomHealth: vi.fn(),
    fetchStudentSummary: vi.fn(),
    fetchInterventionHistoryForStudent: vi.fn(),
    fetchMessageHistoryForStudent: vi.fn(),
    generateComplexityForecast: vi.fn().mockResolvedValue({}),
  };
});

vi.mock("../hooks/useFeedback", () => ({
  flushFeedbackQueue: vi.fn().mockResolvedValue(undefined),
  useFeedback: () => ({ submit: vi.fn(), flush: vi.fn() }),
}));

vi.mock("../hooks/useSessionContext", () => ({
  flushSessionQueue: vi.fn().mockResolvedValue(undefined),
  useSessionContext: mockUseSessionContext,
}));

vi.mock("../components/CommandPalette", () => ({
  default: ({
    open,
    entries,
  }: {
    open: boolean;
    entries: Array<{ id: string; label: string }>;
  }) => open ? (
    <div role="dialog" aria-label="Command palette">
      {entries.map((entry) => (
        <button key={entry.id} type="button">
          {entry.label}
        </button>
      ))}
    </div>
  ) : null,
}));

import App from "../App";
import { listClassrooms, fetchClassroomProfile, fetchTodaySnapshot } from "../api";

const mockedListClassrooms = vi.mocked(listClassrooms);
const mockedFetchClassroomProfile = vi.mocked(fetchClassroomProfile);
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
    requires_access_code: false,
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

function makeShellTodaySnapshot(
  profile: ClassroomProfile,
  options: Pick<RenderShellOptions, "debtCounts" | "debtItems"> = {},
) {
  return {
    debt_register: {
      register_id: "test-register",
      classroom_id: profile.classroom_id,
      items: (options.debtItems ?? []).map((item, index) => ({
        category: item.category,
        student_refs: item.student_refs,
        description: `${item.category} for ${item.student_refs.join(", ") || "classroom"}`,
        source_record_id: `shell-debt-${index + 1}`,
        age_days: item.age_days,
        suggested_action: "Review in shell test",
      })),
      item_count_by_category: options.debtCounts ?? {},
      generated_at: "2026-04-13T00:00:00.000Z",
      schema_version: "1.0.0",
    },
    latest_plan: null,
    latest_forecast: {
      forecast_id: "shell-test-forecast",
      classroom_id: profile.classroom_id,
      forecast_date: "2026-04-13",
      overall_summary: "Morning routines are stable while the shell test verifies navigation.",
      highest_risk_block: "9:00-9:30",
      schema_version: "1.0.0",
      blocks: [
        {
          time_slot: "9:00-9:30",
          activity: "Morning routines",
          level: "low",
          contributing_factors: [],
          suggested_mitigation: "Confirm coverage",
        },
      ],
      generated_at: "2026-04-13T00:00:00.000Z",
    },
    student_count: profile.students.length,
    student_threads: [],
    last_activity_at: null,
  } as never;
}

async function renderShellWithDemo(options: RenderShellOptions | ClassroomProfile = {}) {
  // Backwards-compatible: callers may pass a ClassroomProfile directly.
  const opts: RenderShellOptions =
    options && typeof options === "object" && "classroom_id" in options
      ? { profile: options as ClassroomProfile }
      : (options as RenderShellOptions);
  const profile = opts.profile ?? makeDemoClassroom();
  mockedListClassrooms.mockResolvedValue([profile]);
  mockedFetchClassroomProfile.mockResolvedValue(profile);
  mockedFetchTodaySnapshot.mockResolvedValue(makeShellTodaySnapshot(profile, opts));
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
    if ((opts.debtCounts.stale_followup ?? 0) > 0) {
      await waitFor(() => {
        expect(screen.getByTestId("shell-nav-group-ops")).toHaveTextContent(
          String(opts.debtCounts?.stale_followup),
        );
      });
    }
  }
  return utils;
}

// App-shell tests mount the full 7-page shell + all panels; under parallel
// load from 190+ test files they can exceed the 5s default. Raise the timeout
// so the heaviest multi-click flows (tab drawer, scroll preservation,
// region scoping) don't flake under CPU contention. Fast in isolation.
describe("App shell — classroom pill trigger", { timeout: 60_000 }, () => {
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
    vi.unstubAllEnvs();
  });

  it("renders a switcher icon (not a lock) on the classroom pill trigger", async () => {
    await renderShellWithDemo();
    const trigger = screen.getByRole("button", { name: /active classroom/i });
    const switcherIcon = trigger.querySelector(".shell-classroom-pill__switcher");
    expect(switcherIcon).not.toBeNull();
    expect(trigger.innerHTML).not.toMatch(/M5\.5 8V5\.9/);
  });

  it("starts in the demo classroom when deployed demo mode is the default", async () => {
    vi.stubEnv("VITE_DEFAULT_DEMO_MODE", "true");
    const protectedClassroom = makeDemoClassroom({
      classroom_id: "classroom-alpha",
      grade_band: "5",
      subject_focus: "science",
      requires_access_code: true,
      is_demo: false,
    });
    const demoClassroom = makeDemoClassroom({ requires_access_code: false });
    mockedListClassrooms.mockResolvedValue([protectedClassroom, demoClassroom]);
    mockedFetchClassroomProfile.mockResolvedValue(demoClassroom);
    mockedFetchTodaySnapshot.mockResolvedValue(makeShellTodaySnapshot(demoClassroom));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /active classroom: grade 3-4 literacy numeracy/i })).toBeInTheDocument();
    });
    expect(window.location.search).toContain("demo=true");
    expect(window.location.search).toContain("classroom=demo-okafor-grade34");
    expect(mockUseSessionContext).toHaveBeenLastCalledWith("demo-okafor-grade34", false);
  });

  it("does not briefly fetch a protected classroom when an explicit demo link carries a stale classroom query", async () => {
    window.history.replaceState({}, "", "/?demo=true&tab=today&classroom=classroom-alpha");
    const protectedClassroom = makeDemoClassroom({
      classroom_id: "classroom-alpha",
      grade_band: "5",
      subject_focus: "science",
      requires_access_code: true,
      is_demo: false,
    });
    const demoClassroom = makeDemoClassroom({ requires_access_code: false });
    mockedListClassrooms.mockResolvedValue([protectedClassroom, demoClassroom]);
    mockedFetchClassroomProfile.mockResolvedValue(demoClassroom);
    mockedFetchTodaySnapshot.mockResolvedValue(makeShellTodaySnapshot(demoClassroom));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /active classroom: grade 3-4 literacy numeracy/i })).toBeInTheDocument();
    });
    expect(mockedFetchTodaySnapshot.mock.calls.map(([classroomId]) => classroomId)).not.toContain("classroom-alpha");
    expect(window.location.search).toContain("demo=true");
    expect(window.location.search).toContain("classroom=demo-okafor-grade34");
  });

  it("does not treat a protected synthetic fixture as the default public demo classroom", async () => {
    window.history.replaceState({}, "", "/?demo=true&tab=today&classroom=classroom-alpha");
    const protectedDemoClassroom = makeDemoClassroom({
      classroom_id: "classroom-alpha",
      grade_band: "5",
      subject_focus: "science",
      requires_access_code: true,
      is_demo: true,
    });
    const demoClassroom = makeDemoClassroom({ requires_access_code: false });
    mockedListClassrooms.mockResolvedValue([protectedDemoClassroom, demoClassroom]);
    mockedFetchClassroomProfile.mockResolvedValue(demoClassroom);
    mockedFetchTodaySnapshot.mockResolvedValue(makeShellTodaySnapshot(demoClassroom));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /active classroom: grade 3-4 literacy numeracy/i })).toBeInTheDocument();
    });
    expect(mockedFetchTodaySnapshot.mock.calls.map(([classroomId]) => classroomId)).not.toContain("classroom-alpha");
    expect(window.location.search).toContain("demo=true");
    expect(window.location.search).toContain("classroom=demo-okafor-grade34");
  });

  it("renders the command-palette trigger with a visible 'Search' label and ⌘K hint", async () => {
    await renderShellWithDemo();
    const btn = screen.getByTestId("shell-search-trigger");
    expect(btn.textContent).toMatch(/search/i);
    expect(btn.textContent).toMatch(/⌘K/);
  });

  it("renders the ⌘K keycap with a class our mobile-hide CSS can target", async () => {
    // Visual hiding at <=600px is enforced by HeaderAction.css; here we just
    // guard against the class being renamed away from the CSS rule's selector.
    await renderShellWithDemo();
    const btn = screen.getByTestId("shell-search-trigger");
    const keycap = btn.querySelector(".header-action__kbd");
    expect(keycap).not.toBeNull();
    expect(keycap?.textContent).toBe("⌘K");
  });

  it("renders the help button as an icon-only `?` control with contextual aria-label", async () => {
    await renderShellWithDemo();
    const btn = screen.getByTestId("shell-help-trigger");
    expect(btn.getAttribute("aria-label")).toMatch(/open onboarding tour|restore panel tip/i);
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

  it("exposes a `title` tooltip on every shell nav tab when the rail is collapsed", async () => {
    localStorage.setItem("prairie:shell-nav-collapsed", "1");
    await renderShellWithDemo();
    const expectedTitles: Record<string, string> = {
      classroom: "Classroom: Room view",
      today: "Today: Do this now",
      tomorrow: "Tomorrow: Plan tomorrow",
      week: "Week: Week map",
      prep: "Prep: Adapt lesson",
      ops: "Ops: Log note",
      review: "Review: Message family",
    };
    for (const [tab, expected] of Object.entries(expectedTitles)) {
      const tabButton = screen.getByTestId(`shell-nav-group-${tab}`);
      expect(tabButton).toHaveAttribute("title", expected);
    }
  });

  it("does not duplicate visible shell nav labels with title tooltips while expanded", async () => {
    await renderShellWithDemo();
    for (const tab of ["classroom", "today", "tomorrow", "week", "prep", "ops", "review"]) {
      expect(screen.getByTestId(`shell-nav-group-${tab}`)).not.toHaveAttribute("title");
    }
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

  it("does not mount a secondary page-section drawer on app workspaces", async () => {
    await renderShellWithDemo();

    const primaryPages = ["classroom", "today", "tomorrow", "week", "prep", "ops", "review"] as const;

    for (const tab of primaryPages) {
      fireEvent.click(screen.getByTestId(`shell-nav-group-${tab}`));
      await waitFor(() => {
        expect(screen.getByTestId(`shell-nav-group-${tab}`)).toHaveAttribute("aria-selected", "true");
      });
      expect(screen.queryByRole("navigation", { name: /sections/i })).not.toBeInTheDocument();
      expect(document.querySelector(".page-anchor-rail")).not.toBeInTheDocument();
    }

    expect(localStorage.getItem("prairie:page-rail-collapsed")).toBeNull();
  });

  it("feeds Today debt into the command palette for per-student actions", async () => {
    await renderShellWithDemo({
      profile: makeDemoClassroom({
        classroom_id: "shell-command-debt-classroom",
        requires_access_code: false,
        is_demo: false,
      }),
      debtCounts: { stale_followup: 1, unapproved_message: 1 },
      debtItems: [
        { category: "stale_followup", student_refs: ["Brody"], age_days: 5 },
        { category: "unapproved_message", student_refs: ["Amira"], age_days: 1 },
      ],
    });

    fireEvent.click(screen.getByTestId("shell-search-trigger"));

    const palette = await screen.findByRole("dialog", { name: /command palette/i }, { timeout: 30_000 });
    expect(
      await within(palette).findByText("Log follow-up for Brody", undefined, { timeout: 5_000 }),
    ).toBeInTheDocument();
    expect(within(palette).getByText("Draft family message for Amira")).toBeInTheDocument();
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

    const queueRegion = await screen.findByRole(
      "region",
      { name: /queued tomorrow plan items/i },
      { timeout: 30_000 },
    );
    fireEvent.click(within(queueRegion).getByRole("button", { name: /tomorrow plan has 1 queued item/i }));
    fireEvent.click(screen.getByRole("button", { name: /review all/i }));

    await waitFor(() => {
      expect(window.location.search).toContain("tab=tomorrow");
      expect(window.location.search).toContain("tool=tomorrow-plan");
    });

    expect(screen.getByTestId("shell-nav-group-tomorrow").getAttribute("aria-selected")).toBe("true");
  });
});
