import { useApp } from "../AppContext";
import type { ClassroomRole } from "../appReducer";

/**
 * Per-role capability matrix — the single UI source of truth for what
 * controls a given role may interact with. Aligned with the server-side
 * scope matrix locked by `services/orchestrator/__tests__/auth.test.ts`;
 * when a backend scope changes, update both.
 *
 * Client-side gating is a UX affordance, not a security boundary. The
 * server is the authoritative layer; this hook keeps the UI from
 * inviting clicks the server will reject.
 */
export interface RoleCapabilities {
  role: ClassroomRole;
  /** Any write back to the API at all (generate/save/approve/log) */
  canWrite: boolean;
  /** Trigger a model-routed planning-tier generation (tomorrow plan,
   *  differentiate, forecast, support patterns, scaffold decay,
   *  survival packet, family message draft, language tools, ea load). */
  canGenerate: boolean;
  /** Approve & Copy a family message draft */
  canApproveMessages: boolean;
  /** Alias for `canApproveMessages` — named so panels that also gate on
   *  "approve" state (even beyond messages) can use the more general name. */
  canApprove: boolean;
  /** Log an intervention record */
  canLogInterventions: boolean;
  /** Edit the classroom schedule */
  canEditSchedule: boolean;
  /** Generate an EA briefing (operational read-of-memory; available to
   *  substitutes because it is the handoff surface for covering teachers). */
  canGenerateEABriefing: boolean;
  /** Use the EA load balancer (teacher + permanent EA only — substitutes
   *  are not expected to rebalance; reviewers do not write). */
  canUseEALoad: boolean;
  /** View read-only planning archives: history of plans, messages,
   *  interventions, patterns; reviewer's primary surface. */
  canViewPlanning: boolean;
  /** View the live operational "Today" snapshot (active coordination view —
   *  teacher, EA, substitute; reviewer deliberately excluded because
   *  reviewers work from history, not the live operational state). */
  canViewToday: boolean;
  /** View aggregated usage / feedback summaries (Usage Insights panel). */
  canViewUsageInsights: boolean;
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
        canGenerate: true,
        canApproveMessages: true,
        canApprove: true,
        canLogInterventions: true,
        canEditSchedule: true,
        canGenerateEABriefing: true,
        canUseEALoad: true,
        canViewPlanning: true,
        canViewToday: true,
        canViewUsageInsights: true,
      };
    case "ea":
      return {
        role,
        canWrite: true,
        canGenerate: false,
        canApproveMessages: false,
        canApprove: false,
        canLogInterventions: true,
        canEditSchedule: false,
        canGenerateEABriefing: true,
        canUseEALoad: true,
        canViewPlanning: false,
        canViewToday: true,
        canViewUsageInsights: true,
      };
    case "substitute":
      return {
        role,
        canWrite: true,
        canGenerate: false,
        canApproveMessages: false,
        canApprove: false,
        canLogInterventions: true,
        canEditSchedule: false,
        canGenerateEABriefing: true,
        canUseEALoad: false,
        canViewPlanning: false,
        canViewToday: true,
        canViewUsageInsights: false,
      };
    case "reviewer":
      return {
        role,
        canWrite: false,
        canGenerate: false,
        canApproveMessages: false,
        canApprove: false,
        canLogInterventions: false,
        canEditSchedule: false,
        canGenerateEABriefing: false,
        canUseEALoad: false,
        canViewPlanning: true,
        canViewToday: false,
        canViewUsageInsights: true,
      };
  }
}

/**
 * Human-readable reason a control is disabled for the active role. Use as
 * the `disabledReason` on buttons or the `title` attribute so the teacher
 * who is test-driving the role pill gets an immediate explanation.
 */
export function roleDisabledReason(role: ClassroomRole, capability: keyof RoleCapabilities): string | null {
  const caps = roleCapabilities(role);
  if (caps[capability]) return null;
  switch (role) {
    case "teacher":
      return null; // Should not happen — teacher has every capability.
    case "ea":
      return "EA role cannot perform this action. Switch to Teacher to proceed.";
    case "substitute":
      return "Substitute role can read today, log interventions, and generate an EA briefing. Other actions are reserved for the permanent teacher.";
    case "reviewer":
      return "Reviewer role is read-only. No writes, generations, or approvals.";
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
