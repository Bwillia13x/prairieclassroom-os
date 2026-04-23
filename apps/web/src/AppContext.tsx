import { createContext, useContext, type Dispatch } from "react";
import type { ClassroomProfile, FamilyMessagePrefill, InterventionPrefill, TodaySnapshot, TomorrowNote } from "./types";
import type {
  ActiveTab,
  ActiveTool,
  AppAction,
  AuthPromptState,
  ClassroomRole,
  NavTarget,
  StreamingState,
  ToastItem,
} from "./appReducer";

export interface AppContextValue {
  classrooms: ClassroomProfile[];
  activeClassroom: string;
  activeTab: ActiveTab;
  /** Embedded tool for pages that host multiple tool surfaces. */
  activeTool: ActiveTool | null;
  setActiveClassroom: (id: string) => void;
  /**
   * Navigate to a top-level page or to a specific embedded tool inside a
   * page. Accepts a new-world `ActiveTab`, an `ActiveTool`, or any legacy
   * panel id (e.g. "tomorrow-plan"). Passing an explicit `tool` overrides
   * the default tool for the resolved page.
   */
  setActiveTab: (target: NavTarget | string, tool?: ActiveTool | null) => void;
  /** Swap the embedded tool for the current page without changing pages. */
  setActiveTool: (tool: ActiveTool | null) => void;
  latestTodaySnapshot?: TodaySnapshot | null;
  profile: ClassroomProfile | undefined;
  students: { alias: string; family_language?: string }[];
  classroomAccessCodes: Record<string, string>;
  /** Per-classroom role selections (persisted locally) */
  classroomRoles: Record<string, ClassroomRole>;
  /** Computed role for the active classroom, defaulting to 'teacher' */
  activeRole: ClassroomRole;
  /** Set the stored role for a classroom */
  setClassroomRole: (classroomId: string, role: ClassroomRole) => void;
  authPrompt: AuthPromptState | null;
  showSuccess: (msg: string) => void;
  /** Show an error toast. Use when an awaited call failed and the teacher needs to know. */
  showError: (msg: string) => void;
  /** Dispatch for the central state reducer */
  dispatch: Dispatch<AppAction>;
  /** Streaming state for planning-tier progressive disclosure */
  streaming: StreamingState;
  /** Toast queue for success, undo, info, error toasts */
  toasts: ToastItem[];
  /** Features the teacher has already seen (contextual onboarding) */
  featuresSeen: Record<string, boolean>;
  /** Submit output feedback */
  submitFeedback: (outputId: string, outputType: string, rating: "up" | "down", note?: string) => void;
  /** Show an undo toast for a reversible action */
  showUndo: (label: string, rollback: () => Promise<void>) => void;
  /** Dismiss a specific toast by id */
  dismissToast: (id: string) => void;
  /** Tomorrow notes collected across output panels */
  tomorrowNotes: TomorrowNote[];
  /** Append a tomorrow note (auto-generates id and createdAt) */
  appendTomorrowNote: (note: Omit<TomorrowNote, "id" | "createdAt">) => void;
  /** Remove a tomorrow note by id */
  removeTomorrowNote: (id: string) => void;
  /** Pending prefill for the family-message composer (cross-panel handoff) */
  messagePrefill: FamilyMessagePrefill | null;
  /** Pending prefill for the intervention logger (cross-panel handoff) */
  interventionPrefill: InterventionPrefill | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppContext.Provider");
  return ctx;
}

export default AppContext;
