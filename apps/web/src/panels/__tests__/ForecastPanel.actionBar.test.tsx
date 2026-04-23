/**
 * ForecastPanel.actionBar.test.tsx — smoke tests for OutputActionBar wiring.
 * Verifies: action bar renders with result present; absent without result.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AppContext, { type AppContextValue } from "../../AppContext";
import React from "react";

const MOCK_FORECAST = {
  forecast_id: "fct-1",
  classroom_id: "cls-1",
  forecast_date: "2026-04-15",
  blocks: [
    { time_slot: "9:00–10:00", activity: "Math", level: "high" as const, contributing_factors: ["IEPs"], suggested_mitigation: "Pre-teach" },
  ],
  overall_summary: "High complexity morning.",
  highest_risk_block: "9:00–10:00",
  schema_version: "1",
};

let mockResult: typeof MOCK_FORECAST | null = MOCK_FORECAST;

vi.mock("../../useAsyncAction", () => ({
  useAsyncAction: () => ({ loading: false, error: null, result: mockResult ? { forecast: mockResult, thinking_summary: null, model_id: "mock", latency_ms: 100 } : null, execute: vi.fn(), reset: vi.fn(), cancel: vi.fn() }),
}));
vi.mock("../../api", () => ({ generateComplexityForecast: vi.fn().mockResolvedValue({}) }));
vi.mock("../../components/ForecastForm", () => ({ default: () => <div data-testid="forecast-form" /> }));
vi.mock("../../components/ForecastTimeline", () => ({ default: () => <div data-testid="forecast-timeline" /> }));
vi.mock("../../components/ForecastViewer", () => ({ default: () => <div data-testid="forecast-viewer" /> }));
vi.mock("../../components/SkeletonLoader", () => ({ default: () => <div /> }));
vi.mock("../../components/StreamingIndicator", () => ({ default: () => <div /> }));
vi.mock("../../components/OutputFeedback", () => ({ default: () => <div /> }));
vi.mock("../../components/PageIntro", () => ({ default: () => <div /> }));
vi.mock("../../components/WorkspaceLayout", () => ({
  default: ({ rail, canvas }: { rail: React.ReactNode; canvas: React.ReactNode }) => (
    <div><div>{rail}</div><div>{canvas}</div></div>
  ),
}));
vi.mock("../../components/EmptyStateCard", () => ({ default: () => <div /> }));
vi.mock("../../components/ErrorBanner", () => ({ default: () => <div /> }));
vi.mock("../../components/ResultBanner", () => ({ default: () => <div /> }));
vi.mock("../../components/DataVisualizations", () => ({ ComplexityHeatmap: () => <div /> }));
vi.mock("../../hooks/useFeedback", () => ({ useFeedback: () => ({ submit: vi.fn(), submitted: false }) }));
vi.mock("../../hooks/useStreamingRequest", () => ({ useStreamingRequest: () => ({ execute: vi.fn() }) }));
vi.mock("../../utils/parseRecordTimestamp", () => ({ parseRecordTimestamp: () => "2026-04-14T10:00:00Z" }));

import ForecastPanel from "../ForecastPanel";

function makeCtx(): AppContextValue {
  return {
    classrooms: [{ classroom_id: "demo", grade_band: "3-4", subject_focus: "cross_curricular", classroom_notes: [], students: [], is_demo: true }],
    activeClassroom: "demo",
    activeTab: "tomorrow",
    activeTool: "complexity-forecast",
    setActiveClassroom: vi.fn(),
    setActiveTab: vi.fn(),
    profile: { classroom_id: "demo", grade_band: "3-4", subject_focus: "cross_curricular", classroom_notes: [], students: [], is_demo: true },
    students: [],
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

describe("ForecastPanel OutputActionBar", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("renders 3-button action bar when result is present", () => {
    mockResult = MOCK_FORECAST;
    render(
      <AppContext.Provider value={makeCtx()}>
        <ForecastPanel />
      </AppContext.Provider>,
    );
    expect(screen.getByRole("navigation", { name: "Forecast output" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save to Tomorrow" })).toBeInTheDocument();
  });

  it("does not render the action bar when result is null", () => {
    mockResult = null;
    render(
      <AppContext.Provider value={makeCtx()}>
        <ForecastPanel />
      </AppContext.Provider>,
    );
    expect(screen.queryByRole("navigation", { name: "Forecast output" })).not.toBeInTheDocument();
  });
});
