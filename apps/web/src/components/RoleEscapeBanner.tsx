/**
 * RoleEscapeBanner — top-of-content reminder + one-click recovery when the
 * active classroom is viewed under a non-teacher role.
 *
 * Motivation: a persisted reviewer/substitute role from a previous session
 * can land fresh visitors on a tab where generation is disabled, history
 * fetches 403, and the escape hatch (the RoleContextPill in the header)
 * is easy to miss. This banner makes the escape impossible to miss:
 * an always-visible "Resume as teacher" action while a non-teacher role
 * is active.
 *
 * Not shown for teacher (no dead-end to escape). Not shown when there is
 * no active classroom (nothing to act on).
 */

import { useApp } from "../AppContext";
import type { ClassroomRole } from "../appReducer";
import SectionIcon from "./SectionIcon";
import "./RoleEscapeBanner.css";

const ROLE_LABEL: Record<ClassroomRole, string> = {
  teacher: "Teacher",
  ea: "EA",
  substitute: "Substitute",
  reviewer: "Reviewer",
};

export default function RoleEscapeBanner() {
  const { activeClassroom, activeRole, setClassroomRole } = useApp();
  if (!activeClassroom || activeRole === "teacher") return null;

  return (
    <aside
      className="role-escape-banner"
      role="status"
      aria-live="polite"
      data-testid="role-escape-banner"
    >
      <span
        className="role-escape-banner__chip"
        data-role={activeRole}
        aria-hidden="true"
      />
      <div className="role-escape-banner__copy">
        <p className="role-escape-banner__title">
          Viewing as <strong>{ROLE_LABEL[activeRole]}</strong>
        </p>
        <p className="role-escape-banner__body">
          This role has restricted access. Some tabs, actions, and history views may be hidden or read-only.
        </p>
      </div>
      <button
        type="button"
        className="role-escape-banner__action"
        onClick={() => setClassroomRole(activeClassroom, "teacher")}
        data-testid="role-escape-banner-switch"
      >
        <SectionIcon name="check" className="role-escape-banner__action-icon" />
        Resume as teacher
      </button>
    </aside>
  );
}
