import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, beforeEach, afterEach, expect } from "vitest";
import AppContext, { type AppContextValue } from "../../AppContext";
import LanguageToolsPanel from "../LanguageToolsPanel";
import type { StreamingState } from "../../appReducer";

const mockCancel = vi.fn();

vi.mock("../../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api")>();
  return {
    ...actual,
    simplifyText: vi.fn(),
    generateVocabCards: vi.fn(),
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
    activeTab: "prep",
    activeTool: "language-tools",
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

describe("LanguageToolsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("imports without error", async () => {
    const mod = await import("../LanguageToolsPanel");
    expect(mod.default).toBeDefined();
  });

  it("renders StreamingIndicator while streaming is active", () => {
    const ctx = makeContext({ active: true, phase: "thinking", progress: 0.2 });

    render(
      <AppContext.Provider value={ctx}>
        <LanguageToolsPanel />
      </AppContext.Provider>,
    );

    expect(
      screen.getByRole("status", { name: /simplifying text for eal learners|generating bilingual/i }),
    ).toBeInTheDocument();
  });

  it("renders empty state when idle with no result", () => {
    const ctx = makeContext();

    render(
      <AppContext.Provider value={ctx}>
        <LanguageToolsPanel />
      </AppContext.Provider>,
    );

    // The empty state is now the Nothing-design LanguageToolsEmptyState.
    expect(screen.getByText(/what a simplified passage looks like/i)).toBeInTheDocument();
  });

  it("swaps the empty-state copy to reflect the active language tool", async () => {
    const ctx = makeContext();
    const user = userEvent.setup();

    render(
      <AppContext.Provider value={ctx}>
        <LanguageToolsPanel />
      </AppContext.Provider>,
    );

    // Initial state: simplify is the default tool.
    expect(screen.getByText(/what a simplified passage looks like/i)).toBeInTheDocument();
    expect(screen.queryByText(/what a bilingual card looks like/i)).not.toBeInTheDocument();

    // Toggling to vocab changes the empty-state copy.
    await user.click(screen.getByRole("tab", { name: /vocab cards/i }));

    expect(screen.getByText(/what a bilingual card looks like/i)).toBeInTheDocument();
    expect(screen.queryByText(/what a simplified passage looks like/i)).not.toBeInTheDocument();
  });

  it("sets data-split-state='input' on the WorkspaceLayout when the active tool has no result", () => {
    const ctx = makeContext();
    const { container } = render(
      <AppContext.Provider value={ctx}>
        <LanguageToolsPanel />
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
        <LanguageToolsPanel />
      </AppContext.Provider>,
    );

    const cancelBtn = screen.getByRole("button", { name: /cancel request/i });
    await user.click(cancelBtn);

    expect(mockCancel).toHaveBeenCalledTimes(1);
  });
});
