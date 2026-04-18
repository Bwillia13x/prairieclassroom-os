/**
 * RoleReadOnlyBanner — shown at the top of a panel whose primary controls are
 * disabled for the active role. Uses the per-capability `roleDisabledReason`
 * copy so the banner explains *why* the role landed on a view with no
 * generate button, rather than letting the disabled button flash silently.
 *
 * Distinct from `MockModeBanner`: this is a *scope* banner, not a *lane*
 * banner. They can coexist on the same panel — a reviewer in mock mode sees
 * both.
 */

import type { RoleCapabilities } from "../hooks/useRole";
import { roleDisabledReason } from "../hooks/useRole";
import "./RoleReadOnlyBanner.css";

interface Props {
  /** Capability the panel needs. If the active role has it, banner hides. */
  required: keyof RoleCapabilities;
  /** Active role & capabilities for gating. */
  role: RoleCapabilities;
  /** Short sentence describing what the teacher would do here — used as the
   *  contextual part of the message. */
  whatIsBlocked: string;
}

export default function RoleReadOnlyBanner({ role, required, whatIsBlocked }: Props) {
  if (role[required]) return null;
  const reason = roleDisabledReason(role.role, required) ?? "This action is not available for the active role.";
  return (
    <aside className="role-readonly-banner" role="status" aria-live="polite">
      <span className="role-readonly-banner__chip" data-role={role.role} aria-hidden="true" />
      <div className="role-readonly-banner__copy">
        <p className="role-readonly-banner__title">
          <strong>Read-only for the active role.</strong> {whatIsBlocked}
        </p>
        <p className="role-readonly-banner__reason">{reason}</p>
      </div>
    </aside>
  );
}
