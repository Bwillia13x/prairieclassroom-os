import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import AppContext, { type AppContextValue } from "../../AppContext";
import StudentRoster from "../StudentRoster";

vi.mock("../../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api")>();
  return { ...actual, fetchStudentSummary: vi.fn() };
});

function makeAppContext(): AppContextValue {
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
    activeRole: "teacher" as const,
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

function renderRoster(attentionCount: number) {
  return render(
    <AppContext.Provider value={makeAppContext()}>
      <StudentRoster attentionCount={attentionCount} onDrillDown={vi.fn()} />
    </AppContext.Provider>,
  );
}

describe("StudentRoster — audit #29/#30", () => {
  it("labels the footer badge as 'students with open items' (audit #29)", () => {
    renderRoster(23);
    expect(
      screen.getByRole("button", { name: /23 students with open items/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/need attention/i)).toBeNull();
  });

  it("uses singular 'student' when attentionCount is 1", () => {
    renderRoster(1);
    expect(
      screen.getByRole("button", { name: /1 student with open items/i }),
    ).toBeInTheDocument();
  });

  it("wraps the roster in a banded strip (audit #30)", () => {
    renderRoster(23);
    const strip = screen.getByTestId("student-roster-strip");
    expect(strip.className).toMatch(/student-roster--banded/);
  });

  it("uses generic 'Students' label when no attention count is present", () => {
    renderRoster(0);
    // No badge should be rendered, but the base button still exists.
    expect(
      screen.getByRole("button", { name: /^Students$/i }),
    ).toBeInTheDocument();
  });
});
