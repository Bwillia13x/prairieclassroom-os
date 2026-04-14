import { render, screen } from "@testing-library/react";
import { vi, describe, it, beforeEach, afterEach, expect } from "vitest";
import AppContext, { type AppContextValue } from "../../AppContext";
import DifferentiatePanel from "../DifferentiatePanel";
import type { StreamingState } from "../../appReducer";

vi.mock("../../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api")>();
  return {
    ...actual,
    differentiate: vi.fn(),
  };
});



function makeContext(streamingOverride?: Partial<StreamingState>): AppContextValue {
  const streaming: StreamingState = {
    active: false,
    phase: "idle",
    thinkingText: "",
    partialSections: [],
    progress: 0,
    elapsedSeconds: 0,
    ...streamingOverride,
  };
  return {
    classrooms: [
      {
        classroom_id: "demo",
        grade_band: "3-4",
        subject_focus: "cross_curricular",
        classroom_notes: [],
        students: [{ alias: "Amira" }],
        is_demo: true,
      },
    ] as never,
    activeClassroom: "demo",
    activeTab: "differentiate",
    setActiveClassroom: vi.fn(),
    setActiveTab: vi.fn(),
    profile: {
      classroom_id: "demo",
      grade_band: "3-4",
      subject_focus: "cross_curricular",
      classroom_notes: [],
      students: [{ alias: "Amira" }],
      is_demo: true,
    } as never,
    students: [{ alias: "Amira" }],
    classroomAccessCodes: {},
    authPrompt: null,
    showSuccess: vi.fn(),
    dispatch: vi.fn(),
    streaming,
    toasts: [],
    featuresSeen: {},
    submitFeedback: vi.fn(),
    showUndo: vi.fn(),
    dismissToast: vi.fn(),
  };
}

describe("DifferentiatePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("imports without error", async () => {
    const mod = await import("../DifferentiatePanel");
    expect(mod.default).toBeDefined();
  });

  it("renders StreamingIndicator while differentiate is in flight and streaming phase is active", () => {
    const ctx = makeContext({ active: true, phase: "thinking", progress: 0.2 });

    render(
      <AppContext.Provider value={ctx}>
        <DifferentiatePanel />
      </AppContext.Provider>,
    );

    // StreamingIndicator renders with role="status"
    expect(
      screen.getByRole("status", { name: /generating lesson variants|deep reasoning/i }),
    ).toBeInTheDocument();

    // The old grid skeleton must NOT be present.
    expect(
      screen.queryByLabelText("Loading differentiated variants"),
    ).not.toBeInTheDocument();
  });

  it("falls back to empty state when idle, no result, no error", () => {
    const ctx = makeContext();
    render(
      <AppContext.Provider value={ctx}>
        <DifferentiatePanel />
      </AppContext.Provider>,
    );

    expect(screen.getByText("Build Lesson Variants")).toBeInTheDocument();
  });
});
