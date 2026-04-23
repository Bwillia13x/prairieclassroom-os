/**
 * TomorrowPlanPanel.nextStep.test.tsx — verifies WorkspaceLayout split-state
 * adoption and the post-result "Open Forecast" NextStepBand wiring.
 *
 * Intentionally does NOT mock WorkspaceLayout so the data-split-state
 * attribute can be asserted.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppContext, { type AppContextValue } from "../../AppContext";

const MOCK_PLAN = {
  plan_id: "plan-2026-04-14",
  classroom_id: "demo-classroom",
  source_artifact_ids: [],
  transition_watchpoints: [],
  support_priorities: [],
  ea_actions: [],
  prep_checklist: [],
  family_followups: [],
  schema_version: "1",
};

type MockResponse =
  | {
      plan: typeof MOCK_PLAN;
      thinking_summary: null;
      pattern_informed: boolean;
      model_id: string;
      latency_ms: number;
    }
  | null;

let mockResult: MockResponse = null;

vi.mock("../../useAsyncAction", () => ({
  useAsyncAction: () => ({
    loading: false,
    error: null,
    result: mockResult,
    execute: vi.fn(),
    reset: vi.fn(),
    cancel: vi.fn(),
  }),
}));

vi.mock("../../api", () => ({
  generateTomorrowPlan: vi.fn().mockResolvedValue({}),
  fetchPlanHistory: vi.fn().mockResolvedValue([]),
}));

// Keep the rendered tree shallow so the assertions target only what we care
// about (WorkspaceLayout wrapper + NextStepBand). WorkspaceLayout itself is
// intentionally unmocked.
vi.mock("../../components/TeacherReflection", () => ({
  default: () => <div data-testid="teacher-reflection" />,
}));
vi.mock("../../components/PlanViewer", () => ({
  default: () => <div data-testid="plan-viewer" />,
}));
vi.mock("../../components/DataVisualizations", () => ({
  PlanStreakCalendar: () => <div />,
  PlanCoverageRadar: () => <div />,
}));
vi.mock("../../components/HistoryDrawer", () => ({
  default: () => <div data-testid="history-drawer" />,
}));
vi.mock("../../components/SkeletonLoader", () => ({ default: () => <div /> }));
vi.mock("../../components/StreamingIndicator", () => ({ default: () => <div /> }));
vi.mock("../../components/PageIntro", () => ({ default: () => <div /> }));
vi.mock("../../components/EmptyStateCard", () => ({ default: () => <div /> }));
vi.mock("../../components/ErrorBanner", () => ({ default: () => <div /> }));
vi.mock("../../components/ResultBanner", () => ({ default: () => <div /> }));
vi.mock("../../components/RetrievalTraceCard", () => ({ default: () => <div /> }));
vi.mock("../../components/MockModeBanner", () => ({ default: () => <div /> }));
vi.mock("../../components/RoleReadOnlyBanner", () => ({ default: () => <div /> }));
vi.mock("../../hooks/useFeedback", () => ({
  useFeedback: () => ({ submit: vi.fn(), submitted: false }),
}));
vi.mock("../../hooks/useHistory", () => ({
  useHistory: () => ({ items: [], loading: false, error: null, refresh: vi.fn() }),
}));
vi.mock("../../hooks/useStreamingRequest", () => ({
  useStreamingRequest: () => ({ execute: vi.fn().mockResolvedValue(null) }),
}));

import TomorrowPlanPanel from "../TomorrowPlanPanel";

function makeCtx(): AppContextValue {
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
    activeTab: "tomorrow",
    activeTool: "tomorrow-plan",
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
    setActiveTool: vi.fn(),
    messagePrefill: null,
    interventionPrefill: null,
  };
}

function renderWithResult(result: MockResponse) {
  mockResult = result;
  const ctx = makeCtx();
  const utils = render(
    <AppContext.Provider value={ctx}>
      <TomorrowPlanPanel onFollowupClick={vi.fn()} onInterventionClick={vi.fn()} />
    </AppContext.Provider>,
  );
  return { ctx, ...utils };
}

describe("TomorrowPlanPanel — WorkspaceLayout split-state & NextStepBand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets data-split-state='input' on the WorkspaceLayout when no plan result is visible", () => {
    const { container } = renderWithResult(null);
    const layout = container.querySelector(".workspace-layout");
    expect(layout).toBeTruthy();
    expect(layout).toHaveAttribute("data-split-state", "input");
  });

  it("sets data-split-state='output' on the WorkspaceLayout when a plan result is visible", () => {
    const { container } = renderWithResult({
      plan: MOCK_PLAN,
      thinking_summary: null,
      pattern_informed: false,
      model_id: "mock",
      latency_ms: 100,
    });
    const layout = container.querySelector(".workspace-layout");
    expect(layout).toHaveAttribute("data-split-state", "output");
  });

  it("renders 'Open Forecast' as the next-best-step after a plan is visible", () => {
    renderWithResult({
      plan: MOCK_PLAN,
      thinking_summary: null,
      pattern_informed: false,
      model_id: "mock",
      latency_ms: 100,
    });
    const band = screen.getByTestId("next-step-band");
    expect(band).toHaveTextContent(/open forecast/i);
  });

  it("navigates to complexity-forecast when the next-step button is clicked", async () => {
    const user = userEvent.setup();
    const { ctx } = renderWithResult({
      plan: MOCK_PLAN,
      thinking_summary: null,
      pattern_informed: false,
      model_id: "mock",
      latency_ms: 100,
    });
    await user.click(
      screen.getByRole("button", { name: /next best step: open forecast/i }),
    );
    expect(ctx.setActiveTab).toHaveBeenCalledWith("complexity-forecast");
  });

  it("does not render the NextStepBand when no plan result is visible", () => {
    renderWithResult(null);
    expect(screen.queryByTestId("next-step-band")).not.toBeInTheDocument();
  });
});
