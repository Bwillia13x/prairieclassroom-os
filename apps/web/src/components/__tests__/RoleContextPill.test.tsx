import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppContext, { type AppContextValue } from "../../AppContext";
import RoleContextPill from "../RoleContextPill";
import type { ClassroomRole } from "../../appReducer";

function makeContext(
  role: ClassroomRole,
  setClassroomRole = vi.fn(),
): AppContextValue {
  return {
    classrooms: [],
    activeClassroom: "demo-classroom",
    activeTab: "today",
    setActiveClassroom: vi.fn(),
    setActiveTab: vi.fn(),
    profile: undefined,
    students: [],
    classroomAccessCodes: {},
    classroomRoles: { "demo-classroom": role },
    activeRole: role,
    setClassroomRole,
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
  };
}

function renderWith(role: ClassroomRole, setClassroomRole?: ReturnType<typeof vi.fn>) {
  const ctx = makeContext(role, setClassroomRole);
  return render(
    <AppContext.Provider value={ctx}>
      <RoleContextPill />
    </AppContext.Provider>,
  );
}

describe("RoleContextPill", () => {
  it("renders the current role label and a color chip keyed to the role", () => {
    renderWith("ea");
    const trigger = screen.getByRole("button", { name: /role\s*ea/i });
    expect(trigger).toBeInTheDocument();
    const chip = trigger.querySelector(".role-pill__chip");
    expect(chip).not.toBeNull();
    expect(chip).toHaveAttribute("data-role", "ea");
  });

  it("opens the role menu on click and exposes all four options", async () => {
    const user = userEvent.setup();
    renderWith("teacher");
    await user.click(screen.getByRole("button", { name: /role\s*teacher/i }));
    const menu = screen.getByRole("menu", { name: /classroom role/i });
    expect(menu).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: /teacher/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("menuitemradio", { name: /^EA/i })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(screen.getByRole("menuitemradio", { name: /substitute/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: /reviewer/i })).toBeInTheDocument();
  });

  it("switches silently between non-teacher roles (no downgrade confirmation)", async () => {
    const user = userEvent.setup();
    const setClassroomRole = vi.fn();
    renderWith("ea", setClassroomRole);
    await user.click(screen.getByRole("button", { name: /role\s*ea/i }));
    await user.click(screen.getByRole("menuitemradio", { name: /substitute/i }));
    expect(setClassroomRole).toHaveBeenCalledWith("demo-classroom", "substitute");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("upgrading to teacher from any role applies immediately (no confirmation)", async () => {
    const user = userEvent.setup();
    const setClassroomRole = vi.fn();
    renderWith("reviewer", setClassroomRole);
    await user.click(screen.getByRole("button", { name: /role\s*reviewer/i }));
    await user.click(screen.getByRole("menuitemradio", { name: /teacher/i }));
    expect(setClassroomRole).toHaveBeenCalledWith("demo-classroom", "teacher");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("downgrading from teacher opens a confirmation alertdialog before applying", async () => {
    const user = userEvent.setup();
    const setClassroomRole = vi.fn();
    renderWith("teacher", setClassroomRole);
    await user.click(screen.getByRole("button", { name: /role\s*teacher/i }));
    await user.click(screen.getByRole("menuitemradio", { name: /substitute/i }));
    // No commit yet — the alertdialog asks for confirmation.
    expect(setClassroomRole).not.toHaveBeenCalled();
    const dialog = screen.getByRole("alertdialog", { name: /confirm role downgrade/i });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent(/substitute/i);
  });

  it("cancel from the confirmation dialog keeps the user as teacher", async () => {
    const user = userEvent.setup();
    const setClassroomRole = vi.fn();
    renderWith("teacher", setClassroomRole);
    await user.click(screen.getByRole("button", { name: /role\s*teacher/i }));
    await user.click(screen.getByRole("menuitemradio", { name: /reviewer/i }));
    await user.click(screen.getByTestId("role-pill-cancel-downgrade"));
    expect(setClassroomRole).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("confirm from the downgrade dialog commits the role change", async () => {
    const user = userEvent.setup();
    const setClassroomRole = vi.fn();
    renderWith("teacher", setClassroomRole);
    await user.click(screen.getByRole("button", { name: /role\s*teacher/i }));
    await user.click(screen.getByRole("menuitemradio", { name: /substitute/i }));
    await user.click(screen.getByTestId("role-pill-confirm-downgrade"));
    expect(setClassroomRole).toHaveBeenCalledWith("demo-classroom", "substitute");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("closes the menu on Escape", async () => {
    const user = userEvent.setup();
    renderWith("teacher");
    await user.click(screen.getByRole("button", { name: /role\s*teacher/i }));
    expect(screen.getByRole("menu", { name: /classroom role/i })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu", { name: /classroom role/i })).not.toBeInTheDocument();
  });
});

describe("RoleContextPill option visuals (radio dot + ACTIVE tag)", () => {
  it("renders a radio dot per option and an ACTIVE tag on the selected role", async () => {
    const user = userEvent.setup();
    renderWith("teacher");
    await user.click(screen.getByRole("button", { name: /role\s*teacher/i }));
    const teacherOpt = screen.getByRole("menuitemradio", { name: /Teacher/ });
    expect(teacherOpt.querySelector(".role-pill__option-radio")).not.toBeNull();
    expect(teacherOpt.querySelector(".role-pill__option-active-tag")?.textContent).toMatch(/active/i);
    const eaOpt = screen.getByRole("menuitemradio", { name: /^EA/ });
    expect(eaOpt.querySelector(".role-pill__option-radio")).not.toBeNull();
    expect(eaOpt.querySelector(".role-pill__option-active-tag")).toBeNull();
  });
});
