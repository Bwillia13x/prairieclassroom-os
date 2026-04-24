/**
 * SupportPatternsPanel.actionBar.test.tsx — smoke tests for OutputActionBar wiring.
 * Verifies: action bar renders with result present; absent without result.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppContext, { type AppContextValue } from "../../AppContext";
import React from "react";

const MOCK_REPORT = {
  report_id: "rpt-1",
  classroom_id: "cls-1",
  student_filter: null,
  time_window: 14,
  recurring_themes: [{ theme: "Gap", student_refs: ["A"], evidence_count: 2, example_observations: [] }],
  follow_up_gaps: [],
  positive_trends: [],
  suggested_focus: [],
  generated_at: "2026-04-14T10:00:00Z",
  schema_version: "1",
};

// Controlled result state — tests toggle this before each render
let mockResult: typeof MOCK_REPORT | null = MOCK_REPORT;

vi.mock("../../useAsyncAction", () => ({
  useAsyncAction: () => ({ loading: false, error: null, result: mockResult ? { report: mockResult, thinking_summary: null, model_id: "mock", latency_ms: 100 } : null, execute: vi.fn(), reset: vi.fn(), cancel: vi.fn() }),
}));
vi.mock("../../api", () => ({ detectSupportPatterns: vi.fn().mockResolvedValue({}) }));
vi.mock("../../components/PatternReport", () => ({
  PatternReportForm: () => <div data-testid="pattern-form" />,
  PatternReportResult: ({ onPatternSegmentClick }: {
    onPatternSegmentClick?: (payload: {
      axis: string;
      label: string;
      themes: Array<{ theme: string; student_refs: string[]; evidence_count: number; example_observations: string[] }>;
    }) => void;
  }) => (
    <div data-testid="pattern-result">
      <button
        type="button"
        onClick={() =>
          onPatternSegmentClick?.({
            axis: "transition",
            label: "Transitions",
            themes: [
              {
                theme: "Transition routines",
                student_refs: ["Amira"],
                evidence_count: 2,
                example_observations: [],
              },
            ],
          })
        }
      >
        Open pattern segment
      </button>
    </div>
  ),
}));
vi.mock("../../components/ContextualHint", () => ({ default: () => <div /> }));
vi.mock("../../components/ErrorBanner", () => ({ default: () => <div /> }));
vi.mock("../../components/SkeletonLoader", () => ({ default: () => <div /> }));
vi.mock("../../components/OutputFeedback", () => ({ default: () => <div /> }));
vi.mock("../../components/PageIntro", () => ({ default: () => <div /> }));
vi.mock("../../components/WorkspaceLayout", () => ({
  default: ({ rail, canvas }: { rail: React.ReactNode; canvas: React.ReactNode }) => (
    <div><div>{rail}</div><div>{canvas}</div></div>
  ),
}));
vi.mock("../../components/EmptyStateCard", () => ({ default: () => <div /> }));
vi.mock("../../components/ResultBanner", () => ({ default: () => <div /> }));
vi.mock("../../hooks/useFeedback", () => ({ useFeedback: () => ({ submit: vi.fn(), submitted: false }) }));

import SupportPatternsPanel from "../SupportPatternsPanel";

function makeCtx(): AppContextValue {
  return {
    classrooms: [{ classroom_id: "demo", grade_band: "3-4", subject_focus: "cross_curricular", classroom_notes: [], students: [{ alias: "Amira", support_tags: ["transition_routines"] }], is_demo: true }],
    activeClassroom: "demo",
    activeTab: "review",
    activeTool: "support-patterns",
    setActiveClassroom: vi.fn(),
    setActiveTab: vi.fn(),
    profile: { classroom_id: "demo", grade_band: "3-4", subject_focus: "cross_curricular", classroom_notes: [], students: [{ alias: "Amira", support_tags: ["transition_routines"] }], is_demo: true },
    students: [{ alias: "Amira" }],
    classroomAccessCodes: {},
    classroomRoles: {},
    activeRole: "teacher" as const,
    setClassroomRole: vi.fn(),
    authPrompt: null,
    showSuccess: vi.fn(),
    showError: vi.fn(),
    dispatch: vi.fn(),
    streaming: { active: false, phase: "idle", thinkingText: "", partialSections: [], progress: 0, elapsedSeconds: 0 },
    toasts: [],
    featuresSeen: {},
    submitFeedback: vi.fn(),
    showUndo: vi.fn(),
    dismissToast: vi.fn(),
    tomorrowNotes: [],
    appendTomorrowNote: vi.fn(),
    removeTomorrowNote: vi.fn(),
    setActiveTool: vi.fn(),
    messagePrefill: null,
    interventionPrefill: null,
  };
}

describe("SupportPatternsPanel OutputActionBar", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("renders 4-button action bar when result is present", () => {
    mockResult = MOCK_REPORT;
    render(
      <AppContext.Provider value={makeCtx()}>
        <SupportPatternsPanel onFollowupClick={vi.fn()} onInterventionClick={vi.fn()} />
      </AppContext.Provider>,
    );
    expect(screen.getByRole("navigation", { name: "Support patterns output" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save to Tomorrow" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share with EA" })).toBeInTheDocument();
  });

  it("does not render the action bar when result is null", () => {
    mockResult = null;
    render(
      <AppContext.Provider value={makeCtx()}>
        <SupportPatternsPanel onFollowupClick={vi.fn()} onInterventionClick={vi.fn()} />
      </AppContext.Provider>,
    );
    expect(screen.queryByRole("navigation", { name: "Support patterns output" })).not.toBeInTheDocument();
  });

  it("opens the student-tag-group drawer from the pattern radar callback", async () => {
    mockResult = MOCK_REPORT;
    const user = userEvent.setup();

    render(
      <AppContext.Provider value={makeCtx()}>
        <SupportPatternsPanel onFollowupClick={vi.fn()} onInterventionClick={vi.fn()} />
      </AppContext.Provider>,
    );

    await user.click(screen.getByRole("button", { name: /open pattern segment/i }));

    expect(
      screen.getByRole("dialog", { name: /transitions — 1 student/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Amira" })).toBeInTheDocument();
  });
});
