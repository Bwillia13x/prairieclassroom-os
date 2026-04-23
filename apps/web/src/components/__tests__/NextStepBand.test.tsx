import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import AppContext, { type AppContextValue } from "../../AppContext";
import type { NavTarget } from "../../appReducer";
import NextStepBand from "../NextStepBand";

const mockSetActiveTab = vi.fn();

function makeContext(overrides: Partial<AppContextValue> = {}): AppContextValue {
  return {
    classrooms: [],
    activeClassroom: "",
    activeTab: "tomorrow",
    setActiveClassroom: vi.fn(),
    setActiveTab: mockSetActiveTab,
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

function renderBand(label: string, targetTab: NavTarget) {
  return render(
    <AppContext.Provider value={makeContext()}>
      <NextStepBand label={label} targetTab={targetTab} />
    </AppContext.Provider>,
  );
}

describe("NextStepBand", () => {
  beforeEach(() => {
    mockSetActiveTab.mockReset();
  });

  it("renders the 'Next best step' prefix next to the action label", () => {
    renderBand("Open Forecast", "complexity-forecast");
    const band = screen.getByTestId("next-step-band");
    expect(band).toHaveTextContent(/next best step/i);
    expect(band).toHaveTextContent(/open forecast/i);
  });

  it("exposes an accessible label that includes the action label", () => {
    renderBand("Build EA Briefing", "ea-briefing");
    const btn = screen.getByRole("button", { name: /next best step: build ea briefing/i });
    expect(btn).toBeInTheDocument();
  });

  it("invokes setActiveTab with the provided targetTab when clicked", async () => {
    const user = userEvent.setup();
    renderBand("Open Forecast", "complexity-forecast");
    await user.click(screen.getByRole("button", { name: /next best step: open forecast/i }));
    expect(mockSetActiveTab).toHaveBeenCalledWith("complexity-forecast");
  });

  it("routes to a different tab when targetTab changes", async () => {
    const user = userEvent.setup();
    renderBand("Build EA Briefing", "ea-briefing");
    await user.click(screen.getByRole("button", { name: /next best step: build ea briefing/i }));
    expect(mockSetActiveTab).toHaveBeenCalledWith("ea-briefing");
  });
});
