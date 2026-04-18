/**
 * TomorrowPlanPanel.actionBar.test.tsx — verifies OutputActionBar is wired into TomorrowPlanPanel.
 * Uses a mocked useAsyncAction to pre-set a result so the action bar renders immediately.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppContext, { type AppContextValue } from "../../AppContext";

const MOCK_PLAN = {
  plan_id: "plan-2026-04-14",
  classroom_id: "demo-classroom",
  source_artifact_ids: [],
  transition_watchpoints: [
    {
      time_or_activity: "Morning entry",
      risk_description: "Jaylen struggles with transitions",
      suggested_mitigation: "Meet Jaylen at the door",
    },
  ],
  support_priorities: [
    {
      student_ref: "Amira",
      reason: "Missed yesterday's math block",
      suggested_action: "Pull-out review during free choice",
    },
  ],
  ea_actions: [
    {
      description: "Support Jaylen during guided reading",
      student_refs: ["Jaylen"],
      timing: "9:15–10:00",
    },
  ],
  prep_checklist: ["Print differentiated worksheets"],
  family_followups: [
    {
      student_ref: "Amira",
      reason: "Parent asked about math progress",
      message_type: "routine_update",
    },
  ],
  schema_version: "1",
};

// Mock useAsyncAction so result is pre-set (no API call needed).
vi.mock("../../useAsyncAction", () => ({
  useAsyncAction: () => ({
    loading: false,
    error: null,
    result: {
      plan: MOCK_PLAN,
      thinking_summary: null,
      pattern_informed: false,
      model_id: "mock",
      latency_ms: 100,
    },
    execute: vi.fn(),
    reset: vi.fn(),
    cancel: vi.fn(),
  }),
}));

// Mock api to avoid network calls
vi.mock("../../api", () => ({
  generateTomorrowPlan: vi.fn().mockResolvedValue({}),
  fetchPlanHistory: vi.fn().mockResolvedValue([]),
}));

// Mock sub-components to reduce render tree complexity
vi.mock("../../components/TeacherReflection", () => ({
  default: () => <div data-testid="teacher-reflection" />,
}));
vi.mock("../../components/PlanViewer", () => ({
  default: () => <div data-testid="plan-viewer" />,
}));
vi.mock("../../components/DataVisualizations", () => ({
  PlanStreakCalendar: () => <div data-testid="plan-streak-calendar" />,
  PlanCoverageRadar: () => <div data-testid="plan-coverage-radar" />,
}));
vi.mock("../../components/SkeletonLoader", () => ({
  default: () => <div data-testid="skeleton-loader" />,
}));
vi.mock("../../components/StreamingIndicator", () => ({
  default: () => <div data-testid="streaming-indicator" />,
}));
vi.mock("../../components/ContextualHint", () => ({
  default: () => <div data-testid="contextual-hint" />,
}));
vi.mock("../../components/OutputFeedback", () => ({
  default: () => <div data-testid="output-feedback" />,
}));
vi.mock("../../components/PageIntro", () => ({
  default: () => <div data-testid="page-intro" />,
}));
vi.mock("../../components/HistoryDrawer", () => ({
  default: () => <div data-testid="history-drawer" />,
}));
vi.mock("../../components/WorkspaceLayout", () => ({
  default: ({ rail, canvas }: { rail: React.ReactNode; canvas: React.ReactNode }) => (
    <div>
      <div data-testid="rail">{rail}</div>
      <div data-testid="canvas">{canvas}</div>
    </div>
  ),
}));
vi.mock("../../components/EmptyStateCard", () => ({
  default: () => <div data-testid="empty-state-card" />,
}));
vi.mock("../../components/EmptyStateIllustration", () => ({
  default: () => <div data-testid="empty-state-illustration" />,
}));
vi.mock("../../components/ErrorBanner", () => ({
  default: () => <div data-testid="error-banner" />,
}));
vi.mock("../../components/ResultBanner", () => ({
  default: () => <div data-testid="result-banner" />,
}));
vi.mock("../../hooks/useFeedback", () => ({
  useFeedback: () => ({ submit: vi.fn(), submitted: false }),
}));
vi.mock("../../hooks/useHistory", () => ({
  useHistory: () => ({ items: [], loading: false, error: null, refresh: vi.fn() }),
}));
vi.mock("../../hooks/useStreamingRequest", () => ({
  useStreamingRequest: () => ({ execute: vi.fn().mockResolvedValue(null) }),
}));

import React from "react";
import TomorrowPlanPanel from "../TomorrowPlanPanel";

function makeAppContext(): AppContextValue {
  return {
    classrooms: [
      {
        classroom_id: "demo-classroom",
        grade_band: "3-4",
        subject_focus: "cross_curricular",
        classroom_notes: [],
        students: [{ alias: "Amira" }],
        is_demo: true,
      },
    ],
    activeClassroom: "demo-classroom",
    activeTab: "tomorrow-plan",
    setActiveClassroom: vi.fn(),
    setActiveTab: vi.fn(),
    profile: {
      classroom_id: "demo-classroom",
      grade_band: "3-4",
      subject_focus: "cross_curricular",
      classroom_notes: [],
      students: [{ alias: "Amira" }],
      is_demo: true,
    },
    students: [{ alias: "Amira" }],
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
  };
}

function renderPanel() {
  const appContext = makeAppContext();
  const user = userEvent.setup();

  render(
    <AppContext.Provider value={appContext}>
      <TomorrowPlanPanel
        onFollowupClick={vi.fn()}
        onInterventionClick={vi.fn()}
      />
    </AppContext.Provider>,
  );

  return { appContext, user };
}

describe("TomorrowPlanPanel OutputActionBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the action bar with 4 action buttons when result is present", () => {
    renderPanel();

    const nav = screen.getByRole("navigation", { name: "Tomorrow plan output" });
    expect(nav).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save to Tomorrow" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share with EA" })).toBeInTheDocument();
  });

  it("Save to Tomorrow button is disabled with aria-disabled", () => {
    renderPanel();

    const saveBtn = screen.getByRole("button", { name: "Save to Tomorrow" });
    expect(saveBtn).toBeDisabled();
    expect(saveBtn).toHaveAttribute("aria-disabled", "true");
  });

  it("clicking Copy triggers clipboard with plain text serialization", async () => {
    const { appContext, user } = renderPanel();

    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    await user.click(screen.getByRole("button", { name: "Copy" }));

    expect(mockWriteText).toHaveBeenCalledWith(
      expect.stringContaining("# Tomorrow's Plan"),
    );
    expect(appContext.showSuccess).toHaveBeenCalledWith("Plan copied");
  });

  it("clicking Share with EA triggers clipboard with EA briefing summary", async () => {
    const { appContext, user } = renderPanel();

    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    await user.click(screen.getByRole("button", { name: "Share with EA" }));

    expect(mockWriteText).toHaveBeenCalledWith(
      expect.stringContaining("Tomorrow's EA actions"),
    );
    // EA briefing must NOT be the full plan text
    expect(mockWriteText).not.toHaveBeenCalledWith(
      expect.stringContaining("# Tomorrow's Plan"),
    );
    expect(appContext.showSuccess).toHaveBeenCalledWith(
      "EA summary copied — paste into Slack/email",
    );
  });
});
