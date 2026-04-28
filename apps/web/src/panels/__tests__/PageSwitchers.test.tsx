import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import AppContext, { type AppContextValue } from "../../AppContext";
import PrepPanel from "../PrepPanel";
import TomorrowPanel from "../TomorrowPanel";
import OpsPanel from "../OpsPanel";
import ReviewPanel from "../ReviewPanel";

vi.mock("../TomorrowPlanPanel", () => ({ default: () => <div>Tomorrow Plan surface</div> }));
vi.mock("../ForecastPanel", () => ({ default: () => <div>Forecast surface</div> }));
vi.mock("../DifferentiatePanel", () => ({ default: () => <div>Differentiate surface</div> }));
vi.mock("../LanguageToolsPanel", () => ({ default: () => <div>Language Tools surface</div> }));
vi.mock("../InterventionPanel", () => ({ default: () => <div>Intervention surface</div> }));
vi.mock("../EABriefingPanel", () => ({ default: () => <div>EA Briefing surface</div> }));
vi.mock("../EALoadPanel", () => ({ default: () => <div>EA Load surface</div> }));
vi.mock("../SurvivalPacketPanel", () => ({ default: () => <div>Sub Packet surface</div> }));
vi.mock("../FamilyMessagePanel", () => ({ default: () => <div>Family Message surface</div> }));
vi.mock("../SupportPatternsPanel", () => ({ default: () => <div>Support Patterns surface</div> }));
vi.mock("../UsageInsightsPanel", () => ({ default: () => <div>Usage Insights surface</div> }));
vi.mock("../../components/PrepSectionIntro", () => ({ default: () => <div>Prep intro</div> }));
vi.mock("../../components/OpsSectionHint", () => ({ default: () => <div>Ops hint</div> }));

function makeContext(overrides: Partial<AppContextValue> = {}): AppContextValue {
  return {
    classrooms: [],
    activeClassroom: "demo-classroom",
    activeTab: "today",
    activeTool: null,
    setActiveClassroom: vi.fn(),
    setActiveTab: vi.fn(),
    setActiveTool: vi.fn(),
    latestTodaySnapshot: null,
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
    messagePrefill: null,
    interventionPrefill: null,
    ...overrides,
  };
}

function renderWithContext(ui: ReactElement, overrides: Partial<AppContextValue> = {}) {
  const setActiveTool = vi.fn();
  render(
    <AppContext.Provider value={makeContext({ setActiveTool, ...overrides })}>
      {ui}
    </AppContext.Provider>,
  );
  return { setActiveTool };
}

