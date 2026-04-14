/**
 * EABriefingPanel.actionBar.test.tsx — smoke tests for OutputActionBar wiring.
 * Verifies: action bar renders with result present; absent without result.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AppContext, { type AppContextValue } from "../../AppContext";
import React from "react";

const MOCK_BRIEFING = {
  briefing_id: "brf-1",
  classroom_id: "cls-1",
  date: "2026-04-15",
  schedule_blocks: [{ time_slot: "9:00–9:30", student_refs: ["A"], task_description: "Reading", materials_needed: [] }],
  student_watch_list: [],
  pending_followups: [],
  teacher_notes_for_ea: "Good luck!",
  schema_version: "1",
};

let mockResult: typeof MOCK_BRIEFING | null = MOCK_BRIEFING;

vi.mock("../../useAsyncAction", () => ({
  useAsyncAction: () => ({ loading: false, error: null, result: mockResult ? { briefing: mockResult, model_id: "mock", latency_ms: 100 } : null, execute: vi.fn(), reset: vi.fn(), cancel: vi.fn() }),
}));
vi.mock("../../api", () => ({ generateEABriefing: vi.fn().mockResolvedValue({}) }));
vi.mock("../../components/EABriefing", () => ({
  EABriefingForm: () => <div data-testid="ea-briefing-form" />,
  EABriefingResult: () => <div data-testid="ea-briefing-result" />,
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
vi.mock("../../components/EmptyStateIllustration", () => ({ default: () => <div /> }));
vi.mock("../../components/ResultBanner", () => ({ default: () => <div /> }));
vi.mock("../../hooks/useFeedback", () => ({ useFeedback: () => ({ submit: vi.fn(), submitted: false }) }));

import EABriefingPanel from "../EABriefingPanel";

function makeCtx(): AppContextValue {
  return {
    classrooms: [{ classroom_id: "demo", grade_band: "3-4", subject_focus: "cross_curricular", classroom_notes: [], students: [], is_demo: true }],
    activeClassroom: "demo",
    activeTab: "ea-briefing",
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
    dispatch: vi.fn(),
    streaming: { active: false, phase: "idle", thinkingText: "", partialSections: [], progress: 0, elapsedSeconds: 0 },
    toasts: [],
    featuresSeen: {},
    submitFeedback: vi.fn(),
    showUndo: vi.fn(),
    dismissToast: vi.fn(),
    tomorrowNotes: [],
    appendTomorrowNote: vi.fn(),
  };
}

describe("EABriefingPanel OutputActionBar", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("renders 4-button action bar when result is present", () => {
    mockResult = MOCK_BRIEFING;
    render(
      <AppContext.Provider value={makeCtx()}>
        <EABriefingPanel />
      </AppContext.Provider>,
    );
    expect(screen.getByRole("navigation", { name: "EA briefing output" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save to Tomorrow" })).toBeInTheDocument();
  });

  it("does not render the action bar when result is null", () => {
    mockResult = null;
    render(
      <AppContext.Provider value={makeCtx()}>
        <EABriefingPanel />
      </AppContext.Provider>,
    );
    expect(screen.queryByRole("navigation", { name: "EA briefing output" })).not.toBeInTheDocument();
  });
});
