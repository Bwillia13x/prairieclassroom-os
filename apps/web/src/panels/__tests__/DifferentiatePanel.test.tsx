import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, beforeEach, afterEach, expect } from "vitest";
import AppContext, { type AppContextValue } from "../../AppContext";
import DifferentiatePanel from "../DifferentiatePanel";
import type { StreamingState } from "../../appReducer";
import type { DifferentiateResponse } from "../../types";

const mockCancel = vi.fn();
let mockDifferentiateResult: DifferentiateResponse | null = null;

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
    result: mockDifferentiateResult,
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
    activeTab: "prep",
    activeTool: "differentiate",
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
    setActiveTool: vi.fn(),
    messagePrefill: null,
    interventionPrefill: null,
  };
}

describe("DifferentiatePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDifferentiateResult = null;
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

  it("opens the variant-lane drawer from the generated summary strip", async () => {
    mockDifferentiateResult = {
      artifact_id: "artifact-1",
      model_id: "mock",
      latency_ms: 42,
      variants: [
        {
          variant_id: "variant-core",
          artifact_id: "artifact-1",
          variant_type: "core",
          title: "Core path",
          student_facing_instructions: "Read the passage and answer the questions.",
          teacher_notes: "Use with the main group.",
          required_materials: ["Passage"],
          estimated_minutes: 18,
          schema_version: "1",
        },
        {
          variant_id: "variant-extension",
          artifact_id: "artifact-1",
          variant_type: "extension",
          title: "Extension path",
          student_facing_instructions: "Add a second example.",
          teacher_notes: "Use with early finishers.",
          required_materials: ["Notebook"],
          estimated_minutes: 20,
          schema_version: "1",
        },
      ],
    };
    const user = userEvent.setup();

    render(
      <AppContext.Provider value={makeContext()}>
        <DifferentiatePanel />
      </AppContext.Provider>,
    );

    await user.click(screen.getByRole("button", { name: /show core variants/i }));

    const drawer = screen.getByRole("dialog", { name: /core — 1 variant/i });
    expect(drawer).toBeInTheDocument();
    expect(within(drawer).getByText("Core path")).toBeInTheDocument();
  });
});
