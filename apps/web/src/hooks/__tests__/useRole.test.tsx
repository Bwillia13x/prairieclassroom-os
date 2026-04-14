import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AppContext, { type AppContextValue } from "../../AppContext";
import { useRole, roleCapabilities } from "../useRole";
import type { ClassroomRole } from "../../appReducer";

function wrap(role: ClassroomRole) {
  const value: AppContextValue = {
    classrooms: [],
    activeClassroom: "c1",
    activeTab: "today",
    setActiveClassroom: vi.fn(),
    setActiveTab: vi.fn(),
    profile: undefined,
    students: [],
    classroomAccessCodes: {},
    classroomRoles: { c1: role },
    activeRole: role,
    setClassroomRole: vi.fn(),
    authPrompt: null,
    showSuccess: vi.fn(),
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
  };

  function Probe() {
    const capabilities = useRole();
    return (
      <ul>
        <li data-testid="role">{capabilities.role}</li>
        <li data-testid="canWrite">{String(capabilities.canWrite)}</li>
        <li data-testid="canApproveMessages">{String(capabilities.canApproveMessages)}</li>
        <li data-testid="canLogInterventions">{String(capabilities.canLogInterventions)}</li>
        <li data-testid="canEditSchedule">{String(capabilities.canEditSchedule)}</li>
      </ul>
    );
  }

  render(
    <AppContext.Provider value={value}>
      <Probe />
    </AppContext.Provider>,
  );
}

describe("roleCapabilities — pure function", () => {
  it("teacher has every write capability", () => {
    expect(roleCapabilities("teacher")).toEqual({
      role: "teacher",
      canWrite: true,
      canApproveMessages: true,
      canLogInterventions: true,
      canEditSchedule: true,
    });
  });

  it("ea can log interventions but cannot approve messages or edit schedule", () => {
    expect(roleCapabilities("ea")).toEqual({
      role: "ea",
      canWrite: true,
      canApproveMessages: false,
      canLogInterventions: true,
      canEditSchedule: false,
    });
  });

  it("substitute is read-only on approvals and schedule but can log", () => {
    expect(roleCapabilities("substitute")).toEqual({
      role: "substitute",
      canWrite: true,
      canApproveMessages: false,
      canLogInterventions: true,
      canEditSchedule: false,
    });
  });

  it("reviewer is fully read-only", () => {
    expect(roleCapabilities("reviewer")).toEqual({
      role: "reviewer",
      canWrite: false,
      canApproveMessages: false,
      canLogInterventions: false,
      canEditSchedule: false,
    });
  });
});

describe("useRole — context-backed", () => {
  it("returns capabilities for teacher", () => {
    wrap("teacher");
    expect(screen.getByTestId("role")).toHaveTextContent("teacher");
    expect(screen.getByTestId("canApproveMessages")).toHaveTextContent("true");
  });

  it("returns capabilities for ea", () => {
    wrap("ea");
    expect(screen.getByTestId("canApproveMessages")).toHaveTextContent("false");
    expect(screen.getByTestId("canLogInterventions")).toHaveTextContent("true");
  });

  it("returns capabilities for substitute", () => {
    wrap("substitute");
    expect(screen.getByTestId("canEditSchedule")).toHaveTextContent("false");
  });

  it("returns capabilities for reviewer", () => {
    wrap("reviewer");
    expect(screen.getByTestId("canWrite")).toHaveTextContent("false");
    expect(screen.getByTestId("canApproveMessages")).toHaveTextContent("false");
  });
});