describe("multi-tool page switchers", () => {
  it("renders the Tomorrow planning hub and stateful tool cards", () => {
    renderWithContext(
      <TomorrowPanel onFollowupClick={vi.fn()} onInterventionClick={vi.fn()} />,
      { activeTab: "tomorrow", activeTool: "tomorrow-plan" },
    );

    // Hub now uses the shared PageHero primitive — the region label is
    // "Tomorrow planning hub" rather than the prior bespoke phrase.
    expect(
      screen.getByRole("region", { name: /tomorrow planning hub/i }),
    ).toBeInTheDocument();
    // Plan / Forecast / Carry-forward are the three labeled metric
    // groups inside the PageHero. We verify the label rendered at
    // least once in the heading region.
    expect(
      screen.getByRole("heading", { name: /plan, forecast, and carry-forward queue/i }),
    ).toBeInTheDocument();

    const switcher = screen.getByRole("tablist", { name: /tomorrow tool/i });
    expect(within(switcher).getByRole("tab", { name: /01 planning order/i })).toHaveTextContent("Plan not generated");
    expect(within(switcher).getByRole("tab", { name: /02 block risk/i })).toHaveTextContent("Forecast not generated");
  });

  it("renders and updates the Tomorrow page switcher", () => {
    const { setActiveTool } = renderWithContext(
      <TomorrowPanel onFollowupClick={vi.fn()} onInterventionClick={vi.fn()} />,
      { activeTab: "tomorrow", activeTool: "complexity-forecast" },
    );

    const switcher = screen.getByRole("tablist", { name: /tomorrow tool/i });
    expect(within(switcher).getByRole("tab", { name: /forecast/i })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(within(switcher).getByRole("tab", { name: /tomorrow plan/i }));
    expect(setActiveTool).toHaveBeenCalledWith("tomorrow-plan");
  });

  it("renders and updates the Prep page switcher", () => {
    const { setActiveTool } = renderWithContext(
      <PrepPanel />,
      { activeTab: "prep", activeTool: "differentiate" },
    );

    expect(screen.getByRole("region", { name: /prep command/i })).toBeInTheDocument();
    expect(screen.getByText("Differentiate surface")).toBeInTheDocument();
    const switcher = screen.getByRole("tablist", { name: /prep tool/i });
    expect(within(switcher).getByRole("tab", { name: /differentiate/i })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(within(switcher).getByRole("tab", { name: /language tools/i }));
    expect(setActiveTool).toHaveBeenCalledWith("language-tools");
  });

  it("defaults Prep to the artifact intake workspace when no tool is selected", () => {
    renderWithContext(
      <PrepPanel />,
      { activeTab: "prep", activeTool: null },
    );

    expect(screen.getByText("Differentiate surface")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /differentiate/i })).toHaveAttribute("aria-selected", "true");
  });

  it("renders and updates the Ops page switcher", () => {
    const { setActiveTool } = renderWithContext(
      <OpsPanel />,
      { activeTab: "ops", activeTool: "ea-load" },
    );

    const switcher = screen.getByRole("navigation", { name: /ops workflow/i });
    expect(within(switcher).getByText(/ea load/i)).toBeInTheDocument();

    fireEvent.click(within(switcher).getByRole("tab", { name: /sub packet/i }));
    expect(setActiveTool).toHaveBeenCalledWith("survival-packet");
  });

  it("defaults Ops to intervention logging when no tool is selected", () => {
    renderWithContext(
      <OpsPanel />,
      { activeTab: "ops", activeTool: null },
    );

    expect(screen.getByText("Intervention surface")).toBeInTheDocument();
    const switcher = screen.getByRole("navigation", { name: /ops workflow/i });
    expect(within(switcher).getByRole("tab", { name: /log intervention/i })).toHaveAttribute("aria-selected", "true");
  });

  it("renders and updates the Review page switcher", () => {
    const { setActiveTool } = renderWithContext(
      <ReviewPanel onFollowupClick={vi.fn()} onInterventionClick={vi.fn()} />,
      { activeTab: "review", activeTool: "usage-insights" },
    );

    const switcher = screen.getByRole("tablist", { name: /review tool/i });
    expect(within(switcher).getByRole("tab", { name: /usage insights/i })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(within(switcher).getByRole("tab", { name: /support patterns/i }));
    expect(setActiveTool).toHaveBeenCalledWith("support-patterns");
  });

  it("keeps the detailed Tomorrow queue on the Tomorrow page", () => {
    const removeTomorrowNote = vi.fn();
    const { setActiveTool } = renderWithContext(
      <TomorrowPanel onFollowupClick={vi.fn()} onInterventionClick={vi.fn()} />,
      {
        activeTab: "tomorrow",
        activeTool: "complexity-forecast",
        removeTomorrowNote,
        tomorrowNotes: [{
          id: "queue-note-1",
          sourcePanel: "differentiate",
          sourceType: "differentiate_material",
          summary: "Carry sentence frames into tomorrow",
          createdAt: "2026-04-23T10:00:00Z",
        }],
      },
    );

    expect(screen.getByRole("region", { name: /queued tomorrow plan items/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /tomorrow plan has 1 queued item/i }));
    expect(screen.getByRole("dialog", { name: /queued for tomorrow plan/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /review all/i }));
    expect(setActiveTool).toHaveBeenCalledWith("tomorrow-plan");
  });
});
