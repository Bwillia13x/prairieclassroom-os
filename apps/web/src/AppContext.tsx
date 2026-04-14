import { createContext, useContext, type Dispatch } from "react";
import type { ClassroomProfile } from "./types";
import type {
  ActiveTab,
  AppAction,
  AuthPromptState,
  ClassroomRole,
  StreamingState,
  ToastItem,
} from "./appReducer";

export interface AppContextValue {
  classrooms: ClassroomProfile[];
  activeClassroom: string;
  activeTab: ActiveTab;
  setActiveClassroom: (id: string) => void;
  setActiveTab: (tab: ActiveTab) => void;
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
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppContext.Provider");
  return ctx;
}

export default AppContext;
