import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import AppContext, { type AppContextValue } from "../../AppContext";
import MobileNav from "../MobileNav";

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
    activeTool: null,
    setActiveTool: vi.fn(),
    messagePrefill: null,
    interventionPrefill: null,
    ...overrides,
  };
}

describe("MobileNav", () => {
  it("uses the visible label and badge counts as the group button accessible names", () => {
    // Per the unified narrow/actionable badge rule (docs/spec.md →
    // "Top-nav badge counts"), the Ops badge counts only stale follow-ups
    // and the Review badge counts only reviews approaching due. Patterns
    // and unapproved messages stay visible inside each page's stat cards
    // but are excluded from the nav badge.
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
    expect(screen.getByRole("button", { name: /review\s*4/i })).toBeInTheDocument();
  });

  it("surfaces queued Tomorrow notes as the Tomorrow tab badge and keeps routing intact", () => {
    const onTabChange = vi.fn();
    render(
      <AppContext.Provider
        value={makeContext({
          tomorrowNotes: [{
            id: "mobile-note-1",
            sourcePanel: "differentiate",
            sourceType: "differentiate_material",
            summary: "Carry visual vocabulary forward",
            createdAt: "2026-04-23T10:00:00Z",
          }],
        })}
      >
        <MobileNav activeTab="today" onTabChange={onTabChange} />
      </AppContext.Provider>,
    );

    const tomorrow = screen.getByRole("button", { name: /tomorrow\s*1/i });
    expect(tomorrow).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("mobile-nav-group-tomorrow"));
    expect(onTabChange).toHaveBeenCalledWith("tomorrow");
  });

  it("keeps the shell recommendation rail out of page-owned workspaces", () => {
    const snapshot = {
      panel_statuses: [{
        panel_id: "family-message",
        label: "Messages",
        state: "needs_action",
        dependency_state: "ready",
        pending_count: 2,
        detail: "Draft family follow-ups",
        last_run_at: null,
      }],
    } as AppContextValue["latestTodaySnapshot"];

    const { rerender } = render(
      <AppContext.Provider value={makeContext({ latestTodaySnapshot: snapshot })}>
        <MobileNav activeTab="today" onTabChange={vi.fn()} />
      </AppContext.Provider>,
    );

    for (const tab of ["today", "tomorrow", "week", "classroom", "prep", "ops", "review"] as const) {
      rerender(
        <AppContext.Provider value={makeContext({ latestTodaySnapshot: snapshot })}>
          <MobileNav activeTab={tab} onTabChange={vi.fn()} />
        </AppContext.Provider>,
      );
      expect(screen.queryByText("Recommended now")).not.toBeInTheDocument();
    }
  });
});
