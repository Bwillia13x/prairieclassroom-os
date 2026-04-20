import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import AppContext, { type AppContextValue } from "../../AppContext";
import OpsWorkflowStepper, { OPS_STEPS } from "../OpsWorkflowStepper";

const mockSetActiveTab = vi.fn();

function makeContext(overrides: Partial<AppContextValue> = {}): AppContextValue {
  return {
    classrooms: [],
    activeClassroom: "",
    activeTab: "log-intervention",
    setActiveClassroom: vi.fn(),
    setActiveTab: mockSetActiveTab,
    profile: null,
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
    ...overrides,
  } as AppContextValue;
}

function renderStepper(activeTab: string) {
  return render(
    <AppContext.Provider value={makeContext()}>
      <OpsWorkflowStepper activeTab={activeTab as any} />
    </AppContext.Provider>,
  );
}

describe("OpsWorkflowStepper", () => {
  beforeEach(() => {
    mockSetActiveTab.mockReset();
  });

  it("renders all 6 ops steps", () => {
    renderStepper("log-intervention");
    const nav = screen.getByRole("navigation", { name: /ops workflow/i });
    const items = within(nav).getAllByRole("listitem");
    expect(items).toHaveLength(6);
  });

  it("marks the active step with aria-current=step", () => {
    renderStepper("complexity-forecast");
    const items = screen.getAllByRole("listitem");
    const active = items.find((li) => li.getAttribute("aria-current") === "step");
    expect(active).toBeDefined();
    expect(active!.textContent).toContain("Forecast");
  });

  it("renders non-active steps as clickable buttons", () => {
    renderStepper("log-intervention");
    const buttons = screen.getAllByRole("button");
    // 5 non-active steps should be buttons
    expect(buttons).toHaveLength(5);
  });

  it("calls setActiveTab when a non-active step is clicked", async () => {
    const user = userEvent.setup();
    renderStepper("log-intervention");
    const planBtn = screen.getByRole("button", { name: /plan/i });
    await user.click(planBtn);
    expect(mockSetActiveTab).toHaveBeenCalledWith("tomorrow-plan");
  });

  it("keeps full step names in button accessibility labels on narrow layouts", () => {
    renderStepper("log-intervention");
    expect(screen.getByRole("button", { name: "Step 2: Plan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Step 3: Forecast" })).toBeInTheDocument();
  });

  it("applies completed class to steps before the active step", () => {
    renderStepper("ea-briefing");
    const items = screen.getAllByRole("listitem");
    // Steps 0,1,2 (Log, Plan, Forecast) should be completed
    expect(items[0].className).toContain("completed");
    expect(items[1].className).toContain("completed");
    expect(items[2].className).toContain("completed");
    // Step 3 (EA Brief) should be active
    expect(items[3].className).toContain("active");
  });

  it("exports OPS_STEPS with 6 entries matching ops tab IDs", () => {
    expect(OPS_STEPS).toHaveLength(6);
    const tabs = OPS_STEPS.map((s) => s.tab);
    expect(tabs).toContain("log-intervention");
    expect(tabs).toContain("tomorrow-plan");
    expect(tabs).toContain("complexity-forecast");
    expect(tabs).toContain("ea-briefing");
    expect(tabs).toContain("ea-load");
    expect(tabs).toContain("survival-packet");
  });
});
