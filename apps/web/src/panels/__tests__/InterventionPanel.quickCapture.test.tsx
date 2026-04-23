import { render, screen } from "@testing-library/react";
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

describe("InterventionPanel — QuickCaptureTray integration", () => {
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
    // Stub both endpoints: hallway quick-capture uses the quick path, and
    // the structured-details disclosure still exercises the full path.
    mockedLogIntervention.mockResolvedValue(fixtureResponse);
    mockedLogInterventionQuick.mockResolvedValue(fixtureResponse);
  });

  it("Quick capture renders first — heading is present in the document", async () => {
    renderPanel();
    expect(await screen.findByText("Quick capture")).toBeInTheDocument();
  });

  it("Structured details is collapsed by default", async () => {
    renderPanel();
    const summary = await screen.findByText(/Add structured detail/i);
    const details = summary.closest("details");
    expect(details).not.toBeNull();
    expect(details?.hasAttribute("open")).toBe(false);
  });

  it("Structured form becomes reachable after clicking summary", async () => {
    const { user } = renderPanel();
    const summary = await screen.findByText(/Add structured detail/i);

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
    const details = screen.getByText(/Add structured detail/i).closest("details");
    expect(details).not.toBeNull();
    expect(details).toHaveAttribute("open");
  });

  it("QuickCaptureTray submit routes through the fast-path logInterventionQuick api", async () => {
    const { appContext, user } = renderPanel();

    // Wait for the tray to be mounted
    await screen.findByText("Quick capture");

    // 1. Select a student avatar
    const amiraButton = screen.getByRole("button", { name: /Amira/i });
    await user.click(amiraButton);

    // 2. Select a chip — "Praise" produces a non-empty starter note
    const praiseChip = screen.getByRole("button", { name: /Praise/i });
    await user.click(praiseChip);

    // 3. Submit — target the QuickCaptureTray button (type="button", not type="submit")
    //    The new PageIntro ⓘ info trigger also has aria-label "About Log Intervention",
    //    so filter to buttons inside the quick-capture-tray.
    const submitButtons = screen.getAllByRole("button", { name: /Log intervention/i });
    const trayButton = submitButtons.find(
      (btn) =>
        btn.getAttribute("type") === "button" &&
        btn.closest(".quick-capture-tray") !== null,
    );
    if (!trayButton) throw new Error("QuickCaptureTray submit button not found");
    await user.click(trayButton);

    // 4. Hallway-grade capture must route through the deterministic quick
    // endpoint. The full model-enriched path is reserved for the structured
    // details disclosure (exercised separately).
    expect(mockedLogInterventionQuick).toHaveBeenCalledTimes(1);
    expect(mockedLogIntervention).not.toHaveBeenCalled();
    const [payload] = mockedLogInterventionQuick.mock.calls[0];
    expect(payload.student_refs).toContain("Amira");
    expect(payload.teacher_note.length).toBeGreaterThan(0);
    expect(payload.classroom_id).toBe("demo-classroom");
    expect(appContext.showSuccess).toHaveBeenCalledWith("Intervention logged");
    expect(appContext.showUndo).not.toHaveBeenCalled();
  });
});
