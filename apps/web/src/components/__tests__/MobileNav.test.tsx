import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AppContext, { type AppContextValue } from "../../AppContext";
import MobileNav from "../MobileNav";

function makeContext(): AppContextValue {
  return {
    classrooms: [],
    activeClassroom: "demo-classroom",
    activeTab: "today",
    setActiveClassroom: vi.fn(),
    setActiveTab: vi.fn(),
    profile: undefined,
    students: [],
    classroomAccessCodes: {},
    classroomRoles: { "demo-classroom": "teacher" },
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
  };
}

describe("MobileNav", () => {
  it("uses the visible label and badge counts as the group button accessible names", () => {
    render(
      <AppContext.Provider value={makeContext()}>
        <MobileNav
          activeTab="today"
          onTabChange={vi.fn()}
          debtCounts={{
            stale_followup: 8,
            unapproved_message: 3,
            unaddressed_pattern: 2,
            approaching_review: 4,
          }}
        />
      </AppContext.Provider>,
    );

    expect(screen.getByRole("button", { name: /ops\s*8/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /review\s*9/i })).toBeInTheDocument();
  });
});