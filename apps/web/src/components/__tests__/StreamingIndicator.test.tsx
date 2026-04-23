import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AppContext, { type AppContextValue } from "../../AppContext";
import type { StreamingState } from "../../appReducer";
import StreamingIndicator from "../StreamingIndicator";

function makeContext(streaming: StreamingState): AppContextValue {
  return {
    classrooms: [],
    activeClassroom: "demo-classroom",
    activeTab: "today",
    setActiveClassroom: vi.fn(),
    setActiveTab: vi.fn(),
    profile: undefined,
    students: [],
    classroomAccessCodes: {},
    classroomRoles: {},
    activeRole: "teacher",
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
    activeTool: null,
    setActiveTool: vi.fn(),
    messagePrefill: null,
    interventionPrefill: null,
  };
}

function renderWith(streaming: StreamingState) {
  const ctx = makeContext(streaming);
  return render(
    <AppContext.Provider value={ctx}>
      <StreamingIndicator />
    </AppContext.Provider>,
  );
}

describe("StreamingIndicator teacher-safe copy", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("renders teacher-facing copy for the thinking phase", () => {
    renderWith({
      active: true,
      phase: "thinking",
      thinkingText: "internal chain of thought",
      partialSections: [],
      progress: 0.2,
      elapsedSeconds: 3,
    });
    expect(screen.getByText("Reviewing classroom context…")).toBeInTheDocument();
    expect(screen.queryByText(/Deep reasoning/i)).not.toBeInTheDocument();
  });

  it("renders teacher-facing copy for the structuring phase", () => {
    renderWith({
      active: true,
      phase: "structuring",
      thinkingText: "",
      partialSections: [],
      progress: 0.7,
      elapsedSeconds: 12,
    });
    expect(screen.getByText("Preparing your plan…")).toBeInTheDocument();
    expect(screen.queryByText(/Structuring your plan/i)).not.toBeInTheDocument();
  });

  it("renders Ready label when streaming completes", () => {
    renderWith({
      active: false,
      phase: "complete",
      thinkingText: "",
      partialSections: [],
      progress: 1,
      elapsedSeconds: 15,
    });
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("hides raw model reasoning text by default — never shown to teachers", () => {
    renderWith({
      active: true,
      phase: "thinking",
      thinkingText: "The model is speculating about student X's attention patterns.",
      partialSections: [],
      progress: 0.3,
      elapsedSeconds: 5,
    });
    expect(screen.queryByTestId("streaming-thinking-debug")).not.toBeInTheDocument();
    expect(screen.queryByText(/Model reasoning/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/speculating about student X/i)).not.toBeInTheDocument();
  });

  it("surfaces thinking text only when the operator debug toggle is on", () => {
    localStorage.setItem("prairie-debug-thinking", "true");
    renderWith({
      active: true,
      phase: "thinking",
      thinkingText: "operator-visible reasoning",
      partialSections: [],
      progress: 0.3,
      elapsedSeconds: 5,
    });
    expect(screen.getByTestId("streaming-thinking-debug")).toBeInTheDocument();
    expect(screen.getByText("Working notes")).toBeInTheDocument();
    expect(screen.getByText(/operator-visible reasoning/)).toBeInTheDocument();
  });
});
