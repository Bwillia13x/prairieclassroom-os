import { useEffect, useRef, useState } from "react";
import { useApp } from "../AppContext";
import { CLASSROOM_ROLES, type ClassroomRole } from "../appReducer";
import SectionIcon from "./SectionIcon";
import "./RoleContextPill.css";

const ROLE_LABEL: Record<ClassroomRole, string> = {
  teacher: "Teacher",
  ea: "EA",
  substitute: "Substitute",
  reviewer: "Reviewer",
};

const ROLE_HINT: Record<ClassroomRole, string> = {
  teacher: "Full planning, approval, and intervention access",
  ea: "Support and logging only; no message approvals or schedule edits",
  substitute: "Today view and logging; approvals restricted",
  reviewer: "Read-only access; no write actions",
};

/**
 * Downgrading from the teacher role loses meaningful capabilities (generation,
 * approvals, schedule edits, owner surfaces). Require an explicit confirm so
 * the user doesn't land on a narrowed view by accident. Upgrading to teacher
 * or switching between non-teacher roles is a silent, one-click change.
 */
function needsConfirmation(from: ClassroomRole, to: ClassroomRole): boolean {
  return from === "teacher" && to !== "teacher";
}

export default function RoleContextPill() {
  const { activeClassroom, activeRole, setClassroomRole } = useApp();
  const [open, setOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<ClassroomRole | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointer(event: MouseEvent) {
      if (!anchorRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function applyRole(role: ClassroomRole) {
    if (!activeClassroom) return;
    setClassroomRole(activeClassroom, role);
    setOpen(false);
    setPendingRole(null);
  }

  function handleSelect(role: ClassroomRole) {
    if (!activeClassroom) return;
    if (role === activeRole) {
      setOpen(false);
      return;
    }
    if (needsConfirmation(activeRole, role)) {
      setPendingRole(role);
      return;
    }
    applyRole(role);
  }

  return (
    <div className="role-pill-anchor" ref={anchorRef}>
      <button
        type="button"
        className={`role-pill${open ? " role-pill--open" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        disabled={!activeClassroom}
        title="Change classroom role"
      >
        <span className="role-pill__chip" data-role={activeRole} aria-hidden="true" />
        <span className="role-pill__copy">
          <span className="role-pill__eyebrow">Role</span>
          <span className="role-pill__label">{ROLE_LABEL[activeRole]}</span>
        </span>
        <span className="role-pill__caret" aria-hidden="true">⌄</span>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Classroom role"
          className="role-pill__menu"
        >
          <p className="role-pill__menu-header">
            <SectionIcon name="info" className="role-pill__menu-icon" />
            Role controls what you can write back to this classroom.
          </p>
          {CLASSROOM_ROLES.map((role) => {
            const selected = role === activeRole;
            return (
              <button
                key={role}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className={`role-pill__option${selected ? " role-pill__option--selected" : ""}`}
                onClick={() => handleSelect(role)}
              >
                <span
                  className={`role-pill__option-radio${selected ? " role-pill__option-radio--on" : ""}`}
                  aria-hidden="true"
                />
                <span className="role-pill__option-copy">
                  <span className="role-pill__option-label">
                    {ROLE_LABEL[role]}
                    {selected ? (
                      <span className="role-pill__option-active-tag">[ACTIVE]</span>
                    ) : null}
                  </span>
                  <span className="role-pill__option-hint">{ROLE_HINT[role]}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {pendingRole ? (
        <div
          role="alertdialog"
          aria-label="Confirm role downgrade"
          aria-modal="true"
          className="role-pill__confirm"
        >
          <p className="role-pill__confirm-title">
            Switch from <strong>Teacher</strong> to <strong>{ROLE_LABEL[pendingRole]}</strong>?
          </p>
          <p className="role-pill__confirm-body">
            {pendingRole === "reviewer"
              ? "You will lose write access: no generation, no approvals, no intervention logging, no schedule edits."
              : pendingRole === "substitute"
              ? "You will lose access to planning, family messaging, support patterns, and survival-packet generation. You can still log interventions and view today."
              : "You will lose generation and approval access. You can still log interventions and view today."}
            {" Switch back anytime from this pill."}
          </p>
          <div className="role-pill__confirm-actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setPendingRole(null)}
              data-testid="role-pill-cancel-downgrade"
            >
              Stay as Teacher
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => applyRole(pendingRole)}
              data-testid="role-pill-confirm-downgrade"
            >
              Switch to {ROLE_LABEL[pendingRole]}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
