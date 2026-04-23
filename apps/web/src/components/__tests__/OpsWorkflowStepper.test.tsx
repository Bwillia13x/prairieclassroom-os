import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import AppContext, { type AppContextValue } from "../../AppContext";
import type { ActiveTool } from "../../appReducer";
import OpsWorkflowStepper, { OPS_STEPS } from "../OpsWorkflowStepper";

const mockSetActiveTool = vi.fn();

function makeContext(overrides: Partial<AppContextValue> = {}): AppContextValue {
  return {
    classrooms: [],
    activeClassroom: "",
    activeTab: "ops",
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
    streaming: { active: false, phase: "idle", thinkingText: "", partialSections: [], progress: 0, elapsedSeconds: 0 },
    toasts: [],
    featuresSeen: {},
    submitFeedback: vi.fn(),
    showUndo: vi.fn(),
    dismissToast: vi.fn(),
    tomorrowNotes: [],
    appendTomorrowNote: vi.fn(),
    removeTomorrowNote: vi.fn(),
    activeTool: null,
    setActiveTool: mockSetActiveTool,
    messagePrefill: null,
    interventionPrefill: null,
    ...overrides,
  } as AppContextValue;
}

function renderStepper(activeTool: ActiveTool | null) {
  return render(
    <AppContext.Provider value={makeContext()}>
      <OpsWorkflowStepper activeTool={activeTool} />
    </AppContext.Provider>,
  );
}

describe("OpsWorkflowStepper", () => {
  beforeEach(() => {
    mockSetActiveTool.mockReset();
  });

  it("renders the four ops-page tools (Tomorrow Plan and Forecast live on the Tomorrow page now)", () => {
    renderStepper("log-intervention");
    const nav = screen.getByRole("navigation", { name: /ops workflow/i });
    const items = within(nav).getAllByRole("listitem");
    expect(items).toHaveLength(4);
  });

  it("marks the active step with aria-current=step", () => {
    renderStepper("ea-briefing");
    const items = screen.getAllByRole("listitem");
    const active = items.find((li) => li.getAttribute("aria-current") === "step");
    expect(active).toBeDefined();
    expect(active!.textContent).toContain("EA Brief");
  });

  it("renders non-active steps as clickable buttons", () => {
    renderStepper("log-intervention");
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
  });

  it("calls setActiveTool when a non-active step is clicked", async () => {
    const user = userEvent.setup();
    renderStepper("log-intervention");
    const briefingBtn = screen.getByRole("button", { name: /ea brief/i });
    await user.click(briefingBtn);
    expect(mockSetActiveTool).toHaveBeenCalledWith("ea-briefing");
  });

  it("keeps full step names in button accessibility labels on narrow layouts", () => {
    renderStepper("log-intervention");
    expect(screen.getByRole("button", { name: "Step 2: EA Brief" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Step 3: EA Load" })).toBeInTheDocument();
  });

  it("applies completed class to steps before the active step", () => {
    renderStepper("ea-load");
    const items = screen.getAllByRole("listitem");
    expect(items[0].className).toContain("completed");
    expect(items[1].className).toContain("completed");
    expect(items[2].className).toContain("active");
  });

  it("exports OPS_STEPS with 4 entries mapped to ops-page tool ids", () => {
    expect(OPS_STEPS).toHaveLength(4);
    const tools = OPS_STEPS.map((s) => s.tool);
    expect(tools).toEqual([
      "log-intervention",
      "ea-briefing",
      "ea-load",
      "survival-packet",
    ]);
  });
});
