/**
 * LanguageToolsPanel.actionBar.test.tsx — smoke tests for OutputActionBar wiring.
 * Tests both simplify and vocab tool modes.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AppContext, { type AppContextValue } from "../../AppContext";
import React from "react";

const MOCK_SIMPLIFIED = {
  simplified_id: "smp-1",
  source_text: "Complex text",
  grade_band: "3-4",
  eal_level: "beginner" as const,
  simplified_text: "Simple text",
  key_vocabulary: ["word"],
  visual_cue_suggestions: [],
  schema_version: "1",
};

type MockVocab = {
  set_id: string;
  artifact_id: string;
  subject: string;
  target_language: string;
  grade_band: string;
  cards: Array<{
    term: string;
    definition: string;
    target_translation: string;
    example_sentence: string;
    visual_hint: string;
  }>;
  schema_version: string;
};

// Controls per test — simplify active by default
let mockSimplifyResult: typeof MOCK_SIMPLIFIED | null = MOCK_SIMPLIFIED;
let mockVocabResult: MockVocab | null = null;

vi.mock("../../useAsyncAction", () => {
  let callCount = 0;
  return {
    useAsyncAction: () => {
      callCount++;
      if (callCount % 2 === 1) {
        // First call = simplify
        return { loading: false, error: null, result: mockSimplifyResult ? { simplified: mockSimplifyResult, model_id: "mock", latency_ms: 100 } : null, execute: vi.fn(), reset: vi.fn(), cancel: vi.fn() };
      } else {
        // Second call = vocab
        return { loading: false, error: null, result: mockVocabResult ? { card_set: mockVocabResult, model_id: "mock", latency_ms: 100 } : null, execute: vi.fn(), reset: vi.fn(), cancel: vi.fn() };
      }
    },
  };
});
vi.mock("../../api", () => ({
  simplifyText: vi.fn().mockResolvedValue({}),
  generateVocabCards: vi.fn().mockResolvedValue({}),
  fetchRecentRuns: vi.fn().mockResolvedValue([]),
  saveRun: vi.fn().mockResolvedValue({ run_id: "r", created_at: new Date().toISOString() }),
}));
vi.mock("../../components/SimplifiedViewer", () => ({ default: () => <div data-testid="simplified-viewer" /> }));
vi.mock("../../components/VocabCardGrid", () => ({ default: () => <div data-testid="vocab-card-grid" /> }));
vi.mock("../../components/ContextualHint", () => ({ default: () => <div /> }));
vi.mock("../../components/ErrorBanner", () => ({ default: () => <div /> }));
vi.mock("../../components/DataVisualizations", () => ({ ReadabilityComparisonGauge: () => <div /> }));
vi.mock("../../components/OutputFeedback", () => ({ default: () => <div /> }));
vi.mock("../../components/PageIntro", () => ({ default: () => <div /> }));
vi.mock("../../components/WorkspaceLayout", () => ({
  default: ({ rail, canvas }: { rail: React.ReactNode; canvas: React.ReactNode }) => (
    <div><div>{rail}</div><div>{canvas}</div></div>
  ),
}));
vi.mock("../../components/EmptyStateCard", () => ({ default: () => <div /> }));
vi.mock("../../components/SkeletonLoader", () => ({ default: () => <div /> }));
vi.mock("../../components/ResultBanner", () => ({ default: () => <div /> }));
vi.mock("../../hooks/useFeedback", () => ({ useFeedback: () => ({ submit: vi.fn(), submitted: false }) }));

import LanguageToolsPanel from "../LanguageToolsPanel";

function makeCtx(): AppContextValue {
  return {
    classrooms: [{ classroom_id: "demo", grade_band: "3-4", subject_focus: "cross_curricular", classroom_notes: [], students: [], is_demo: true }],
    activeClassroom: "demo",
    activeTab: "prep",
    activeTool: "language-tools",
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

describe("LanguageToolsPanel OutputActionBar — simplify mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSimplifyResult = MOCK_SIMPLIFIED;
    mockVocabResult = null;
  });

  it("renders action bar in simplify mode when simplify result is present", () => {
    render(
      <AppContext.Provider value={makeCtx()}>
        <LanguageToolsPanel />
      </AppContext.Provider>,
    );
    // In simplify mode (default), the action bar should appear
    expect(screen.getByRole("navigation", { name: "Language tools output" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save to Tomorrow" })).toBeInTheDocument();
  });

  it("does not render action bar when simplify result is null", () => {
    mockSimplifyResult = null;
    render(
      <AppContext.Provider value={makeCtx()}>
        <LanguageToolsPanel />
      </AppContext.Provider>,
    );
    expect(screen.queryByRole("navigation", { name: "Language tools output" })).not.toBeInTheDocument();
  });
});
