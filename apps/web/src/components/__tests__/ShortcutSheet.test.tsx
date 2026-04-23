import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AppContext, { type AppContextValue } from "../../AppContext";
import ShortcutSheet from "../ShortcutSheet";

function makeContext(overrides: Partial<AppContextValue> = {}): AppContextValue {
  return {
    classrooms: [],
    activeClassroom: "demo",
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

function renderWith(open: boolean, onClose: () => void, ctx: AppContextValue = makeContext()) {
  return render(
    <AppContext.Provider value={ctx}>
      <ShortcutSheet open={open} onClose={onClose} />
    </AppContext.Provider>,
  );
}

describe("ShortcutSheet", () => {
  it("renders nothing when closed", () => {
    renderWith(false, () => {});
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders global shortcuts and the per-page map when open", () => {
    renderWith(true, () => {});
    expect(screen.getByRole("dialog", { name: /keyboard shortcuts/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^global$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /jump to page/i })).toBeInTheDocument();
    // The new seven-view shell lists Classroom (1) through Review (7).
    expect(screen.getByText("Classroom")).toBeInTheDocument();
    expect(screen.getByText("Tomorrow")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
  });

  it("disables reset-tips when no hints have been dismissed", () => {
    renderWith(true, () => {}, makeContext({ featuresSeen: {} }));
    const btn = screen.getByRole("button", { name: /no panel tips to restore/i });
    expect(btn).toBeDisabled();
  });

  it("dispatches RESET_FEATURES_SEEN when reset-tips is clicked", () => {
    const dispatch = vi.fn();
    const onClose = vi.fn();
    renderWith(true, onClose, makeContext({
      dispatch,
      featuresSeen: { differentiate: true, "family-message": true },
    }));
    const btn = screen.getByRole("button", { name: /restore 2 dismissed panel tips/i });
    fireEvent.click(btn);
    expect(dispatch).toHaveBeenCalledWith({ type: "RESET_FEATURES_SEEN" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    renderWith(true, onClose);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    renderWith(true, onClose);
    fireEvent.click(screen.getByTestId("shortcut-sheet-backdrop"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
