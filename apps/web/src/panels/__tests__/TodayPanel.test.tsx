import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, beforeEach, afterEach, expect } from "vitest";
import AppContext, { type AppContextValue } from "../../AppContext";
import TodayPanel from "../TodayPanel";
import type { ClassroomHealth, InterventionPrefill, StudentThread, TodaySnapshot } from "../../types";
import * as TodayWorkflowModule from "../../utils/todayWorkflow";

vi.mock("../../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api")>();
  return {
    ...actual,
    fetchTodaySnapshot: vi.fn(),
    fetchClassroomHealth: vi.fn(),
    fetchStudentSummary: vi.fn(),
    fetchSessionSummary: vi.fn(),
    fetchInterventionHistoryForStudent: vi.fn(),
    fetchMessageHistoryForStudent: vi.fn(),
  };
});

import {
  fetchTodaySnapshot,
  fetchClassroomHealth,
  fetchStudentSummary,
  fetchSessionSummary,
  fetchInterventionHistoryForStudent,
  fetchMessageHistoryForStudent,
} from "../../api";

const mockedFetchTodaySnapshot = vi.mocked(fetchTodaySnapshot);
const mockedFetchClassroomHealth = vi.mocked(fetchClassroomHealth);
const mockedFetchStudentSummary = vi.mocked(fetchStudentSummary);
const mockedFetchSessionSummary = vi.mocked(fetchSessionSummary);
const mockedFetchInterventionHistoryForStudent = vi.mocked(fetchInterventionHistoryForStudent);
const mockedFetchMessageHistoryForStudent = vi.mocked(fetchMessageHistoryForStudent);

