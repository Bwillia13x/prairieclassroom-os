import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AppContext, { type AppContextValue } from "../../AppContext";
import { useRole, roleCapabilities, roleDisabledReason } from "../useRole";
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
    removeTomorrowNote: vi.fn(),
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
  it("teacher has every capability", () => {
    const caps = roleCapabilities("teacher");
    expect(caps.role).toBe("teacher");
    expect(caps.canWrite).toBe(true);
    expect(caps.canGenerate).toBe(true);
    expect(caps.canApproveMessages).toBe(true);
    expect(caps.canApprove).toBe(true);
    expect(caps.canLogInterventions).toBe(true);
    expect(caps.canEditSchedule).toBe(true);
    expect(caps.canGenerateEABriefing).toBe(true);
    expect(caps.canUseEALoad).toBe(true);
    expect(caps.canViewPlanning).toBe(true);
    expect(caps.canViewToday).toBe(true);
    expect(caps.canViewUsageInsights).toBe(true);
  });

  it("ea can log interventions, generate EA briefing, use EA load, and view today/insights — but cannot approve messages, edit schedule, generate planning content, or view planning history", () => {
    const caps = roleCapabilities("ea");
    expect(caps.canWrite).toBe(true);
    expect(caps.canGenerate).toBe(false);
    expect(caps.canApproveMessages).toBe(false);
    expect(caps.canApprove).toBe(false);
    expect(caps.canLogInterventions).toBe(true);
    expect(caps.canEditSchedule).toBe(false);
    expect(caps.canGenerateEABriefing).toBe(true);
    expect(caps.canUseEALoad).toBe(true);
    expect(caps.canViewPlanning).toBe(false);
    expect(caps.canViewToday).toBe(true);
    expect(caps.canViewUsageInsights).toBe(true);
  });

  it("substitute can log interventions, generate EA briefing (handoff), and view today — but cannot approve, use EA load, view planning history, or view usage insights", () => {
    const caps = roleCapabilities("substitute");
    expect(caps.canWrite).toBe(true);
    expect(caps.canGenerate).toBe(false);
    expect(caps.canApproveMessages).toBe(false);
    expect(caps.canApprove).toBe(false);
    expect(caps.canLogInterventions).toBe(true);
    expect(caps.canEditSchedule).toBe(false);
    expect(caps.canGenerateEABriefing).toBe(true);
    expect(caps.canUseEALoad).toBe(false);
    expect(caps.canViewPlanning).toBe(false);
    expect(caps.canViewToday).toBe(true);
    expect(caps.canViewUsageInsights).toBe(false);
  });

  it("reviewer is fully read-only — no writes, generations, or approvals — but can view planning archives and usage insights", () => {
    const caps = roleCapabilities("reviewer");
    expect(caps.canWrite).toBe(false);
    expect(caps.canGenerate).toBe(false);
    expect(caps.canApproveMessages).toBe(false);
    expect(caps.canApprove).toBe(false);
    expect(caps.canLogInterventions).toBe(false);
    expect(caps.canEditSchedule).toBe(false);
    expect(caps.canGenerateEABriefing).toBe(false);
    expect(caps.canUseEALoad).toBe(false);
    expect(caps.canViewPlanning).toBe(true);
    expect(caps.canViewToday).toBe(false);
    expect(caps.canViewUsageInsights).toBe(true);
  });
});

describe("roleDisabledReason — per-role copy", () => {
  it("returns null for a capability the role has (no disabled reason needed)", () => {
    expect(roleDisabledReason("teacher", "canGenerate")).toBeNull();
    expect(roleDisabledReason("ea", "canLogInterventions")).toBeNull();
    expect(roleDisabledReason("reviewer", "canViewPlanning")).toBeNull();
  });

  it("returns a teacher-switch hint for EA-blocked capabilities", () => {
    const reason = roleDisabledReason("ea", "canGenerate");
    expect(reason).not.toBeNull();
    expect(reason).toMatch(/EA/);
    expect(reason).toMatch(/Teacher/);
  });

  it("returns a substitute-scope hint for substitute-blocked capabilities", () => {
    const reason = roleDisabledReason("substitute", "canApprove");
    expect(reason).not.toBeNull();
    expect(reason).toMatch(/Substitute/);
  });

  it("returns a read-only hint for reviewer-blocked capabilities", () => {
    const reason = roleDisabledReason("reviewer", "canGenerate");
    expect(reason).not.toBeNull();
    expect(reason).toMatch(/read-only/i);
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
