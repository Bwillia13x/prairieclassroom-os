/**
 * ForecastPanel.nextStep.test.tsx — verifies WorkspaceLayout split-state
 * adoption and the post-result "Build EA Briefing" NextStepBand wiring.
 *
 * Intentionally does NOT mock WorkspaceLayout so the data-split-state
 * attribute can be asserted.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppContext, { type AppContextValue } from "../../AppContext";

const MOCK_FORECAST = {
  forecast_id: "fct-1",
  classroom_id: "demo",
  forecast_date: "2026-04-15",
  blocks: [
    {
      time_slot: "9:00–10:00",
      activity: "Math",
      level: "high" as const,
      contributing_factors: ["IEPs"],
      suggested_mitigation: "Pre-teach",
    },
  ],
  overall_summary: "High complexity morning.",
  highest_risk_block: "9:00–10:00",
  schema_version: "1",
};

type MockResponse =
  | {
      forecast: typeof MOCK_FORECAST;
      thinking_summary: null;
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
  generateComplexityForecast: vi.fn().mockResolvedValue({}),
}));

vi.mock("../../components/ForecastForm", () => ({
  default: () => <div data-testid="forecast-form" />,
}));
vi.mock("../../components/ForecastTimeline", () => ({
  default: () => <div data-testid="forecast-timeline" />,
}));
vi.mock("../../components/ForecastViewer", () => ({
  default: () => <div data-testid="forecast-viewer" />,
}));
vi.mock("../../components/SkeletonLoader", () => ({ default: () => <div /> }));
vi.mock("../../components/StreamingIndicator", () => ({ default: () => <div /> }));
vi.mock("../../components/PageIntro", () => ({ default: () => <div /> }));
vi.mock("../../components/EmptyStateCard", () => ({ default: () => <div /> }));
vi.mock("../../components/ErrorBanner", () => ({ default: () => <div /> }));
vi.mock("../../components/ResultBanner", () => ({ default: () => <div /> }));
vi.mock("../../components/MockModeBanner", () => ({ default: () => <div /> }));
vi.mock("../../components/RetrievalTraceCard", () => ({ default: () => <div /> }));
vi.mock("../../components/RoleReadOnlyBanner", () => ({ default: () => <div /> }));
vi.mock("../../components/DataVisualizations", () => ({
  ComplexityHeatmap: () => <div />,
}));
vi.mock("../../hooks/useFeedback", () => ({
  useFeedback: () => ({ submit: vi.fn(), submitted: false }),
}));
vi.mock("../../hooks/useStreamingRequest", () => ({
  useStreamingRequest: () => ({ execute: vi.fn() }),
}));
vi.mock("../../utils/parseRecordTimestamp", () => ({
  parseRecordTimestamp: () => "2026-04-14T10:00:00Z",
}));

import ForecastPanel from "../ForecastPanel";

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
    activeTab: "complexity-forecast",
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

function renderWithResult(result: MockResponse) {
  mockResult = result;
  const ctx = makeCtx();
  const utils = render(
    <AppContext.Provider value={ctx}>
      <ForecastPanel />
    </AppContext.Provider>,
  );
  return { ctx, ...utils };
}

describe("ForecastPanel — WorkspaceLayout split-state & NextStepBand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets data-split-state='input' on the WorkspaceLayout when no forecast is visible", () => {
    const { container } = renderWithResult(null);
    const layout = container.querySelector(".workspace-layout");
    expect(layout).toBeTruthy();
    expect(layout).toHaveAttribute("data-split-state", "input");
  });

  it("sets data-split-state='output' on the WorkspaceLayout when a forecast is visible", () => {
    const { container } = renderWithResult({
      forecast: MOCK_FORECAST,
      thinking_summary: null,
      model_id: "mock",
      latency_ms: 100,
    });
    const layout = container.querySelector(".workspace-layout");
    expect(layout).toHaveAttribute("data-split-state", "output");
  });

  it("renders 'Build EA Briefing' as the next-best-step after a forecast is visible", () => {
    renderWithResult({
      forecast: MOCK_FORECAST,
      thinking_summary: null,
      model_id: "mock",
      latency_ms: 100,
    });
    const band = screen.getByTestId("next-step-band");
    expect(band).toHaveTextContent(/build ea briefing/i);
  });

  it("navigates to ea-briefing when the next-step button is clicked", async () => {
    const user = userEvent.setup();
    const { ctx } = renderWithResult({
      forecast: MOCK_FORECAST,
      thinking_summary: null,
      model_id: "mock",
      latency_ms: 100,
    });
    await user.click(
      screen.getByRole("button", { name: /next best step: build ea briefing/i }),
    );
    expect(ctx.setActiveTab).toHaveBeenCalledWith("ea-briefing");
  });

  it("does not render the NextStepBand when no forecast is visible", () => {
    renderWithResult(null);
    expect(screen.queryByTestId("next-step-band")).not.toBeInTheDocument();
  });
});
