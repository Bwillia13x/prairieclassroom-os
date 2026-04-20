import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, beforeEach, afterEach, expect } from "vitest";
import AppContext, { type AppContextValue } from "../../AppContext";
import DifferentiatePanel from "../DifferentiatePanel";
import type { StreamingState } from "../../appReducer";

const mockCancel = vi.fn();

vi.mock("../../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api")>();
  return {
    ...actual,
    differentiate: vi.fn(),
  };
});

vi.mock("../../useAsyncAction", () => ({
  useAsyncAction: () => ({
    loading: false,
    error: null,
    result: null,
    execute: vi.fn(),
    cancel: mockCancel,
    reset: vi.fn(),
  }),
}));



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
    classroomRoles: {},
    activeRole: "teacher" as const,
    setClassroomRole: vi.fn(),
    authPrompt: null,
    showSuccess: vi.fn(),
    showError: vi.fn(),
    dispatch: vi.fn(),
    streaming,
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

  it("lists the four output lanes in the empty-state 'Output will include' checklist", () => {
    const ctx = makeContext();
    render(
      <AppContext.Provider value={ctx}>
        <DifferentiatePanel />
      </AppContext.Provider>,
    );

    const checklist = screen.getByRole("list", { name: /output will include/i });
    expect(checklist).toBeInTheDocument();
    expect(checklist).toHaveTextContent(/readiness lane/i);
    expect(checklist).toHaveTextContent(/scaffolded lane/i);
    expect(checklist).toHaveTextContent(/extension lane/i);
    expect(checklist).toHaveTextContent(/language support lane/i);
  });

  it("sets data-split-state='input' on the WorkspaceLayout when no result is visible", () => {
    const ctx = makeContext();
    const { container } = render(
      <AppContext.Provider value={ctx}>
        <DifferentiatePanel />
      </AppContext.Provider>,
    );

    const layout = container.querySelector(".workspace-layout");
    expect(layout).toBeTruthy();
    expect(layout).toHaveAttribute("data-split-state", "input");
  });

  it("cancel button calls cancel when streaming is active", async () => {
    const ctx = makeContext({ active: true, phase: "thinking" });
    const user = userEvent.setup();

    render(
      <AppContext.Provider value={ctx}>
        <DifferentiatePanel />
      </AppContext.Provider>,
    );

    const cancelBtn = screen.getByRole("button", { name: /cancel request/i });
    await user.click(cancelBtn);

    expect(mockCancel).toHaveBeenCalledTimes(1);
  });
});
