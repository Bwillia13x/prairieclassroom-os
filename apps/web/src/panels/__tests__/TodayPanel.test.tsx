import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, beforeEach, afterEach, expect } from "vitest";
import AppContext, { type AppContextValue } from "../../AppContext";
import TodayPanel from "../TodayPanel";
import type { ClassroomHealth, TodaySnapshot } from "../../types";
import * as TimeSuggestionModule from "../../components/TimeSuggestion";

vi.mock("../../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api")>();
  return {
    ...actual,
    fetchTodaySnapshot: vi.fn(),
    fetchClassroomHealth: vi.fn(),
    fetchStudentSummary: vi.fn(),
    fetchInterventionHistoryForStudent: vi.fn(),
    fetchMessageHistoryForStudent: vi.fn(),
  };
});

import {
  fetchTodaySnapshot,
  fetchClassroomHealth,
  fetchStudentSummary,
  fetchInterventionHistoryForStudent,
  fetchMessageHistoryForStudent,
} from "../../api";

const mockedFetchTodaySnapshot = vi.mocked(fetchTodaySnapshot);
const mockedFetchClassroomHealth = vi.mocked(fetchClassroomHealth);
const mockedFetchStudentSummary = vi.mocked(fetchStudentSummary);
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

function makeAppContext(): AppContextValue {
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
    classroomAccessCodes: {},
    classroomRoles: {},
    activeRole: "teacher" as const,
    setClassroomRole: vi.fn(),
    authPrompt: null,
    showSuccess: vi.fn(),
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
  };
}

function renderTodayPanel(snapshot: TodaySnapshot, health = makeHealth()) {
  mockedFetchTodaySnapshot.mockResolvedValue(snapshot);
  mockedFetchClassroomHealth.mockResolvedValue(health);
  mockedFetchStudentSummary.mockResolvedValue([]);
  mockedFetchInterventionHistoryForStudent.mockResolvedValue([]);
  mockedFetchMessageHistoryForStudent.mockResolvedValue([]);

  const onTabChange = vi.fn();
  const appContext = makeAppContext();
  const user = userEvent.setup();

  render(
    <AppContext.Provider value={appContext}>
      <TodayPanel onTabChange={onTabChange} />
    </AppContext.Provider>,
  );

  return { onTabChange, user };
}

describe("TodayPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the populated triage flow and uses family message as the primary action", async () => {
    const { onTabChange, user } = renderTodayPanel(makeSnapshot());

    expect(await screen.findByText("Needs Attention Now")).toBeInTheDocument();
    expect(screen.getByText("4 actions waiting")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Family Message" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open Family Message" }));
    expect(onTabChange).toHaveBeenCalledWith("family-message");
  });

  it("shows the slim time suggestion when the queue is clear", async () => {
    const suggestionSpy = vi.spyOn(TimeSuggestionModule, "getSuggestion").mockReturnValue({
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

    expect(await screen.findByText("Fresh start")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Build Tomorrow Plan" })).toBeInTheDocument();
  });

  it("suppresses the time suggestion when it duplicates the primary triage action", async () => {
    const suggestionSpy = vi.spyOn(TimeSuggestionModule, "getSuggestion").mockReturnValue({
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

  it("opens the student drawer from the triage chips", async () => {
    const { user } = renderTodayPanel(makeSnapshot());

    expect(await screen.findByText("Students to check first")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Amira" }));

    expect(await screen.findByRole("dialog", { name: /Amira/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(mockedFetchInterventionHistoryForStudent).toHaveBeenCalledWith("demo-classroom", "Amira", 10, expect.any(AbortSignal));
    });
  });

  it("opens the debt drawer from a triage row", async () => {
    const { user } = renderTodayPanel(makeSnapshot());

    expect(await screen.findByRole("button", { name: /stale follow-ups/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /stale follow-ups/i }));

    expect(await screen.findByRole("dialog", { name: /stale followup/i })).toBeInTheDocument();
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

    const healthSkeleton = screen.getByRole("status", { name: /loading health/i });
    expect(healthSkeleton).toBeInTheDocument();
    expect(healthSkeleton).toHaveAttribute("aria-busy", "true");

    expect(
      screen.queryByLabelText("Loading dashboard"),
    ).not.toBeInTheDocument();
  });

  it("renders the visualization strip after studentSummaries arrives even if health is still pending", async () => {
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

    await waitFor(() => {
      expect(
        screen.getByRole("status", { name: /loading health/i }),
      ).toBeInTheDocument();
    });
    expect(
      await screen.findByText(/student priority/i),
    ).toBeInTheDocument();
  });

  it("renders a 'Classroom pulse' section wrapping the grid", async () => {
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
      screen.getByRole("heading", { name: /classroom pulse/i }),
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
});
