/**
 * appReducer.ts — Central state management for PrairieClassroom OS.
 *
 * Replaces 14 individual useState hooks in App.tsx with a single, testable reducer.
 * Enables undo toasts, streaming state, contextual onboarding, and time-aware nav.
 */

import type { ClassroomProfile, FamilyMessagePrefill, InterventionPrefill, TomorrowNote } from "./types";
import type { SectionIconName } from "./components/SectionIcon";

// ─── Active Tab ───

export type ActiveTab =
  | "today"
  | "differentiate"
  | "tomorrow-plan"
  | "family-message"
  | "log-intervention"
  | "language-tools"
  | "support-patterns"
  | "ea-briefing"
  | "ea-load"
  | "complexity-forecast"
  | "survival-packet"
  | "usage-insights";

export const TAB_ORDER: ActiveTab[] = [
  "today",
  "differentiate", "language-tools",
  "tomorrow-plan", "ea-briefing", "ea-load", "complexity-forecast", "log-intervention", "survival-packet",
  "family-message", "support-patterns", "usage-insights",
];

export type NavGroup = "today" | "prep" | "ops" | "review";

export type SectionTone = "sun" | "sage" | "slate" | "forest";

export interface NavGroupMeta {
  label: string;
  icon: SectionIconName;
  sectionTone: SectionTone;
}

export const NAV_GROUP_ORDER: NavGroup[] = ["today", "prep", "ops", "review"];

export const NAV_GROUP_META: Record<NavGroup, NavGroupMeta> = {
  today: { label: "Today", icon: "sun", sectionTone: "sun" },
  prep: { label: "Prep", icon: "pencil", sectionTone: "sage" },
  ops: { label: "Ops", icon: "grid", sectionTone: "slate" },
  review: { label: "Review", icon: "check", sectionTone: "forest" },
};

export const TAB_META: Record<ActiveTab, { label: string; shortLabel: string; group: NavGroup }> = {
  today: { label: "Today", shortLabel: "Today", group: "today" },
  differentiate: { label: "Differentiate", shortLabel: "Differentiate", group: "prep" },
  "language-tools": { label: "Language Tools", shortLabel: "Language", group: "prep" },
  "tomorrow-plan": { label: "Tomorrow Plan", shortLabel: "Plan", group: "ops" },
  "ea-briefing": { label: "EA Briefing", shortLabel: "EA Brief", group: "ops" },
  "ea-load": { label: "EA Load", shortLabel: "EA Load", group: "ops" },
  "complexity-forecast": { label: "Forecast", shortLabel: "Forecast", group: "ops" },
  "log-intervention": { label: "Log Intervention", shortLabel: "Log", group: "ops" },
  "survival-packet": { label: "Sub Packet", shortLabel: "Sub Packet", group: "ops" },
  "family-message": { label: "Family Message", shortLabel: "Message", group: "review" },
  "support-patterns": { label: "Support Patterns", shortLabel: "Patterns", group: "review" },
  "usage-insights": { label: "Usage Insights", shortLabel: "Insights", group: "review" },
};

export function getGroupForTab(tab: ActiveTab): NavGroup {
  return TAB_META[tab].group;
}

export function getTabsForGroup(group: NavGroup): ActiveTab[] {
  return TAB_ORDER.filter((tab) => TAB_META[tab].group === group);
}

export function getTabBadgeCount(tab: ActiveTab, debtCounts: Record<string, number>): number {
  switch (tab) {
    case "family-message":
      return debtCounts.unapproved_message ?? 0;
    case "log-intervention":
      return debtCounts.stale_followup ?? 0;
    case "support-patterns":
      return (debtCounts.unaddressed_pattern ?? 0) + (debtCounts.approaching_review ?? 0);
    default:
      return 0;
  }
}

// ─── Undo System ───

export interface UndoAction {
  id: string;
  label: string;
  /** Async callback to reverse the action server-side */
  rollback: () => Promise<void>;
  /** Auto-dismiss timer handle */
  timerId?: ReturnType<typeof setTimeout>;
}

