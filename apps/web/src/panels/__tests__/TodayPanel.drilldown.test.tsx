/**
 * TodayPanel.drilldown.test.tsx
 *
 * Integration tests for the drill-down wiring introduced in Plan 5 Task 7:
 *   - ComplexityDebtGauge.onSegmentClick → trend drawer
 *   - ClassroomCompositionRings.onSegmentClick → student-tag-group drawer
 *   - onContextChange passed to DrillDownDrawer so student escalation works
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, beforeEach, afterEach, expect } from "vitest";
import AppContext, { type AppContextValue } from "../../AppContext";
import TodayPanel from "../TodayPanel";
import type { ClassroomHealth, TodaySnapshot } from "../../types";

vi.mock("../../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api")>();
  return {
    ...actual,
    fetchTodaySnapshot: vi.fn(),
    fetchClassroomHealth: vi.fn(),
    fetchStudentSummary: vi.fn(),
    fetchInterventionHistoryForStudent: vi.fn(),
    fetchMessageHistoryForStudent: vi.fn(),
  };
});

import {
  fetchTodaySnapshot,
  fetchClassroomHealth,
  fetchStudentSummary,
  fetchInterventionHistoryForStudent,
  fetchMessageHistoryForStudent,
} from "../../api";

const mockedFetchTodaySnapshot = vi.mocked(fetchTodaySnapshot);
const mockedFetchClassroomHealth = vi.mocked(fetchClassroomHealth);
const mockedFetchStudentSummary = vi.mocked(fetchStudentSummary);
const mockedFetchInterventionHistoryForStudent = vi.mocked(fetchInterventionHistoryForStudent);
const mockedFetchMessageHistoryForStudent = vi.mocked(fetchMessageHistoryForStudent);

function makeHealth(overrides: Partial<ClassroomHealth> = {}): ClassroomHealth {
  return {
    streak_days: 3,
    plans_last_7: [true, true, false, true, false, true, false],
    messages_approved: 2,
    messages_total: 5,
    trends: {
      debt_total_14d: [8, 7, 6, 5, 5, 4, 3, 3, 4, 5, 4, 3, 2, 2],
      plans_14d: [0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1],
      peak_complexity_14d: [1, 2, 1, 2, 3, 2, 1, 2, 3, 2, 2, 1, 2, 3],
    },
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<TodaySnapshot> = {}): TodaySnapshot {
  return {
    debt_register: {
      register_id: "reg-1",
      classroom_id: "demo-classroom",
      items: [
        {
          category: "unapproved_message",
          student_refs: ["Amira"],
          description: "Draft waiting for approval",
          source_record_id: "msg-1",
          age_days: 1,
          suggested_action: "Approve message",
        },
        {
          category: "stale_followup",
          student_refs: ["Brody"],
          description: "Follow-up still needs logging",
          source_record_id: "int-1",
          age_days: 5,
          suggested_action: "Log follow-up",
        },
      ],
      item_count_by_category: {
        unapproved_message: 1,
        stale_followup: 1,
        unaddressed_pattern: 0,
        approaching_review: 0,
      },
      generated_at: "2026-04-12T15:00:00.000Z",
    } as unknown as TodaySnapshot["debt_register"],
    latest_plan: null,
    latest_forecast: null,
    student_count: 3,
    last_activity_at: "2026-04-12T15:00:00.000Z",
    ...overrides,
  };
}

/**
 * Profile students with support_tags so ClassroomCompositionRings renders
 * EAL segments that are clickable.
 */
function makeAppContext(): AppContextValue {
  return {
    classrooms: [],
    activeClassroom: "demo-classroom",
    activeTab: "today",
    setActiveClassroom: vi.fn(),
    setActiveTab: vi.fn(),
    profile: {
      classroom_id: "demo-classroom",
      grade_band: "3-4",
      subject_focus: "cross_curricular",
      classroom_notes: [],
      students: [
        { alias: "Amira", support_tags: ["eal_level_1"], family_language: "ar" },
        { alias: "Brody", support_tags: ["eal_level_1"], family_language: "en" },
        { alias: "Farid", support_tags: ["eal_level_2"], family_language: "ar" },
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

function renderPanel(snapshot: TodaySnapshot, health = makeHealth()) {
  mockedFetchTodaySnapshot.mockResolvedValue(snapshot);
  mockedFetchClassroomHealth.mockResolvedValue(health);
  mockedFetchStudentSummary.mockResolvedValue([]);
  mockedFetchInterventionHistoryForStudent.mockResolvedValue([]);
  mockedFetchMessageHistoryForStudent.mockResolvedValue([]);

  const onTabChange = vi.fn();
  const appContext = makeAppContext();
  const user = userEvent.setup();

  render(
    <AppContext.Provider value={appContext}>
      <TodayPanel onTabChange={onTabChange} />
    </AppContext.Provider>,
  );

  return { onTabChange, user };
}

describe("TodayPanel drill-down integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("clicking the debt gauge opens the trend drawer with a 'Complexity debt' title", async () => {
    const { user } = renderPanel(makeSnapshot());

    // Wait for the snapshot to load so the gauge renders
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /complexity debt/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /complexity debt/i }));

    // computeTitle for type:"trend" → "${label} — 14-day trend"
    expect(
      await screen.findByRole("dialog", { name: /Complexity debt — 14-day trend/i }),
    ).toBeInTheDocument();
  });

  it("clicking an EAL segment on ClassroomCompositionRings opens the student-tag-group drawer", async () => {
    const { user } = renderPanel(makeSnapshot());

    // Wait for composition rings to render (profile students are present at mount)
    await waitFor(() => {
      expect(
        screen.getByTestId("viz-composition-segment-eal-eal_level_1"),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("viz-composition-segment-eal-eal_level_1"));

    // computeTitle for type:"student-tag-group" → "${label} — ${count} students"
    // label = "EAL Level 1", students = [Amira, Brody] → count = 2
    expect(
      await screen.findByRole("dialog", { name: /EAL Level 1 — 2 students/i }),
    ).toBeInTheDocument();
  });

  it("clicking a student inside the tag-group view replaces drawer content with StudentDetailView without closing", async () => {
    const { user } = renderPanel(makeSnapshot());

    // Open the tag-group drawer first
    await waitFor(() => {
      expect(
        screen.getByTestId("viz-composition-segment-eal-eal_level_1"),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("viz-composition-segment-eal-eal_level_1"));

    // Confirm tag-group view is showing
    const tagGroupDialog = await screen.findByRole("dialog", { name: /EAL Level 1 — 2 students/i });
    expect(tagGroupDialog).toBeInTheDocument();

    // Click the student button *inside the drawer* (there may be other "Amira" buttons elsewhere)
    const drawerAmiraBtn = Array.from(tagGroupDialog.querySelectorAll("button")).find(
      (btn) => btn.textContent?.trim() === "Amira",
    );
    expect(drawerAmiraBtn).toBeTruthy();
    await user.click(drawerAmiraBtn!);

    // The drawer should now show the StudentDetailView for Amira
    // computeTitle for type:"student" → "${alias} — Student Detail"
    expect(
      await screen.findByRole("dialog", { name: /Amira — Student Detail/i }),
    ).toBeInTheDocument();

    // Confirm we didn't navigate away — the drawer is still open
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
