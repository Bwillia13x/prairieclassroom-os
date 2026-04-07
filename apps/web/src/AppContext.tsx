import { createContext, useContext } from "react";
import type { ClassroomProfile } from "./types";

export interface AppContextValue {
  classrooms: ClassroomProfile[];
  activeClassroom: string;
  setActiveClassroom: (id: string) => void;
  profile: ClassroomProfile | undefined;
  students: { alias: string; family_language?: string }[];
  showSuccess: (msg: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppContext.Provider");
  return ctx;
}

export default AppContext;