// ─── Feedback ───

export interface OutputFeedback {
  outputId: string;
  outputType: string;
  rating: "up" | "down";
  note?: string;
  timestamp: string;
}

// ─── Streaming State ───

export interface StreamingState {
  active: boolean;
  /** Current phase: "thinking" | "structuring" | "complete" */
  phase: "idle" | "thinking" | "structuring" | "complete";
  /** Raw thinking text streamed incrementally */
  thinkingText: string;
  /** Partial structured output as sections arrive */
  partialSections: string[];
  /** Progress 0–1 (estimated) */
  progress: number;
  /** Elapsed seconds since streaming started */
  elapsedSeconds: number;
}

// ─── Toast Queue ───

export interface ToastItem {
  id: string;
  type: "success" | "undo" | "info" | "error";
  message: string;
  /** For undo toasts */
  undoAction?: UndoAction;
  /** Duration in ms before auto-dismiss (0 = sticky) */
  duration: number;
}

export interface AuthPromptState {
  classroomId: string;
  message: string;
  status: number;
  source: "selection" | "request";
  retry?: (code?: string) => Promise<unknown>;
}

// ─── Classroom Role ───

export type ClassroomRole = "teacher" | "ea" | "substitute" | "reviewer";

export const CLASSROOM_ROLES: readonly ClassroomRole[] = [
  "teacher",
  "ea",
  "substitute",
  "reviewer",
] as const;

export function isClassroomRole(value: unknown): value is ClassroomRole {
  return typeof value === "string" && (CLASSROOM_ROLES as readonly string[]).includes(value);
}

// ─── App State ───

export interface AppState {
  classrooms: ClassroomProfile[];
  activeTab: ActiveTab;
  activeClassroom: string;
  messagePrefill: FamilyMessagePrefill | null;
  interventionPrefill: InterventionPrefill | null;
  initError: string | null;
  debtCounts: Record<string, number>;
  showOnboarding: boolean;

  // New: toast queue (replaces single successMsg)
  toasts: ToastItem[];

  // New: streaming state for planning-tier requests
  streaming: StreamingState;

  // New: contextual onboarding — tracks which features teacher has used
  featuresSeen: Record<string, boolean>;

  // New: feedback store (persisted to localStorage)
  feedbackQueue: OutputFeedback[];

  // Protected classroom access codes (persisted locally)
  classroomAccessCodes: Record<string, string>;

  // Auth prompt state for protected classroom flows
  authPrompt: AuthPromptState | null;

  // Per-classroom role selection (persisted locally)
  classroomRoles: Record<string, ClassroomRole>;

  // Role prompt dialog state
  rolePrompt: { classroomId: string } | null;

  // Tomorrow notes collected from output panels (persisted to localStorage)
  tomorrowNotes: TomorrowNote[];
}

// ─── Actions ───

export type AppAction =
  | { type: "SET_CLASSROOMS"; classrooms: ClassroomProfile[] }
  | { type: "SET_ACTIVE_CLASSROOM"; classroomId: string }
  | { type: "SET_ACTIVE_TAB"; tab: ActiveTab }
  | { type: "SET_INIT_ERROR"; error: string }
  | { type: "SET_DEBT_COUNTS"; counts: Record<string, number> }
  | { type: "SET_MESSAGE_PREFILL"; prefill: FamilyMessagePrefill | null }
  | { type: "SET_INTERVENTION_PREFILL"; prefill: InterventionPrefill | null }
  | { type: "SHOW_ONBOARDING"; show: boolean }
  // Toast queue
  | { type: "PUSH_TOAST"; toast: ToastItem }
  | { type: "DISMISS_TOAST"; id: string }
  // Streaming
  | { type: "STREAM_START"; phase: "thinking" | "structuring" }
  | { type: "STREAM_THINKING_CHUNK"; text: string }
  | { type: "STREAM_SECTION"; section: string }
  | { type: "STREAM_PROGRESS"; progress: number }
  | { type: "STREAM_COMPLETE" }
  | { type: "STREAM_RESET" }
  | { type: "STREAM_TICK" }
  // Contextual onboarding
  | { type: "MARK_FEATURE_SEEN"; feature: string }
  // Feedback
  | { type: "ADD_FEEDBACK"; feedback: OutputFeedback }
  | { type: "FLUSH_FEEDBACK" }
  | { type: "SET_CLASSROOM_ACCESS_CODE"; classroomId: string; code: string }
  | { type: "OPEN_AUTH_PROMPT"; prompt: AuthPromptState }
  | { type: "CLOSE_AUTH_PROMPT" }
  | { type: "SET_CLASSROOM_ROLE"; classroomId: string; role: ClassroomRole }
  | { type: "OPEN_ROLE_PROMPT"; classroomId: string }
  | { type: "CLOSE_ROLE_PROMPT" }
  | { type: "APPEND_TOMORROW_NOTE"; note: TomorrowNote }
  | { type: "CLEAR_TOMORROW_NOTES" };

