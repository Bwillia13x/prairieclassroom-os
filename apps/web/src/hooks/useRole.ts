import { useApp } from "../AppContext";
import type { ClassroomRole } from "../appReducer";

export interface RoleCapabilities {
  role: ClassroomRole;
  /** Any write back to the API at all (generate/save/approve/log) */
  canWrite: boolean;
  /** Approve & Copy a family message draft */
  canApproveMessages: boolean;
  /** Log an intervention record */
  canLogInterventions: boolean;
  /** Edit the classroom schedule */
  canEditSchedule: boolean;
}

/**
 * Pure role-to-capability mapping. Kept separate from `useRole` so it can
 * be unit-tested without a React tree and reused server-side if needed.
 */
export function roleCapabilities(role: ClassroomRole): RoleCapabilities {
  switch (role) {
    case "teacher":
      return {
        role,
        canWrite: true,
        canApproveMessages: true,
        canLogInterventions: true,
        canEditSchedule: true,
      };
    case "ea":
      return {
        role,
        canWrite: true,
        canApproveMessages: false,
        canLogInterventions: true,
        canEditSchedule: false,
      };
    case "substitute":
      return {
        role,
        canWrite: true,
        canApproveMessages: false,
        canLogInterventions: true,
        canEditSchedule: false,
      };
    case "reviewer":
      return {
        role,
        canWrite: false,
        canApproveMessages: false,
        canLogInterventions: false,
        canEditSchedule: false,
      };
  }
}

/**
 * Returns the capability record for the currently active classroom's role.
 * Must be called inside a component that sits under `AppContext.Provider`.
 */
export function useRole(): RoleCapabilities {
  const { activeRole } = useApp();
  return roleCapabilities(activeRole);
}
