import { createContext, useContext, type ReactNode } from "react";
import { useSessionContext } from "./hooks/useSessionContext";

interface SessionContextValue {
  sessionId: string;
  recordPanelVisit: (panelId: string) => void;
  recordGeneration: (panelId: string, promptClass: string) => void;
  recordFeedback: () => void;
}

const SessionCtx = createContext<SessionContextValue | null>(null);

interface SessionProviderProps {
  classroomId: string;
  enabled?: boolean;
  children: ReactNode;
}

/**
 * Wraps the app with a single session tracker tied to the active classroom.
 * Panels and components should use useSession() to get the live sessionId
 * and workflow-tracking callbacks.
 */
export function SessionProvider({ classroomId, enabled = true, children }: SessionProviderProps) {
  const value = useSessionContext(classroomId, enabled);
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

/**
 * Access the live session context. Returns null-safe defaults if no provider
 * is mounted (e.g. in tests that render panels in isolation), so panels can
 * be unit-tested without always needing the provider.
 */
export function useSession(): SessionContextValue {
  const ctx = useContext(SessionCtx);
  if (ctx) return ctx;
  // Fallback for tests / unmounted contexts — session tracking is a no-op
  return {
    sessionId: "",
    recordPanelVisit: () => {},
    recordGeneration: () => {},
    recordFeedback: () => {},
  };
}
