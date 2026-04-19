/**
 * OpsSectionHint — shows the section-level OPS introduction once, then
 * marks the feature seen and never renders again. Covers dispatch wiring
 * only; the legacy-key migration lives in App.tsx and is exercised by
 * OpsSectionHint.migration.test.tsx.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppContext, { type AppContextValue } from "../../AppContext";
import OpsSectionHint from "../OpsSectionHint";

function baseCtx(overrides: Partial<AppContextValue> = {}): AppContextValue {
  return {
    classrooms: [],
    activeClassroom: "",
    activeTab: "log-intervention",
    setActiveClassroom: vi.fn(),
    setActiveTab: vi.fn(),
    profile: undefined as unknown as AppContextValue["profile"],
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
    ...overrides,
  } as AppContextValue;
}

describe("OpsSectionHint", () => {
  it("renders when ops-section has not been seen", () => {
    render(
      <AppContext.Provider value={baseCtx()}>
        <OpsSectionHint />
      </AppContext.Provider>,
    );
    expect(screen.getByText(/Operations tools/i)).toBeInTheDocument();
  });

  it("renders nothing when ops-section has been dismissed", () => {
    const ctx = baseCtx({ featuresSeen: { "ops-section": true } });
    render(
      <AppContext.Provider value={ctx}>
        <OpsSectionHint />
      </AppContext.Provider>,
    );
    expect(screen.queryByText(/Operations tools/i)).not.toBeInTheDocument();
  });

  it("dispatches MARK_FEATURE_SEEN('ops-section') when the 'Got it' button is clicked", () => {
    const dispatch = vi.fn();
    const ctx = baseCtx({ dispatch });
    render(
      <AppContext.Provider value={ctx}>
        <OpsSectionHint />
      </AppContext.Provider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /dismiss operations tip/i }));
    expect(dispatch).toHaveBeenCalledWith({
      type: "MARK_FEATURE_SEEN",
      feature: "ops-section",
    });
  });
});
