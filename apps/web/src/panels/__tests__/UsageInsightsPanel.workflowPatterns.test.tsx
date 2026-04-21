/**
 * UsageInsightsPanel.workflowPatterns.test.tsx — guards the decision (made
 * during the 2026-04-21 polish pass) to hide the secondary ordered-list
 * rendering of `common_flows` when every flow is a single panel step.
 *
 * The WorkflowFlowStrip already surfaces single-step flows as visual chips;
 * the <ol> duplicated the same information. For multi-step flows, the
 * arrow-joined sequence adds genuine info, so the list must still render.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AppContext, { type AppContextValue } from "../../AppContext";

const mocks = vi.hoisted(() => ({
  fetchFeedbackSummary: vi.fn(),
  fetchSessionSummary: vi.fn(),
}));

vi.mock("../../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api")>();
  return {
    ...actual,
    fetchFeedbackSummary: mocks.fetchFeedbackSummary,
    fetchSessionSummary: mocks.fetchSessionSummary,
  };
});

// Stub the flow strip so we can assert presence independently of the list.
vi.mock("../../components/DataVisualizations", () => ({
  WorkflowFlowStrip: () => <div data-testid="workflow-flow-strip" />,
}));

import UsageInsightsPanel from "../UsageInsightsPanel";

function makeCtx(): AppContextValue {
  return {
    classrooms: [
      {
        classroom_id: "demo",
        grade_band: "3-4",
        subject_focus: "cross_curricular",
        classroom_notes: [],
        students: [],
        is_demo: true,
      },
    ],
    activeClassroom: "demo",
    activeTab: "usage-insights",
    setActiveClassroom: vi.fn(),
    setActiveTab: vi.fn(),
    profile: {
      classroom_id: "demo",
      grade_band: "3-4",
      subject_focus: "cross_curricular",
      classroom_notes: [],
      students: [],
      is_demo: true,
    },
    students: [],
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

const emptyFeedback = {
  total: 0,
  by_panel: {},
  by_week: [],
  top_comments: [],
};

describe("UsageInsightsPanel common_flows rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hides the ordered-list duplicate when every common flow is a single step", async () => {
    mocks.fetchFeedbackSummary.mockResolvedValue(emptyFeedback);
    mocks.fetchSessionSummary.mockResolvedValue({
      total_sessions: 3,
      avg_duration_minutes: 0,
      common_flows: [
        { sequence: ["today"], count: 1 },
        { sequence: ["tomorrow-plan"], count: 1 },
        { sequence: ["family-message"], count: 1 },
      ],
      panel_time_distribution: {},
      generations_per_session: 0,
    });

    render(
      <AppContext.Provider value={makeCtx()}>
        <UsageInsightsPanel />
      </AppContext.Provider>,
    );

    // Flow strip (the keeper) renders.
    await waitFor(() => {
      expect(screen.getByTestId("workflow-flow-strip")).toBeInTheDocument();
    });

    // The suppressed duplicate <ol> would have list items with the
    // "(1x)" count suffix — assert it's not present.
    expect(document.querySelector(".usage-insights-flow-list")).toBeNull();
    expect(screen.queryByText(/\(1x\)/)).not.toBeInTheDocument();
  });

  it("renders the ordered-list when at least one common flow is multi-step", async () => {
    mocks.fetchFeedbackSummary.mockResolvedValue(emptyFeedback);
    mocks.fetchSessionSummary.mockResolvedValue({
      total_sessions: 4,
      avg_duration_minutes: 0,
      common_flows: [
        // Mix of single- and multi-step flows: multi-step wins, ol renders.
        { sequence: ["today"], count: 1 },
        { sequence: ["today", "differentiate", "tomorrow-plan"], count: 2 },
      ],
      panel_time_distribution: {},
      generations_per_session: 0,
    });

    render(
      <AppContext.Provider value={makeCtx()}>
        <UsageInsightsPanel />
      </AppContext.Provider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("workflow-flow-strip")).toBeInTheDocument();
    });
    expect(document.querySelector(".usage-insights-flow-list")).not.toBeNull();
    // The multi-step entry renders its arrow-joined sequence.
    expect(
      screen.getByText(/Today\s*→\s*Differentiate\s*→\s*Tomorrow Plan/),
    ).toBeInTheDocument();
  });

  it("renders the ordered-list when any single flow has more than one step", async () => {
    mocks.fetchFeedbackSummary.mockResolvedValue(emptyFeedback);
    mocks.fetchSessionSummary.mockResolvedValue({
      total_sessions: 1,
      avg_duration_minutes: 0,
      common_flows: [
        { sequence: ["log-intervention", "tomorrow-plan"], count: 1 },
      ],
      panel_time_distribution: {},
      generations_per_session: 0,
    });

    render(
      <AppContext.Provider value={makeCtx()}>
        <UsageInsightsPanel />
      </AppContext.Provider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("workflow-flow-strip")).toBeInTheDocument();
    });
    expect(document.querySelector(".usage-insights-flow-list")).not.toBeNull();
    expect(
      screen.getByText(/Log Intervention\s*→\s*Tomorrow Plan/),
    ).toBeInTheDocument();
  });
});
