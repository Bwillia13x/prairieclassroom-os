import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AppContext, { type AppContextValue } from "../../AppContext";

const mocks = vi.hoisted(() => {
  const populatedDraftResult = {
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
  };
  return {
    approveFamilyMessage: vi.fn(),
    fetchClassroomHealth: vi.fn(),
    fetchMessageHistory: vi.fn(),
    submitFeedback: vi.fn(),
    refreshHistory: vi.fn(),
    populatedDraftResult,
    draftActionState: {
      loading: false,
      error: null as string | null,
      result: populatedDraftResult as typeof populatedDraftResult | null,
    },
  };
});

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
    loading: mocks.draftActionState.loading,
    error: mocks.draftActionState.error,
    result: mocks.draftActionState.result,
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
    activeTab: "review",
    activeTool: "family-message",
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
    setActiveTool: vi.fn(),
    messagePrefill: null,
    interventionPrefill: null,
  };
}

describe("FamilyMessagePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.draftActionState.loading = false;
    mocks.draftActionState.error = null;
    mocks.draftActionState.result = mocks.populatedDraftResult;
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

  it("tells the teacher that nothing sends automatically before they approve", () => {
    const appContext = makeAppContext();
    render(
      <AppContext.Provider value={appContext}>
        <FamilyMessagePanel prefill={null} />
      </AppContext.Provider>,
    );

    // The rail ContextualHint anchors the approval gate by stating the product
    // boundary in plain copy. Multiple surfaces may carry the same phrase
    // (rail hint + empty-state hint); assert at least one is present.
    const mentions = screen.getAllByText(/nothing sends automatically/i);
    expect(mentions.length).toBeGreaterThan(0);
  });

  it("does not render the Pipeline summary card overlapping the empty state", () => {
    // T7: Closes QA m3. The empty-state canvas previously rendered the
    // MessageApprovalFunnel ("MESSAGE PIPELINE / X% APPROVAL RATE") with
    // synthetic minimum values alongside the placeholder cue, producing a
    // ghosted overlap that read as a CSS stacking glitch. The placeholder
    // now stands alone in the empty state; the funnel still appears in the
    // rail when real classroom-health data is available.
    mocks.draftActionState.result = null;
    const appContext = makeAppContext();
    render(
      <AppContext.Provider value={appContext}>
        <FamilyMessagePanel prefill={null} />
      </AppContext.Provider>,
    );

    expect(screen.getByText(/pick students to draft a message/i)).toBeInTheDocument();
    expect(screen.queryByText(/message pipeline/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/approval rate/i)).not.toBeInTheDocument();
  });

  it("gives the result canvas priority once a draft is visible", () => {
    const appContext = makeAppContext();
    const { container } = render(
      <AppContext.Provider value={appContext}>
        <FamilyMessagePanel prefill={null} />
      </AppContext.Provider>,
    );

    const layout = container.querySelector(".workspace-layout");
    expect(layout).toBeTruthy();
    expect(layout).toHaveAttribute("data-layout", "split");
    expect(layout).toHaveAttribute("data-split-state", "output");
  });

  it("renders family follow-up coverage as an in-flow strip so it cannot cover the composer", () => {
    const appContext = {
      ...makeAppContext(),
      latestTodaySnapshot: {
        student_threads: [
          {
            alias: "Amira",
            thread_count: 0,
            pending_action_count: 0,
            last_intervention_days: 1,
            eal_flag: false,
            support_tags: [],
            actions: [],
            priority_reason: "Amira is ready for a routine family update.",
          },
        ],
      } as unknown as AppContextValue["latestTodaySnapshot"],
    };

    const { container } = render(
      <AppContext.Provider value={appContext}>
        <FamilyMessagePanel prefill={null} />
      </AppContext.Provider>,
    );

    const coverage = container.querySelector(".student-coverage");
    expect(coverage).toHaveClass("student-coverage--static");
    expect(coverage).toHaveAttribute("data-pinned", "false");
    expect(container.querySelector(".student-coverage__sentinel")).toBeNull();
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

    expect(screen.getByRole("button", { name: "Approve to copy" })).toBeDisabled();

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
    expect(screen.getByRole("button", { name: "Copy" })).toBeEnabled();
    expect(screen.getByText("Edited by teacher")).toBeInTheDocument();
  });
});