// ─── Initial State ───

function loadFeaturesSeen(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem("prairie-features-seen");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadFeedbackQueue(): OutputFeedback[] {
  try {
    const raw = localStorage.getItem("prairie-feedback-queue");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadClassroomAccessCodes(): Record<string, string> {
  try {
    const raw = localStorage.getItem("prairie-classroom-access-codes");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadClassroomRoles(): Record<string, ClassroomRole> {
  try {
    const raw = localStorage.getItem("prairie-classroom-roles");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const result: Record<string, ClassroomRole> = {};
    let hadInvalid = false;
    for (const [classroomId, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (isClassroomRole(value)) {
        result[classroomId] = value;
      } else {
        hadInvalid = true;
        result[classroomId] = "teacher";
      }
    }
    if (hadInvalid) {
      console.warn(
        "[appReducer] Dropped unknown role values from prairie-classroom-roles; defaulted to 'teacher'.",
      );
    }
    return result;
  } catch {
    return {};
  }
}

function loadTomorrowNotes(): TomorrowNote[] {
  try {
    const raw = localStorage.getItem("prairie-tomorrow-notes");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function createInitialState(): AppState {
  return {
    classrooms: [],
    activeTab: "today",
    activeClassroom: "",
    messagePrefill: null,
    interventionPrefill: null,
    initError: null,
    debtCounts: {},
    showOnboarding: !localStorage.getItem("prairie-onboarding-done"),
    toasts: [],
    streaming: {
      active: false,
      phase: "idle",
      thinkingText: "",
      partialSections: [],
      progress: 0,
      elapsedSeconds: 0,
    },
    featuresSeen: loadFeaturesSeen(),
    feedbackQueue: loadFeedbackQueue(),
    classroomAccessCodes: loadClassroomAccessCodes(),
    authPrompt: null,
    classroomRoles: loadClassroomRoles(),
    rolePrompt: null,
    tomorrowNotes: loadTomorrowNotes(),
  };
}

// ─── Reducer ───

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_CLASSROOMS":
      return { ...state, classrooms: action.classrooms };

    case "SET_ACTIVE_CLASSROOM":
      return { ...state, activeClassroom: action.classroomId };

    case "SET_ACTIVE_TAB":
      return { ...state, activeTab: action.tab };

    case "SET_INIT_ERROR":
      return { ...state, initError: action.error };

    case "SET_DEBT_COUNTS":
      return { ...state, debtCounts: action.counts };

    case "SET_MESSAGE_PREFILL":
      return { ...state, messagePrefill: action.prefill };

    case "SET_INTERVENTION_PREFILL":
      return { ...state, interventionPrefill: action.prefill };

    case "SHOW_ONBOARDING":
      return { ...state, showOnboarding: action.show };

    // ─── Toast Queue ───

    case "PUSH_TOAST":
      return { ...state, toasts: [...state.toasts, action.toast] };

    case "DISMISS_TOAST":
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };

    // ─── Streaming ───

    case "STREAM_START":
      return {
        ...state,
        streaming: {
          active: true,
          phase: action.phase,
          thinkingText: "",
          partialSections: [],
          progress: 0,
          elapsedSeconds: 0,
        },
      };

    case "STREAM_THINKING_CHUNK":
      return {
        ...state,
        streaming: {
          ...state.streaming,
          thinkingText: state.streaming.thinkingText + action.text,
        },
      };

    case "STREAM_SECTION":
      return {
        ...state,
        streaming: {
          ...state.streaming,
          phase: "structuring",
          partialSections: [...state.streaming.partialSections, action.section],
        },
      };

    case "STREAM_PROGRESS":
      return {
        ...state,
        streaming: { ...state.streaming, progress: action.progress },
      };

    case "STREAM_COMPLETE":
      return {
        ...state,
        streaming: { ...state.streaming, active: false, phase: "complete", progress: 1 },
      };

    case "STREAM_TICK":
      if (!state.streaming.active) return state;
      return {
        ...state,
        streaming: { ...state.streaming, elapsedSeconds: state.streaming.elapsedSeconds + 1 },
      };

    case "STREAM_RESET":
      return {
        ...state,
        streaming: {
          active: false,
          phase: "idle",
          thinkingText: "",
          partialSections: [],
          progress: 0,
          elapsedSeconds: 0,
        },
      };

    // ─── Contextual Onboarding ───

    case "MARK_FEATURE_SEEN": {
      const featuresSeen = { ...state.featuresSeen, [action.feature]: true };
      try { localStorage.setItem("prairie-features-seen", JSON.stringify(featuresSeen)); } catch { /* noop */ }
      return { ...state, featuresSeen };
    }

    // ─── Feedback ───

    case "ADD_FEEDBACK": {
      const feedbackQueue = [...state.feedbackQueue, action.feedback];
      try { localStorage.setItem("prairie-feedback-queue", JSON.stringify(feedbackQueue)); } catch { /* noop */ }
      return { ...state, feedbackQueue };
    }

    case "FLUSH_FEEDBACK":
      try { localStorage.removeItem("prairie-feedback-queue"); } catch { /* noop */ }
      return { ...state, feedbackQueue: [] };

    case "SET_CLASSROOM_ACCESS_CODE": {
      const classroomAccessCodes = {
        ...state.classroomAccessCodes,
        [action.classroomId]: action.code,
      };
      try {
        localStorage.setItem("prairie-classroom-access-codes", JSON.stringify(classroomAccessCodes));
      } catch {
        /* noop */
      }
      return { ...state, classroomAccessCodes };
    }

    case "OPEN_AUTH_PROMPT":
      return { ...state, authPrompt: action.prompt };

    case "CLOSE_AUTH_PROMPT":
      return { ...state, authPrompt: null };

    case "SET_CLASSROOM_ROLE": {
      const classroomRoles = {
        ...state.classroomRoles,
        [action.classroomId]: action.role,
      };
      try {
        localStorage.setItem("prairie-classroom-roles", JSON.stringify(classroomRoles));
      } catch {
        /* noop */
      }
      return { ...state, classroomRoles };
    }

    case "OPEN_ROLE_PROMPT":
      return { ...state, rolePrompt: { classroomId: action.classroomId } };

    case "CLOSE_ROLE_PROMPT":
      return { ...state, rolePrompt: null };

    // ─── Tomorrow Notes ───

    case "APPEND_TOMORROW_NOTE": {
      const tomorrowNotes = [...state.tomorrowNotes, action.note];
      try { localStorage.setItem("prairie-tomorrow-notes", JSON.stringify(tomorrowNotes)); } catch { /* noop */ }
      return { ...state, tomorrowNotes };
    }

    case "CLEAR_TOMORROW_NOTES":
      try { localStorage.removeItem("prairie-tomorrow-notes"); } catch { /* noop */ }
      return { ...state, tomorrowNotes: [] };

    default:
      return state;
  }
}
