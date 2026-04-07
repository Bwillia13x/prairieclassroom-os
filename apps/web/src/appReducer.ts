/**
 * appReducer.ts — Central state management for PrairieClassroom OS.
 *
 * Replaces 14 individual useState hooks in App.tsx with a single, testable reducer.
 * Enables undo toasts, streaming state, contextual onboarding, and time-aware nav.
 */

import type { ClassroomProfile, FamilyMessagePrefill, InterventionPrefill } from "./types";

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
  | "complexity-forecast"
  | "survival-packet";

export const TAB_ORDER: ActiveTab[] = [
  "today",
  "differentiate", "language-tools",
  "tomorrow-plan", "ea-briefing", "complexity-forecast", "log-intervention", "survival-packet",
  "family-message", "support-patterns",
];

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
  // Contextual onboarding
  | { type: "MARK_FEATURE_SEEN"; feature: string }
  // Feedback
  | { type: "ADD_FEEDBACK"; feedback: OutputFeedback }
  | { type: "FLUSH_FEEDBACK" };

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
    },
    featuresSeen: loadFeaturesSeen(),
    feedbackQueue: loadFeedbackQueue(),
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

    case "STREAM_RESET":
      return {
        ...state,
        streaming: {
          active: false,
          phase: "idle",
          thinkingText: "",
          partialSections: [],
          progress: 0,
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

    default:
      return state;
  }
}