function makeHealth(overrides: Partial<ClassroomHealth> = {}): ClassroomHealth {
  return {
    streak_days: 3,
    plans_last_7: [true, true, false, true, false, true, false],
    messages_approved: 2,
    messages_total: 5,
    trends: {
      debt_total_14d: [8, 7, 6, 5, 5, 4, 3, 3, 4, 5, 4, 3, 2, 2],
      plans_14d: [0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1],
      peak_complexity_14d: [1, 2, 1, 2, 3, 2, 1, 2, 3, 2, 2, 1, 2, 3],
    },
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<TodaySnapshot> = {}): TodaySnapshot {
  return {
    debt_register: {
      register_id: "reg-1",
      classroom_id: "demo-classroom",
      items: [
        {
          category: "unapproved_message",
          student_refs: ["Amira"],
          description: "Draft waiting for approval",
          source_record_id: "msg-1",
          age_days: 1,
          suggested_action: "Approve message",
        },
        {
          category: "stale_followup",
          student_refs: ["Brody"],
          description: "Follow-up still needs logging",
          source_record_id: "int-1",
          age_days: 5,
          suggested_action: "Log follow-up",
        },
        {
          category: "unaddressed_pattern",
          student_refs: ["Farid"],
          description: "Pattern report needs review",
          source_record_id: "pat-1",
          age_days: 3,
          suggested_action: "Review pattern",
        },
        {
          category: "approaching_review",
          student_refs: ["Amira", "Farid"],
          description: "Support review window is approaching",
          source_record_id: "pat-2",
          age_days: 2,
          suggested_action: "Review supports",
        },
      ],
      item_count_by_category: {
        unapproved_message: 1,
        stale_followup: 1,
        unaddressed_pattern: 1,
        approaching_review: 1,
      },
      generated_at: "2026-04-12T15:00:00.000Z",
    } as unknown as TodaySnapshot["debt_register"],
    latest_plan: {
      support_priorities: [
        { student_ref: "Brody", suggested_action: "Use the timer card before lunch" },
        { student_ref: "Amira", suggested_action: "Preview vocabulary before writing" },
        { student_ref: "Farid", suggested_action: "Offer dictation first" },
        { student_ref: "Jae", suggested_action: "Prep an extension menu" },
      ],
      prep_checklist: [
        "Set out the timer card",
        "Print sentence frames",
        "Clip the visual schedule",
        "Brief the EA",
      ],
      family_followups: [
        { student_ref: "Amira", message_type: "praise" },
        { student_ref: "Brody", message_type: "routine_update" },
      ],
      watchpoints: [],
      ea_actions: [],
      created_at: "2026-04-11T16:00:00.000Z",
    } as unknown as TodaySnapshot["latest_plan"],
    latest_forecast: {
      highest_risk_block: "10:00-10:45",
      overall_summary: "The post-assembly math transition is the riskiest point today. Writing should stay manageable with the current supports in place.",
      blocks: [
        {
          time_slot: "9:00-9:45",
          activity: "Literacy",
          level: "medium",
          contributing_factors: ["Transition into writing"],
          suggested_mitigation: "Start with a modelled example.",
        },
        {
          time_slot: "10:00-10:45",
          activity: "Math",
          level: "high",
          contributing_factors: ["Post-assembly re-entry", "Late materials setup"],
          suggested_mitigation: "Stage the first task before students arrive.",
        },
      ],
      generated_at: "2026-04-12T06:45:00.000Z",
    } as unknown as TodaySnapshot["latest_forecast"],
    student_count: 6,
    last_activity_at: "2026-04-12T15:00:00.000Z",
    ...overrides,
  };
}

function makeAppContext(latestTodaySnapshot: TodaySnapshot | null = makeSnapshot()): AppContextValue {
  return {
    classrooms: [],
    activeClassroom: "demo-classroom",
    activeTab: "today",
    setActiveClassroom: vi.fn(),
    setActiveTab: vi.fn(),
    profile: {
      classroom_id: "demo-classroom",
      grade_band: "3-4",
      subject_focus: "cross_curricular",
      classroom_notes: [],
      students: [
        { alias: "Amira" },
        { alias: "Brody" },
        { alias: "Farid" },
      ],
      is_demo: true,
    },
    students: [{ alias: "Amira" }, { alias: "Brody" }, { alias: "Farid" }],
    latestTodaySnapshot,
    classroomAccessCodes: {},
    classroomRoles: {},
    activeRole: "teacher" as const,
    setClassroomRole: vi.fn(),
    authPrompt: null,
    showSuccess: vi.fn(),
    showError: vi.fn(),
    dispatch: vi.fn(),
    streaming: {
      active: false,
      phase: "idle",
      thinkingText: "",
      partialSections: [],
      progress: 0,
      elapsedSeconds: 0,
    },
    toasts: [],
    featuresSeen: {},
    submitFeedback: vi.fn(),
    showUndo: vi.fn(),
    dismissToast: vi.fn(),
    tomorrowNotes: [],
    appendTomorrowNote: vi.fn(),
    removeTomorrowNote: vi.fn(),
    activeTool: null,
    setActiveTool: vi.fn(),
    messagePrefill: null,
    interventionPrefill: null,
  };
}

function makeSessionSummary(overrides: Partial<Awaited<ReturnType<typeof fetchSessionSummary>>> = {}) {
  return {
    total_sessions: 5,
    avg_duration_minutes: 18.2,
    common_flows: [
      { sequence: ["today", "log-intervention", "tomorrow-plan"], count: 2 },
    ],
    panel_time_distribution: {
      today: 0.4,
      "log-intervention": 0.3,
      "tomorrow-plan": 0.3,
    },
    generations_per_session: 1.4,
    today_workflow_nudge: null,
    ...overrides,
  };
}

function renderTodayPanel(
  snapshot: TodaySnapshot,
  health = makeHealth(),
  sessionSummary = makeSessionSummary(),
  props: { onInterventionPrefill?: (prefill: InterventionPrefill) => void } = {},
) {
  mockedFetchTodaySnapshot.mockResolvedValue(snapshot);
  mockedFetchClassroomHealth.mockResolvedValue(health);
  mockedFetchStudentSummary.mockResolvedValue([]);
  mockedFetchSessionSummary.mockResolvedValue(sessionSummary);
  mockedFetchInterventionHistoryForStudent.mockResolvedValue([]);
  mockedFetchMessageHistoryForStudent.mockResolvedValue([]);

  const onTabChange = vi.fn();
  const onInterventionPrefill = props.onInterventionPrefill ?? vi.fn();
  const appContext = makeAppContext(snapshot);
  const user = userEvent.setup();

  render(
    <AppContext.Provider value={appContext}>
      <TodayPanel onTabChange={onTabChange} onInterventionPrefill={onInterventionPrefill} />
    </AppContext.Provider>,
  );

  return { onTabChange, onInterventionPrefill, user };
}

describe("TodayPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("auto-opens the day-detail collapse when an in-page anchor link inside the detail is clicked", async () => {
    const { user } = renderTodayPanel(makeSnapshot());
    await screen.findByText("Needs Attention Now");

    // Day-detail starts collapsed — toggle reads "Show day detail".
    const toggle = screen.getByRole("button", { name: /show day detail/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    // Simulate a PageAnchorRail click by dispatching a click on an
    // anchor link whose href targets one of the inner sections. The
    // delegated listener on TodayPanel should flip detailOpen to true.
    const link = document.createElement("a");
    link.setAttribute("href", "#carry-forward");
    document.body.appendChild(link);
    await user.click(link);
    document.body.removeChild(link);

    expect(
      screen.getByRole("button", { name: /hide day detail/i }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("auto-opens the day-detail collapse when the URL hash deep-links to an inner anchor", async () => {
    const originalHash = window.location.hash;
    window.history.replaceState(null, "", "#day-arc");
    try {
      renderTodayPanel(makeSnapshot());
      await screen.findByText("Needs Attention Now");
      // Initial mount runs the hash check synchronously, so the toggle
      // should already report the open state.
      expect(
        screen.getByRole("button", { name: /hide day detail/i }),
      ).toHaveAttribute("aria-expanded", "true");
    } finally {
      window.history.replaceState(null, "", originalHash || " ");
    }
  });

  it("renders the populated triage flow and uses family message as the primary action", async () => {
    const { onTabChange, onInterventionPrefill, user } = renderTodayPanel(makeSnapshot());

    expect(await screen.findByText("Needs Attention Now")).toBeInTheDocument();
    expect(screen.getByText("4 open items")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Draft Amira message" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Draft Amira message" }));
    expect(onTabChange).toHaveBeenCalledWith("family-message");
    expect(onInterventionPrefill).not.toHaveBeenCalled();
  });

  it("prefills Ops intervention from the Today primary CTA without writing teacher evidence", async () => {
    const snapshot = makeSnapshot({
      debt_register: {
        ...makeSnapshot().debt_register,
        items: [
          {
            category: "stale_followup",
            student_refs: ["Brody"],
            description: "Follow-up still needs logging",
            source_record_id: "int-1",
            age_days: 5,
            suggested_action: "Log follow-up",
          },
        ],
        item_count_by_category: {
          unapproved_message: 0,
          stale_followup: 1,
          unaddressed_pattern: 0,
          approaching_review: 0,
        },
      } as TodaySnapshot["debt_register"],
    });
    const onInterventionPrefill = vi.fn();
    const { onTabChange, user } = renderTodayPanel(
      snapshot,
      makeHealth(),
      makeSessionSummary(),
      { onInterventionPrefill },
    );

    expect(await screen.findByRole("button", { name: "Log Brody note" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Log Brody note" }));

    expect(onInterventionPrefill).toHaveBeenCalledWith({
      student_ref: "Brody",
      suggested_action: "Log follow-up",
      reason: "Follow-up still needs logging",
    });
    expect(Object.keys(onInterventionPrefill.mock.calls[0][0])).toEqual([
      "student_ref",
      "suggested_action",
      "reason",
    ]);
    expect(onTabChange).not.toHaveBeenCalled();
  });

  it("renders the weekly workflow nudge and jumps to the suggested panel", async () => {
    const { onTabChange, user } = renderTodayPanel(
      makeSnapshot(),
      makeHealth(),
      makeSessionSummary({
        today_workflow_nudge: {
          week: "2026-W16",
          is_current_week: true,
          sequence: ["today", "log-intervention", "tomorrow-plan"],
          count: 2,
        },
      }),
    );

    const nudge = await screen.findByTestId("today-workflow-nudge");
    expect(within(nudge).getByText(/most-used workflow this week/i)).toBeInTheDocument();
    expect(within(nudge).getByText(/Today → Log Intervention → Tomorrow Plan/)).toBeInTheDocument();

    await user.click(within(nudge).getByRole("button", { name: /jump to log intervention/i }));
    expect(onTabChange).toHaveBeenCalledWith("log-intervention");
  });

  it("shows the slim time suggestion when the queue is clear", async () => {
    const suggestionSpy = vi.spyOn(TodayWorkflowModule, "getTodayContextualSuggestion").mockReturnValue({
      kind: "morning",
      label: "Good morning",
      message: "Time to prep for today.",
      primaryAction: { label: "Differentiate", tab: "differentiate" },
      secondaryAction: { label: "EA Briefing", tab: "ea-briefing" },
    });

    renderTodayPanel(
      makeSnapshot({
        debt_register: {
          ...makeSnapshot().debt_register,
          items: [],
          item_count_by_category: {
            unapproved_message: 0,
            stale_followup: 0,
            unaddressed_pattern: 0,
            approaching_review: 0,
          },
        },
      }),
    );

    expect(await screen.findByText("No pending actions — you're caught up.")).toBeInTheDocument();
    expect(screen.getByText("Good morning")).toBeInTheDocument();
    suggestionSpy.mockRestore();
  });

  it("shows the empty start state when there is no plan or forecast yet", async () => {
    renderTodayPanel(
      makeSnapshot({
        debt_register: {
          ...makeSnapshot().debt_register,
          items: [],
          item_count_by_category: {
            unapproved_message: 0,
            stale_followup: 0,
            unaddressed_pattern: 0,
            approaching_review: 0,
          },
        },
        latest_plan: null,
        latest_forecast: null,
      }),
    );

    // Workstream G: empty-state CTAs were removed in favor of a quiet
    // minimal cue. The "Build Tomorrow Plan" button now lives only in
    // the day's action surface, not inside the empty canvas.
    expect(
      await screen.findByText(/fresh start/i),
    ).toBeInTheDocument();
  });

  it("suppresses the time suggestion when it duplicates the primary triage action", async () => {
    const suggestionSpy = vi.spyOn(TodayWorkflowModule, "getTodayContextualSuggestion").mockReturnValue({
      kind: "midday",
      label: "Mid-day",
      message: "Log interventions while they're fresh.",
      primaryAction: { label: "Log Intervention", tab: "log-intervention" },
      secondaryAction: { label: "Language Tools", tab: "language-tools" },
    });

    renderTodayPanel(
      makeSnapshot({
        debt_register: {
          ...makeSnapshot().debt_register,
          items: [
            {
              category: "stale_followup",
              student_refs: ["Brody"],
              description: "Follow-up still needs logging",
              source_record_id: "int-1",
              age_days: 5,
              suggested_action: "Log follow-up",
            },
          ],
          item_count_by_category: {
            unapproved_message: 0,
            stale_followup: 1,
            unaddressed_pattern: 0,
            approaching_review: 0,
          },
        },
      }),
    );

    expect(await screen.findByText("Needs Attention Now")).toBeInTheDocument();
    expect(screen.queryByText("Mid-day")).not.toBeInTheDocument();
    expect(screen.queryByText("Log interventions while they're fresh.")).not.toBeInTheDocument();
    suggestionSpy.mockRestore();
  });

  it("opens the student drawer from the hero triage chips", async () => {
    const { user } = renderTodayPanel(makeSnapshot());

    // Hero chip for Amira — rendered inside TodayHero, not the lower PendingActionsCard.
    const heroEl = await screen.findByTestId("today-hero");
    await user.click(within(heroEl).getByRole("button", { name: "Check first: Amira" }));

    expect(await screen.findByRole("dialog", { name: /Amira/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(mockedFetchInterventionHistoryForStudent).toHaveBeenCalledWith("demo-classroom", "Amira", 10, expect.any(AbortSignal));
    });
  });

  it("does not render 'Students to check first' in the lower PendingActionsCard", async () => {
    renderTodayPanel(makeSnapshot());
    await screen.findByText("Needs Attention Now");
    expect(screen.queryByText("Students to check first")).not.toBeInTheDocument();
  });

  it("opens the debt drawer from a triage row", async () => {
    const { user } = renderTodayPanel(makeSnapshot());

    expect(await screen.findByRole("button", { name: /open follow-ups/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /open follow-ups/i }));

    expect(await screen.findByRole("dialog", { name: /open follow-ups/i })).toBeInTheDocument();
    expect(screen.getByText("Follow-up still needs logging")).toBeInTheDocument();
  });

  it("opens the forecast drawer from a risk window block", async () => {
    const { user } = renderTodayPanel(makeSnapshot());

    expect(await screen.findByText("Risk Windows")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /10:00-10:45: Math — high complexity/i }));

    expect(await screen.findByRole("dialog", { name: /10:00-10:45/i })).toBeInTheDocument();
    expect(screen.getByText("Suggested mitigation")).toBeInTheDocument();
  });

  it("renders the snapshot section even while health is still pending", async () => {
    mockedFetchTodaySnapshot.mockResolvedValue(makeSnapshot());
    mockedFetchClassroomHealth.mockImplementation(
      () => new Promise(() => {}),
    );
    mockedFetchStudentSummary.mockResolvedValue([]);
    mockedFetchInterventionHistoryForStudent.mockResolvedValue([]);
    mockedFetchMessageHistoryForStudent.mockResolvedValue([]);

    const appContext = makeAppContext();
    render(
      <AppContext.Provider value={appContext}>
        <TodayPanel onTabChange={vi.fn()} />
      </AppContext.Provider>,
    );

    expect(await screen.findByText("Needs Attention Now")).toBeInTheDocument();

    // The 2026-04-23 reorg moved the planning-health trend into the
    // Classroom page. Today now renders a soft "Need the wider lens?"
    // skeleton while classroom-scope data loads — the loading state is
    // the "Loading planning lenses" skeleton, not the old HealthBar one.
    expect(
      screen.getByRole("status", { name: /loading planning lenses/i }),
    ).toBeInTheDocument();

    expect(
      screen.queryByLabelText("Loading dashboard"),
    ).not.toBeInTheDocument();
  });

  it("keeps same-day signal visible while classroom-scope health is still pending", async () => {
    mockedFetchTodaySnapshot.mockResolvedValue(makeSnapshot());
    mockedFetchClassroomHealth.mockImplementation(
      () => new Promise(() => {}),
    );
    mockedFetchStudentSummary.mockResolvedValue([
      {
        alias: "Amira",
        pending_action_count: 2,
        active_pattern_count: 1,
        pending_message_count: 0,
        last_intervention_days: 3,
        latest_priority_reason: "Pending follow-up",
      },
    ] as never);
    mockedFetchInterventionHistoryForStudent.mockResolvedValue([]);
    mockedFetchMessageHistoryForStudent.mockResolvedValue([]);

    render(
      <AppContext.Provider value={makeAppContext()}>
        <TodayPanel onTabChange={vi.fn()} />
      </AppContext.Provider>,
    );

    // Today keeps its own coverage strip + pending-actions card; the
    // week-level visualizations now live on Classroom/Week pages.
    expect(
      await screen.findByText("Needs Attention Now"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /student priority view/i }),
    ).not.toBeInTheDocument();
  });

  it("renders a 'What to watch next' section wrapping the grid", async () => {
    mockedFetchTodaySnapshot.mockResolvedValue(makeSnapshot());
    mockedFetchClassroomHealth.mockResolvedValue(makeHealth());
    mockedFetchStudentSummary.mockResolvedValue([]);
    mockedFetchInterventionHistoryForStudent.mockResolvedValue([]);
    mockedFetchMessageHistoryForStudent.mockResolvedValue([]);

    const { container } = render(
      <AppContext.Provider value={makeAppContext()}>
        <TodayPanel onTabChange={vi.fn()} />
      </AppContext.Provider>,
    );

    await waitFor(() => {
      expect(container.querySelector(".today-pulse")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", { name: /what to watch next/i }),
    ).toBeInTheDocument();
    const pulseSection = container.querySelector(".today-pulse")!;
    expect(pulseSection.querySelector(".today-grid")).toBeInTheDocument();
  });

  it("renders the TodayHero landmark above the grid", async () => {
    mockedFetchTodaySnapshot.mockResolvedValue(makeSnapshot());
    mockedFetchClassroomHealth.mockResolvedValue(makeHealth());
    mockedFetchStudentSummary.mockResolvedValue([]);
    mockedFetchInterventionHistoryForStudent.mockResolvedValue([]);
    mockedFetchMessageHistoryForStudent.mockResolvedValue([]);

    const { container } = render(
      <AppContext.Provider value={makeAppContext()}>
        <TodayPanel onTabChange={vi.fn()} />
      </AppContext.Provider>,
    );

    await waitFor(() => {
      expect(container.querySelector(".today-hero")).toBeInTheDocument();
    });
    const hero = container.querySelector(".today-hero")!;
    const grid = container.querySelector(".today-grid")!;
    expect(grid).toBeInTheDocument();
    // DOM order: hero must appear before the grid.
    expect(
      hero.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("keeps the Today operational preview visually below the command center", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const cssPath = path.resolve(
      __dirname,
      "..",
      "TodayPanel.css",
    );
    const css = fs.readFileSync(cssPath, "utf8");

    expect(css).toMatch(/\.today-panel #command-center\s*{[^}]*order:\s*1/s);
    expect(css).toMatch(/\.today-panel #today-preview\s*{[^}]*order:\s*2/s);
    expect(css).toMatch(/\.today-panel \.student-coverage__sentinel\s*{[^}]*order:\s*2/s);
  });

  it("renders DayArc before PendingActionsCard in the hero row", async () => {
    mockedFetchTodaySnapshot.mockResolvedValue(makeSnapshot());
    mockedFetchClassroomHealth.mockResolvedValue(makeHealth());
    mockedFetchStudentSummary.mockResolvedValue([]);
    mockedFetchInterventionHistoryForStudent.mockResolvedValue([]);
    mockedFetchMessageHistoryForStudent.mockResolvedValue([]);

    const { container } = render(
      <AppContext.Provider value={makeAppContext()}>
        <TodayPanel onTabChange={vi.fn()} />
      </AppContext.Provider>,
    );

    await waitFor(() => {
      expect(container.querySelector(".today-grid__hero-row")).toBeInTheDocument();
    });
    const heroRow = container.querySelector(".today-grid__hero-row")!;
    const dayArc = heroRow.querySelector(".day-arc");
    const triageCard = heroRow.querySelector(".today-triage-card");
    expect(dayArc).toBeInTheDocument();
    expect(triageCard).toBeInTheDocument();
    // DayArc must appear before PendingActionsCard in DOM order.
    expect(
      dayArc!.compareDocumentPosition(triageCard!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("does not render a secondary page section navigation rail", async () => {
    renderTodayPanel(makeSnapshot());

    await screen.findByText("Needs Attention Now");
    expect(screen.queryByRole("navigation", { name: /today sections/i })).not.toBeInTheDocument();
    expect(document.querySelector(".page-anchor-rail")).not.toBeInTheDocument();
    expect(document.querySelector(".today-panel")).not.toHaveAttribute("data-rail-collapsed");
  });

  it("shows an inline health error without blocking the rest of the dashboard", async () => {
    mockedFetchTodaySnapshot.mockResolvedValue(makeSnapshot());
    mockedFetchClassroomHealth.mockRejectedValue(
      new Error("network down"),
    );
    mockedFetchStudentSummary.mockResolvedValue([]);
    mockedFetchInterventionHistoryForStudent.mockResolvedValue([]);
    mockedFetchMessageHistoryForStudent.mockResolvedValue([]);

    render(
      <AppContext.Provider value={makeAppContext()}>
        <TodayPanel onTabChange={vi.fn()} />
      </AppContext.Provider>,
    );

    expect(await screen.findByText("Needs Attention Now")).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByRole("alert"),
      ).toHaveTextContent(/health summary/i);
    });

    expect(
      screen.queryByText(/could not be loaded/i),
    ).not.toBeInTheDocument();
  });

  it("renders Open Forecast in a dedicated footer row, not inside the peak-block callout (audit #28)", async () => {
    renderTodayPanel(makeSnapshot());
    const footer = await screen.findByTestId("risk-windows-footer");
    const openForecast = within(footer).getByRole("button", {
      name: /open forecast/i,
    });
    expect(openForecast).toBeInTheDocument();
    // The peak-block button must not wrap the Open Forecast CTA.
    const peak = screen.getByRole("button", {
      name: /open peak window details/i,
    });
    expect(peak.contains(openForecast)).toBe(false);
  });

  it("wraps the timeline in a horizontally-scrollable container so it doesn't clip (audit #27)", async () => {
    renderTodayPanel(makeSnapshot());
    await screen.findByTestId("risk-windows-footer");
    // The wrapper class exists; CSS handles the overflow rule.
    const wrappers = document.querySelectorAll(
      ".risk-windows__timeline-scroll",
    );
    expect(wrappers.length).toBeGreaterThan(0);
  });

  it("labels AI-derived sections with a source-tag-ai caption (audit #34)", async () => {
    renderTodayPanel(makeSnapshot());
    // TodayHero freshness strip carries an AI tag.
    const hero = await screen.findByTestId("today-hero");
    expect(within(hero).getByTestId("source-tag-ai")).toBeInTheDocument();
    // Risk Windows (forecast) also carries an AI tag.
    const footer = await screen.findByTestId("risk-windows-footer");
    const riskCard = footer.closest(".risk-windows");
    expect(riskCard).not.toBeNull();
    expect(
      within(riskCard as HTMLElement).getByTestId("source-tag-ai"),
    ).toBeInTheDocument();
  });

  it("labels record-derived sections with a source-tag-record caption (audit #34)", async () => {
    renderTodayPanel(makeSnapshot());
    // Classroom Pulse (PendingActionsCard) is record-derived.
    const pulseHeading = await screen.findByText(/Needs Attention Now/i);
    const pulseCard = pulseHeading.closest(".today-triage-card");
    expect(pulseCard).not.toBeNull();
    expect(
      within(pulseCard as HTMLElement).getByTestId("source-tag-record"),
    ).toBeInTheDocument();
  });

  it("counts only actionable student threads in the Touchpoints 'watching' meta, not the full roster", async () => {
    // Mirrors the demo seed contract: 26 roster entries arrive in
    // student_threads, but only the actionable subset (threads with
    // signal) belongs in the watching count. Strength-only entries
    // must be excluded.
    const makeThread = (overrides: Partial<StudentThread>): StudentThread => ({
      alias: "Anon",
      priority_reason: null,
      last_intervention_days: null,
      pending_action_count: 0,
      pending_message_count: 0,
      active_pattern_count: 0,
      thread_count: 0,
      actions: [],
      ...overrides,
    });
    const threads: StudentThread[] = [
      makeThread({ alias: "Amira", thread_count: 1, pending_action_count: 2 }),
      makeThread({ alias: "Brody", pending_action_count: 1 }),
      makeThread({ alias: "Chantal", active_pattern_count: 1 }),
      makeThread({
        alias: "Daniyal",
        actions: [
          {
            category: "approaching_review",
            label: "Pattern review",
            count: 1,
            target_tab: "support-patterns",
            state: "needs_action",
          },
        ],
      }),
      makeThread({ alias: "Liam" }),    // strength-only
      makeThread({ alias: "Violet" }),  // strength-only
      makeThread({ alias: "Zayn" }),    // strength-only
    ];

    renderTodayPanel(makeSnapshot({ student_threads: threads }));

    const preview = await screen.findByLabelText("Today operational preview");
    // 4 actionable out of 7 total roster threads — must read "4 watching".
    expect(within(preview).getByText("4 watching")).toBeInTheDocument();
    expect(within(preview).queryByText("7 watching")).not.toBeInTheDocument();
  });

  it("hides the Touchpoints 'watching' meta when no thread is actionable", async () => {
    // Strength-only roster (every thread has zero signal across all five
    // actionable fields). The meta should be omitted entirely rather than
    // rendering "0 watching".
    const strengthOnly: StudentThread[] = [
      { alias: "Liam", priority_reason: null, last_intervention_days: null, pending_action_count: 0, pending_message_count: 0, active_pattern_count: 0, thread_count: 0, actions: [] },
      { alias: "Violet", priority_reason: null, last_intervention_days: null, pending_action_count: 0, pending_message_count: 0, active_pattern_count: 0, thread_count: 0, actions: [] },
    ];

    renderTodayPanel(makeSnapshot({ student_threads: strengthOnly }));

    const preview = await screen.findByLabelText("Today operational preview");
    expect(within(preview).queryByText(/\bwatching\b/i)).not.toBeInTheDocument();
  });
});
