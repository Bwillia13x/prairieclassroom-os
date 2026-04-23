/**
 * SurvivalPacketPanel.actionBar.test.tsx — smoke tests for OutputActionBar wiring.
 * Verifies: action bar renders with result present; absent without result.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AppContext, { type AppContextValue } from "../../AppContext";
import React from "react";

const MOCK_PACKET = {
  packet_id: "pkt-1",
  classroom_id: "cls-1",
  generated_for_date: "2026-04-15",
  routines: [{ time_or_label: "Morning", description: "Self-register" }],
  student_support: [],
  ea_coordination: { schedule_summary: "EA 9-10", primary_students: [], if_ea_absent: "Call office" },
  simplified_day_plan: [],
  family_comms: [],
  complexity_peaks: [],
  heads_up: [],
  schema_version: "1",
};

let mockResult: typeof MOCK_PACKET | null = MOCK_PACKET;

vi.mock("../../useAsyncAction", () => ({
  useAsyncAction: () => ({ loading: false, error: null, result: mockResult ? { packet: mockResult, model_id: "mock", latency_ms: 100 } : null, execute: vi.fn(), reset: vi.fn(), cancel: vi.fn() }),
}));
vi.mock("../../api", () => ({ generateSurvivalPacket: vi.fn().mockResolvedValue({}) }));
vi.mock("../../components/SurvivalPacket", () => ({ default: () => <div data-testid="survival-packet-view" /> }));
vi.mock("../../components/ContextualHint", () => ({ default: () => <div /> }));
vi.mock("../../components/ErrorBanner", () => ({ default: () => <div /> }));
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
vi.mock("../../components/ResultBanner", () => ({ default: () => <div /> }));
vi.mock("../../hooks/useFeedback", () => ({ useFeedback: () => ({ submit: vi.fn(), submitted: false }) }));
vi.mock("../../hooks/useStreamingRequest", () => ({ useStreamingRequest: () => ({ execute: vi.fn() }) }));

import SurvivalPacketPanel from "../SurvivalPacketPanel";

function makeCtx(): AppContextValue {
  return {
    classrooms: [{ classroom_id: "demo", grade_band: "3-4", subject_focus: "cross_curricular", classroom_notes: [], students: [], is_demo: true }],
    activeClassroom: "demo",
    activeTab: "ops",
    activeTool: "survival-packet",
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

describe("SurvivalPacketPanel OutputActionBar", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("renders 3-button action bar when result is present (no Save to Tomorrow)", () => {
    mockResult = MOCK_PACKET;
    render(
      <AppContext.Provider value={makeCtx()}>
        <SurvivalPacketPanel />
      </AppContext.Provider>,
    );
    expect(screen.getByRole("navigation", { name: "Survival packet quick actions" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Survival packet output" })).toBeInTheDocument();
    // Print + Download appear in both bars; Copy remains in the full bottom bar only.
    expect(screen.getAllByRole("button", { name: "Print" }).length).toBe(2);
    expect(screen.getAllByRole("button", { name: "Copy" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("button", { name: "Download" }).length).toBe(2);
    expect(screen.queryByRole("button", { name: "Save to Tomorrow" })).not.toBeInTheDocument();
  });

  it("does not render the action bar when result is null", () => {
    mockResult = null;
    render(
      <AppContext.Provider value={makeCtx()}>
        <SurvivalPacketPanel />
      </AppContext.Provider>,
    );
    expect(screen.queryByRole("navigation", { name: "Survival packet output" })).not.toBeInTheDocument();
  });
});
