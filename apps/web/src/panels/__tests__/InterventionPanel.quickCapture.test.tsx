import { render, screen, waitFor, waitForElementToBeRemoved } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, beforeEach, expect } from "vitest";
import AppContext, { type AppContextValue } from "../../AppContext";
import InterventionPanel from "../InterventionPanel";
import type { InterventionPrefill } from "../../types";

// ── API mock ─────────────────────────────────────────────────────────────────
vi.mock("../../api", () => ({
  logIntervention: vi.fn(),
  logInterventionQuick: vi.fn(),
  fetchInterventionHistory: vi.fn(),
  fetchInterventionHistoryForStudent: vi.fn().mockResolvedValue([]),
  fetchMessageHistoryForStudent: vi.fn().mockResolvedValue([]),
  submitFeedbackApi: vi.fn(),
  submitSessionApi: vi.fn(),
}));

import { logIntervention, logInterventionQuick, fetchInterventionHistory } from "../../api";

const mockedLogIntervention = vi.mocked(logIntervention);
const mockedLogInterventionQuick = vi.mocked(logInterventionQuick);
const mockedFetchInterventionHistory = vi.mocked(fetchInterventionHistory);

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAppContext(): AppContextValue {
  return {
    classrooms: [
      {
        classroom_id: "demo-classroom",
        grade_band: "3-4",
        subject_focus: "cross_curricular",
        classroom_notes: [],
        students: [
          { alias: "Amira" },
          { alias: "Brody" },
          { alias: "Farid" },
        ],
        is_demo: true,
      },
    ],
    activeClassroom: "demo-classroom",
    activeTab: "ops",
    activeTool: "log-intervention",
    setActiveClassroom: vi.fn(),
    setActiveTab: vi.fn(),
    profile: {
      classroom_id: "demo-classroom",
      grade_band: "3-4",
      subject_focus: "cross_curricular",
      classroom_notes: [],
      students: [
        { alias: "Amira" },
        { alias: "Brody" },
        { alias: "Farid" },
      ],
      is_demo: true,
    },
    students: [{ alias: "Amira" }, { alias: "Brody" }, { alias: "Farid" }],
    classroomAccessCodes: {},
    classroomRoles: {},
    activeRole: "teacher" as const,
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

function renderPanel(prefill: InterventionPrefill | null = null) {
  const appContext = makeAppContext();
  const user = userEvent.setup();

  render(
    <AppContext.Provider value={appContext}>
      <InterventionPanel prefill={prefill} />
    </AppContext.Provider>,
  );

  return { appContext, user };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("InterventionPanel — single note capture path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetchInterventionHistory.mockResolvedValue([]);
    const fixtureResponse = {
      record: {
        record_id: "rec-1",
        classroom_id: "demo-classroom",
        student_refs: ["Amira"],
        observation: "Named effort for Amira in front of the class — specific, task-focused praise.",
        action_taken: "Named praise",
        follow_up_needed: false,
        created_at: new Date().toISOString(),
        schema_version: "1",
      },
      model_id: "mock",
      latency_ms: 100,
    };
    mockedLogIntervention.mockResolvedValue(fixtureResponse);
    mockedLogInterventionQuick.mockResolvedValue(fixtureResponse);
  });

  it("renders the required evidence path first and does not show competing quick capture", async () => {
    renderPanel();
    expect(await screen.findByRole("heading", { name: /Log Intervention Notes/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Evidence note/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save note & continue/i })).toBeInTheDocument();
    expect(screen.queryByText("Quick capture")).not.toBeInTheDocument();
  });

  it("Optional structured detail is collapsed by default", async () => {
    renderPanel();
    const summary = await screen.findByText(/Add structured detail/i);
    const details = summary.closest("details");
    expect(details).not.toBeNull();
    expect(details?.hasAttribute("open")).toBe(false);
  });

  it("Optional structured detail explains that the required path is already in the primary workspace", async () => {
    const { user } = renderPanel();
    const summary = await screen.findByText(/Add structured detail/i);

    // Before clicking, the <details> should not have the open attribute.
    const details = summary.closest("details");
    expect(details?.hasAttribute("open")).toBe(false);

    await user.click(summary);

    // After clicking the summary, the details element is open.
    expect(details?.hasAttribute("open")).toBe(true);
    expect(screen.getByText(/required student and evidence fields are in the primary workspace/i)).toBeInTheDocument();
  });

  it("auto-opens the structured details panel when a prefill is present", () => {
    const prefill: InterventionPrefill = {
      student_ref: "Ari",
      suggested_action: "Redirect and check for understanding",
      reason: "Frequent off-task moments in math block",
    };
    renderPanel(prefill);
    // The details element should be open so the prefilled workflow context is visible.
    const details = screen.getByText(/Add structured detail/i).closest("details");
    expect(details).not.toBeNull();
    expect(details).toHaveAttribute("open");
  });

  it("primary note capture routes through the persisted logIntervention api", async () => {
    const { appContext, user } = renderPanel();

    await user.click(await screen.findByRole("checkbox", { name: /Amira/i }));
    await user.type(
      screen.getByLabelText(/Evidence note/i),
      "Amira used the sentence starter, completed the first response, and needs a morning check-in.",
    );
    await user.click(screen.getByRole("button", { name: /Save note & continue/i }));

    await waitFor(() => expect(mockedLogIntervention).toHaveBeenCalledTimes(1));
    expect(mockedLogInterventionQuick).not.toHaveBeenCalled();
    const [payload] = mockedLogIntervention.mock.calls[0];
    expect(payload.student_refs).toContain("Amira");
    expect(payload.teacher_note.length).toBeGreaterThan(0);
    expect(payload.classroom_id).toBe("demo-classroom");
    expect(appContext.showSuccess).toHaveBeenCalledWith("Intervention logged");
    expect(appContext.showUndo).not.toHaveBeenCalled();
  });

  it("opens debt-category and student drill-downs from the intervention history charts", async () => {
    mockedFetchInterventionHistory.mockResolvedValue([
      {
        record_id: "rec-pending",
        classroom_id: "demo-classroom",
        student_refs: ["Amira"],
        observation: "Needs math check-in after the small-group task.",
        action_taken: "Schedule follow-up",
        follow_up_needed: true,
        created_at: "2026-04-10T09:00:00.000Z",
        schema_version: "1",
      },
      {
        record_id: "rec-resolved",
        classroom_id: "demo-classroom",
        student_refs: ["Brody"],
        observation: "Settled with visual timer.",
        action_taken: "Used visual timer",
        follow_up_needed: false,
        created_at: "2026-04-11T09:00:00.000Z",
        schema_version: "1",
      },
    ]);
    const { user } = renderPanel();

    await user.click(await screen.findByTestId("viz-followup-rate-hit"));
    expect(
      await screen.findByRole("dialog", { name: /1 open follow-ups/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Needs math check-in/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /close drawer/i }));
    await waitForElementToBeRemoved(() => screen.queryByRole("dialog"));
    await user.click(await screen.findByTestId("viz-int-timeline-dot-rec-pending"));

    expect(
      await screen.findByRole("dialog", { name: /Amira — Student Detail/i }),
    ).toBeInTheDocument();
  });
});
