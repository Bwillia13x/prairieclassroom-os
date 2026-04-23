import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppContext, { type AppContextValue } from "../../AppContext";
import type { ClassroomRole } from "../../appReducer";
import RoleEscapeBanner from "../RoleEscapeBanner";

function makeContext(
  overrides: Partial<AppContextValue> & { activeRole?: ClassroomRole } = {},
): AppContextValue {
  return {
    classrooms: [],
    activeClassroom: "demo-okafor-grade34",
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

function renderWith(overrides: Partial<AppContextValue> = {}) {
  const ctx = makeContext(overrides);
  return {
    ctx,
    ...render(
      <AppContext.Provider value={ctx}>
        <RoleEscapeBanner />
      </AppContext.Provider>,
    ),
  };
}

describe("RoleEscapeBanner", () => {
  it("does not render when active role is teacher", () => {
    renderWith({ activeRole: "teacher" });
    expect(screen.queryByTestId("role-escape-banner")).not.toBeInTheDocument();
  });

  it("does not render when no active classroom is selected", () => {
    renderWith({ activeRole: "reviewer", activeClassroom: "" });
    expect(screen.queryByTestId("role-escape-banner")).not.toBeInTheDocument();
  });

  it("renders a Resume-as-teacher recovery banner for reviewer", () => {
    renderWith({ activeRole: "reviewer" });
    expect(screen.getByTestId("role-escape-banner")).toBeInTheDocument();
    expect(screen.getByText(/Reviewer/)).toBeInTheDocument();
    expect(screen.getByTestId("role-escape-banner-switch")).toHaveTextContent(/Resume as teacher/i);
  });

  it("renders for substitute and ea roles too", () => {
    const { unmount } = renderWith({ activeRole: "substitute" });
    expect(screen.getByTestId("role-escape-banner")).toBeInTheDocument();
    unmount();

    renderWith({ activeRole: "ea" });
    expect(screen.getByTestId("role-escape-banner")).toBeInTheDocument();
  });

  it("invokes setClassroomRole('teacher') on the active classroom when the switch is clicked", async () => {
    const setClassroomRole = vi.fn();
    const user = userEvent.setup();
    renderWith({
      activeRole: "reviewer",
      activeClassroom: "demo-okafor-grade34",
      setClassroomRole,
    });

    await user.click(screen.getByTestId("role-escape-banner-switch"));
    expect(setClassroomRole).toHaveBeenCalledWith("demo-okafor-grade34", "teacher");
  });
});
