import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, beforeEach, expect } from "vitest";
import AppContext, { type AppContextValue } from "../../AppContext";
import InterventionPanel from "../InterventionPanel";
import type { InterventionPrefill } from "../../types";

// ── API mock ─────────────────────────────────────────────────────────────────
vi.mock("../../api", () => ({
  logIntervention: vi.fn(),
  fetchInterventionHistory: vi.fn(),
  submitFeedbackApi: vi.fn(),
  submitSessionApi: vi.fn(),
}));

import { logIntervention, fetchInterventionHistory } from "../../api";

const mockedLogIntervention = vi.mocked(logIntervention);
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
    activeTab: "log-intervention",
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

describe("InterventionPanel — QuickCaptureTray integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetchInterventionHistory.mockResolvedValue([]);
    mockedLogIntervention.mockResolvedValue({
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
    });
  });

  it("Quick capture renders first — heading is present in the document", async () => {
    renderPanel();
    expect(await screen.findByText("Quick capture")).toBeInTheDocument();
  });

  it("Structured details is collapsed by default", async () => {
    renderPanel();
    const summary = await screen.findByText(/Structured details/i);
    const details = summary.closest("details");
    expect(details).not.toBeNull();
    expect(details?.hasAttribute("open")).toBe(false);
  });

  it("Structured form becomes reachable after clicking summary", async () => {
    const { user } = renderPanel();
    const summary = await screen.findByText(/Structured details/i);

    // Before clicking, the <details> should not have the open attribute.
    const details = summary.closest("details");
    expect(details?.hasAttribute("open")).toBe(false);

    await user.click(summary);

    // After clicking the summary, the details element is open.
    expect(details?.hasAttribute("open")).toBe(true);

    // The legacy form's textarea is reachable.
    expect(await screen.findByLabelText(/What happened/i)).toBeInTheDocument();
  });

  it("auto-opens the structured details panel when a prefill is present", () => {
    const prefill: InterventionPrefill = {
      student_ref: "Ari",
      suggested_action: "Redirect and check for understanding",
      reason: "Frequent off-task moments in math block",
    };
    renderPanel(prefill);
    // The details element should be open so the legacy form (and its prefill ingestion) is visible.
    const details = screen.getByText(/Structured details/i).closest("details");
    expect(details).not.toBeNull();
    expect(details).toHaveAttribute("open");
  });

  it("QuickCaptureTray submit calls logIntervention via handleSubmit", async () => {
    const { user } = renderPanel();

    // Wait for the tray to be mounted
    await screen.findByText("Quick capture");

    // 1. Select a student avatar
    const amiraButton = screen.getByRole("button", { name: /Amira/i });
    await user.click(amiraButton);

    // 2. Select a chip — "Praise" produces a non-empty starter note
    const praiseChip = screen.getByRole("button", { name: /Praise/i });
    await user.click(praiseChip);

    // 3. Submit — target the QuickCaptureTray button (type="button", not type="submit")
    const submitButtons = screen.getAllByRole("button", { name: /Log intervention/i });
    // The QuickCaptureTray button is type="button"; the InterventionLogger one is type="submit".
    const trayButton = submitButtons.find(
      (btn) => btn.getAttribute("type") === "button",
    );
    if (!trayButton) throw new Error("QuickCaptureTray submit button not found");
    await user.click(trayButton);

    // 4. Assert spy was called with the expected payload shape
    expect(mockedLogIntervention).toHaveBeenCalledTimes(1);
    const [payload] = mockedLogIntervention.mock.calls[0];
    expect(payload.student_refs).toContain("Amira");
    expect(payload.teacher_note.length).toBeGreaterThan(0);
    expect(payload.classroom_id).toBe("demo-classroom");
  });
});
