import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import AppContext, { useApp, type AppContextValue } from "../AppContext";
import type { ClassroomRole } from "../appReducer";

function makeContext(overrides: Partial<AppContextValue> = {}): AppContextValue {
  return {
    classrooms: [],
    activeClassroom: "demo-classroom",
    activeTab: "today",
    setActiveClassroom: vi.fn(),
    setActiveTab: vi.fn(),
    profile: undefined,
    students: [],
    classroomAccessCodes: {},
    classroomRoles: { "demo-classroom": "ea" },
    activeRole: "ea",
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
    activeTool: null,
    setActiveTool: vi.fn(),
    messagePrefill: null,
    interventionPrefill: null,
    ...overrides,
  };
}

function Probe() {
  const ctx = useApp();
  return (
    <div>
      <span data-testid="role">{ctx.activeRole}</span>
      <button
        type="button"
        onClick={() => ctx.setClassroomRole("demo-classroom", "substitute")}
      >
        switch
      </button>
    </div>
  );
}

describe("AppContext — role surface", () => {
  it("exposes activeRole and setClassroomRole to consumers", () => {
    const setClassroomRole = vi.fn();
    const value = makeContext({ setClassroomRole });
    render(
      <AppContext.Provider value={value}>
        <Probe />
      </AppContext.Provider>,
    );
    expect(screen.getByTestId("role")).toHaveTextContent("ea");
    act(() => {
      screen.getByText("switch").click();
    });
    expect(setClassroomRole).toHaveBeenCalledWith("demo-classroom", "substitute");
  });

  it("defaults activeRole to 'teacher' for consumers that supply no stored role", () => {
    const value = makeContext({
      classroomRoles: {},
      activeRole: "teacher",
    });
    render(
      <AppContext.Provider value={value}>
        <Probe />
      </AppContext.Provider>,
    );
    expect(screen.getByTestId("role")).toHaveTextContent("teacher");
  });

  it("is typed so activeRole is a ClassroomRole", () => {
    const value = makeContext();
    const role: ClassroomRole = value.activeRole;
    expect(role).toBe("ea");
  });
});
