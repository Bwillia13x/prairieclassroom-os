/**
 * UsageInsightsPanel.summaryRow.test.tsx — verifies the compact review-dashboard
 * summary row renders the four top-level metrics (feedback count, average
 * rating, sessions, generations/session) once both summary endpoints resolve.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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

// Short-circuit the heavy visualization used inside the grid so the test
// focuses on the summary row, not the flow strip internals.
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

describe("UsageInsightsPanel compact summary row", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders feedback count, weighted average rating, sessions, and gen/session once data resolves", async () => {
    mocks.fetchFeedbackSummary.mockResolvedValue({
      total: 12,
      by_panel: {
        differentiate: { count: 7, avg_rating: 4.1, recent_comments: [] },
        "tomorrow-plan": { count: 5, avg_rating: 4.6, recent_comments: [] },
      },
      by_week: [
        { week: "2026-W14", count: 6, avg_rating: 4.0 },
        { week: "2026-W15", count: 6, avg_rating: 4.5 },
      ],
      top_comments: [],
    });
    mocks.fetchSessionSummary.mockResolvedValue({
      total_sessions: 8,
      avg_duration_minutes: 14.2,
      common_flows: [],
      panel_time_distribution: {},
      generations_per_session: 2.3,
    });

    render(
      <AppContext.Provider value={makeCtx()}>
        <UsageInsightsPanel />
      </AppContext.Provider>,
    );

    const row = await screen.findByTestId("usage-summary-row");

    // Feedback total is rendered verbatim; weighted average should be 4.25,
    // which the panel rounds to 4.3 for display.
    expect(within(row).getByText(/^12$/)).toBeInTheDocument();
    expect(within(row).getByText("4.3")).toBeInTheDocument();
    expect(within(row).getByText(/^8$/)).toBeInTheDocument();
    expect(within(row).getByText("2.3")).toBeInTheDocument();

    // Label scaffolding — the four section headings make the row read as a
    // review dashboard strip, not a form.
    await waitFor(() => {
      expect(within(row).getByText(/feedback/i)).toBeInTheDocument();
    });
    expect(within(row).getByText(/avg rating/i)).toBeInTheDocument();
    expect(within(row).getByText(/sessions/i)).toBeInTheDocument();
    expect(within(row).getByText(/gen ?\/ ?session/i)).toBeInTheDocument();
  });

  it("does not render the summary row when both endpoints return without data", async () => {
    mocks.fetchFeedbackSummary.mockRejectedValue(new Error("no data"));
    mocks.fetchSessionSummary.mockRejectedValue(new Error("no data"));

    render(
      <AppContext.Provider value={makeCtx()}>
        <UsageInsightsPanel />
      </AppContext.Provider>,
    );

    // Let the failed promises settle before asserting absence.
    await waitFor(() => {
      expect(mocks.fetchFeedbackSummary).toHaveBeenCalled();
      expect(mocks.fetchSessionSummary).toHaveBeenCalled();
    });

    expect(screen.queryByTestId("usage-summary-row")).not.toBeInTheDocument();
  });
});
