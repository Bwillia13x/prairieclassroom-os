/**
 * DifferentiatePanel.actionBar.test.tsx — verifies OutputActionBar is wired into DifferentiatePanel.
 * Uses a mocked useAsyncAction to pre-set a result so the action bar renders immediately.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppContext, { type AppContextValue } from "../../AppContext";

// Mock useAsyncAction so result is pre-set (no API call needed).
// Note: vi.mock factories are hoisted so MOCK_RESULT must be defined inline here.
vi.mock("../../useAsyncAction", () => ({
  useAsyncAction: () => ({
    loading: false,
    error: null,
    result: {
      artifact_id: "a1",
      variants: [
        {
          variant_id: "v1",
          artifact_id: "a1",
          variant_type: "core",
          title: "Core variant",
          student_facing_instructions: "Core content",
          teacher_notes: "",
          required_materials: [],
          estimated_minutes: 20,
          schema_version: "1",
        },
        {
          variant_id: "v2",
          artifact_id: "a1",
          variant_type: "chunked",
          title: "Chunked variant",
          student_facing_instructions: "Chunked content",
          teacher_notes: "",
          required_materials: [],
          estimated_minutes: 25,
          schema_version: "1",
        },
      ],
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
  differentiate: vi.fn().mockResolvedValue({}),
  fetchRecentRuns: vi.fn().mockResolvedValue([]),
  saveRun: vi.fn().mockResolvedValue({ run_id: "r", created_at: new Date().toISOString() }),
}));

// Mock sub-components to avoid deep render tree complexity
vi.mock("../../components/ArtifactUpload", () => ({
  default: () => <div data-testid="artifact-upload" />,
}));
vi.mock("../../components/VariantGrid", () => ({
  default: () => <div data-testid="variant-grid" />,
}));
vi.mock("../../components/DataVisualizations", () => ({
  VariantSummaryStrip: () => <div data-testid="variant-summary-strip" />,
}));
vi.mock("../../components/SkeletonLoader", () => ({
  default: () => <div data-testid="skeleton-loader" />,
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
vi.mock("../../components/WorkspaceLayout", () => ({
  default: ({ rail, canvas }: { rail: React.ReactNode; canvas: React.ReactNode }) => (
    <div>
      <div data-testid="rail">{rail}</div>
      <div data-testid="canvas">{canvas}</div>
    </div>
  ),
}));
vi.mock("../../components/DifferentiateEmptyState", () => ({
  default: () => <div data-testid="empty-state" />,
}));
vi.mock("../../components/ErrorBanner", () => ({
  default: () => <div data-testid="error-banner" />,
}));
vi.mock("../../components/OutputMetaRow", () => ({
  default: () => <div data-testid="output-meta-row" />,
}));
vi.mock("../../components/ResultBanner", () => ({
  default: () => <div data-testid="result-banner" />,
}));
vi.mock("../../hooks/useFeedback", () => ({
  useFeedback: () => ({ submit: vi.fn(), submitted: false }),
}));

import React from "react";
import DifferentiatePanel from "../DifferentiatePanel";

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
    activeTab: "differentiate",
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
      <DifferentiatePanel />
    </AppContext.Provider>,
  );

  return { appContext, user };
}

describe("DifferentiatePanel OutputActionBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the action bar with 4 action buttons when result is present", () => {
    renderPanel();

    const nav = screen.getByRole("navigation", { name: "Variants output" });
    expect(nav).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save to Tomorrow" })).toBeInTheDocument();
  });

  it("calls appendTomorrowNote when Save to Tomorrow is clicked", async () => {
    const { appContext, user } = renderPanel();

    await user.click(screen.getByRole("button", { name: "Save to Tomorrow" }));

    expect(appContext.appendTomorrowNote).toHaveBeenCalledWith(
      expect.objectContaining({
        sourcePanel: "differentiate",
        sourceType: "differentiate_material",
      }),
    );
    expect(appContext.showSuccess).toHaveBeenCalledWith("Saved to Tomorrow Plan");
  });

  it("calls showSuccess with 'Copied' when Copy is clicked", async () => {
    const { appContext, user } = renderPanel();

    // Mock clipboard via defineProperty since navigator.clipboard is a getter-only property
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    await user.click(screen.getByRole("button", { name: "Copy" }));

    expect(appContext.showSuccess).toHaveBeenCalledWith("Copied");
  });
});
