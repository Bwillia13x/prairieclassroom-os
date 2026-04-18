import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AppContext, { type AppContextValue } from "../../AppContext";

const mocks = vi.hoisted(() => ({
  approveFamilyMessage: vi.fn(),
  fetchClassroomHealth: vi.fn(),
  fetchMessageHistory: vi.fn(),
  submitFeedback: vi.fn(),
  refreshHistory: vi.fn(),
}));

vi.mock("../../api", () => ({
  draftFamilyMessage: vi.fn(),
  approveFamilyMessage: mocks.approveFamilyMessage,
  fetchClassroomHealth: mocks.fetchClassroomHealth,
  fetchMessageHistory: mocks.fetchMessageHistory,
  submitFeedbackApi: vi.fn(),
  submitSessionApi: vi.fn(),
}));

vi.mock("../../useAsyncAction", () => ({
  useAsyncAction: () => ({
    loading: false,
    error: null,
    result: {
      draft: {
        draft_id: "draft-1",
        classroom_id: "demo-classroom",
        student_refs: ["Amira"],
        message_type: "routine_update",
        target_language: "English",
        plain_language_text: "Amira had a steady day and completed the reading check-in.",
        teacher_approved: false,
        schema_version: "1",
      },
      model_id: "mock",
      latency_ms: 42,
    },
    execute: vi.fn(),
    reset: vi.fn(),
    cancel: vi.fn(),
  }),
}));

vi.mock("../../hooks/useFeedback", () => ({
  useFeedback: () => ({ submit: mocks.submitFeedback, submitted: false, error: null }),
}));

vi.mock("../../hooks/useHistory", () => ({
  useHistory: () => ({ items: [], loading: false, error: null, refresh: mocks.refreshHistory }),
}));

import FamilyMessagePanel from "../FamilyMessagePanel";

function makeAppContext(): AppContextValue {
  return {
    classrooms: [
      {
        classroom_id: "demo-classroom",
        grade_band: "3-4",
        subject_focus: "cross_curricular",
        classroom_notes: [],
        students: [{ alias: "Amira" }],
        is_demo: true,
      },
    ],
    activeClassroom: "demo-classroom",
    activeTab: "family-message",
    setActiveClassroom: vi.fn(),
    setActiveTab: vi.fn(),
    profile: {
      classroom_id: "demo-classroom",
      grade_band: "3-4",
      subject_focus: "cross_curricular",
      classroom_notes: [],
      students: [{ alias: "Amira" }],
      is_demo: true,
    },
    students: [{ alias: "Amira" }],
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
    removeTomorrowNote: vi.fn(),
  };
}

describe("FamilyMessagePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.approveFamilyMessage.mockResolvedValue(undefined);
    mocks.fetchClassroomHealth.mockResolvedValue({
      classroom_id: "demo-classroom",
      generated_at: new Date().toISOString(),
      streak_days: 0,
      plans_last_7: 0,
      messages_approved: 0,
      messages_total: 0,
      interventions_last_7: 0,
      active_followups: 0,
      debt_total_14d: [],
      plan_count_14d: [],
      intervention_count_14d: [],
    });
    mocks.fetchMessageHistory.mockResolvedValue([]);
  });

  it("can be imported without error", async () => {
    expect(FamilyMessagePanel).toBeDefined();
  });

  it("persists approval edits, updates the visible approval state, and does not expose fake undo", async () => {
    const appContext = makeAppContext();
    const user = userEvent.setup();
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    render(
      <AppContext.Provider value={appContext}>
        <FamilyMessagePanel prefill={null} />
      </AppContext.Provider>,
    );

    await user.click(screen.getByRole("button", { name: "Review approval" }));

    const textarea = await screen.findByLabelText(/Family message text/i);
    await user.clear(textarea);
    await user.type(textarea, "Edited family message.");
    await user.click(screen.getByRole("button", { name: "Approve & Copy" }));

    await waitFor(() => {
      expect(mocks.approveFamilyMessage).toHaveBeenCalledWith(
        "demo-classroom",
        "draft-1",
        "Edited family message.",
      );
    });

    expect(mockWriteText).toHaveBeenCalledWith("Edited family message.");
    expect(appContext.showSuccess).toHaveBeenCalledTimes(1);
    expect(appContext.showSuccess).toHaveBeenCalledWith("Message approved and copied");
    expect(appContext.showUndo).not.toHaveBeenCalled();
    expect(await screen.findByRole("button", { name: "Approved" })).toBeDisabled();
    expect(screen.getByText("Edited by teacher")).toBeInTheDocument();
  });
});
