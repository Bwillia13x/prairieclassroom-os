import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AppContext, { type AppContextValue } from "../../AppContext";
import MessageDraft from "../MessageDraft";
import type { FamilyMessageDraft } from "../../types";
import type { ClassroomRole } from "../../appReducer";

const DRAFT: FamilyMessageDraft = {
  draft_id: "d1",
  classroom_id: "c1",
  student_refs: ["Student A"],
  message_type: "routine_update",
  target_language: "en",
  plain_language_text: "Hello family",
  simplified_student_text: undefined,
  teacher_approved: false,
  schema_version: "1",
};

function makeContext(role: ClassroomRole): AppContextValue {
  return {
    classrooms: [],
    activeClassroom: "c1",
    activeTab: "today",
    setActiveClassroom: vi.fn(),
    setActiveTab: vi.fn(),
    profile: undefined,
    students: [],
    classroomAccessCodes: {},
    classroomRoles: { c1: role },
    activeRole: role,
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

function renderWith(role: ClassroomRole) {
  return render(
    <AppContext.Provider value={makeContext(role)}>
      <MessageDraft draft={DRAFT} onApprove={vi.fn()} />
    </AppContext.Provider>,
  );
}

describe("MessageDraft — role gating", () => {
  it("enables the approve button for teacher", () => {
    renderWith("teacher");
    const btn = screen.getByRole("button", { name: /approve/i });
    expect(btn).not.toBeDisabled();
  });

  it("disables the approve button for ea", () => {
    renderWith("ea");
    const btn = screen.getByRole("button", { name: /restricted/i });
    expect(btn).toBeDisabled();
  });

  it("disables the approve button for substitute", () => {
    renderWith("substitute");
    const btn = screen.getByRole("button", { name: /restricted/i });
    expect(btn).toBeDisabled();
  });

  it("disables the approve button for reviewer", () => {
    renderWith("reviewer");
    const btn = screen.getByRole("button", { name: /restricted/i });
    expect(btn).toBeDisabled();
  });
});
