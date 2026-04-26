import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AppContext, { type AppContextValue } from "../../AppContext";
import { ApiError } from "../../api";

const mocks = vi.hoisted(() => ({
  differentiate: vi.fn(),
  fetchClassroomHealth: vi.fn(),
}));

vi.mock("../../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api")>();
  return {
    ...actual,
    differentiate: mocks.differentiate,
    fetchClassroomHealth: mocks.fetchClassroomHealth,
  };
});

vi.mock("../../hooks/useFeedback", () => ({
  useFeedback: () => ({ submit: vi.fn(), submitted: false, error: null }),
}));

import DifferentiatePanel from "../DifferentiatePanel";

function makeContext(showError: AppContextValue["showError"]): AppContextValue {
  return {
    classrooms: [
      {
        classroom_id: "demo",
        grade_band: "3-4",
        subject_focus: "cross_curricular",
        classroom_notes: [],
        students: [{ alias: "Amira" }],
        is_demo: true,
      },
    ] as never,
    activeClassroom: "demo",
    activeTab: "prep",
    activeTool: "differentiate",
    setActiveClassroom: vi.fn(),
    setActiveTab: vi.fn(),
    profile: {
      classroom_id: "demo",
      grade_band: "3-4",
      subject_focus: "cross_curricular",
      classroom_notes: [],
      students: [{ alias: "Amira" }],
      is_demo: true,
    } as never,
    students: [{ alias: "Amira" }],
    classroomAccessCodes: {},
    classroomRoles: {},
    activeRole: "teacher" as const,
    setClassroomRole: vi.fn(),
    authPrompt: null,
    showSuccess: vi.fn(),
    showError,
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
    setActiveTool: vi.fn(),
    messagePrefill: null,
    interventionPrefill: null,
  };
}

describe("DifferentiatePanel — global toast on generation failure (T9)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls showError with a panel-prefixed message when differentiate fails", async () => {
    mocks.differentiate.mockRejectedValueOnce(new ApiError(500, { error: "boom" }));
    const showError = vi.fn();
    const user = userEvent.setup();

    render(
      <AppContext.Provider value={makeContext(showError)}>
        <DifferentiatePanel />
      </AppContext.Provider>,
    );

    await user.type(
      screen.getByLabelText(/artifact title/i),
      "Sample lesson",
    );
    await user.click(screen.getByRole("tab", { name: /paste/i }));
    const pasteArea = await screen.findByPlaceholderText(/paste or type the lesson content/i);
    await user.type(
      pasteArea,
      "This is the lesson source text the teacher pasted into the panel.",
    );

    await user.click(screen.getByRole("button", { name: /generate variants/i }));

    await waitFor(() => {
      expect(showError).toHaveBeenCalledWith(
        expect.stringMatching(/couldn't generate variants/i),
      );
    });
  });
});
