import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppContext, { type AppContextValue } from "../../AppContext";
import RolePromptDialog from "../RolePromptDialog";

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
    classroomRoles: {},
    activeRole: "teacher",
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
    ...overrides,
  };
}

function renderDialog(
  classroomId: string,
  overrides: Partial<AppContextValue> = {},
) {
  const ctx = makeContext(overrides);
  return {
    ctx,
    ...render(
      <AppContext.Provider value={ctx}>
        <RolePromptDialog classroomId={classroomId} />
      </AppContext.Provider>,
    ),
  };
}

describe("RolePromptDialog", () => {
  it("renders a dialog with four role radio options", () => {
    renderDialog("c1");
    expect(screen.getByRole("dialog", { name: /choose your role/i })).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(4);
  });

  it("defaults to teacher selected", () => {
    renderDialog("c1");
    const teacher = screen.getByRole("radio", { name: /teacher/i }) as HTMLInputElement;
    expect(teacher.checked).toBe(true);
  });

  it("calls setClassroomRole and dispatches CLOSE_ROLE_PROMPT on confirm", async () => {
    const user = userEvent.setup();
    const setClassroomRole = vi.fn();
    const dispatch = vi.fn();
    renderDialog("c1", { setClassroomRole, dispatch });

    const ea = screen.getByRole("radio", { name: /^EA/i });
    await user.click(ea);
    await user.click(screen.getByRole("button", { name: /confirm/i }));

    expect(setClassroomRole).toHaveBeenCalledWith("c1", "ea");
    expect(dispatch).toHaveBeenCalledWith({ type: "CLOSE_ROLE_PROMPT" });
  });

  it("dispatches CLOSE_ROLE_PROMPT when dismissed without confirming", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    const setClassroomRole = vi.fn();
    renderDialog("c1", { dispatch, setClassroomRole });

    await user.click(screen.getByRole("button", { name: /skip/i }));

    expect(setClassroomRole).toHaveBeenCalledWith("c1", "teacher");
    expect(dispatch).toHaveBeenCalledWith({ type: "CLOSE_ROLE_PROMPT" });
  });
});
