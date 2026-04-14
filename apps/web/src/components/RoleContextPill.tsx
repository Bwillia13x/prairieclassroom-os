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

export default function RoleContextPill() {
  const { activeClassroom, activeRole, setClassroomRole } = useApp();
  const [open, setOpen] = useState(false);
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

  function handleSelect(role: ClassroomRole) {
    if (!activeClassroom) return;
    setClassroomRole(activeClassroom, role);
    setOpen(false);
  }

  return (
    <div className="role-pill-anchor" ref={anchorRef}>
      <button
        type="button"
        className={`role-pill${open ? " role-pill--open" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Current role: ${ROLE_LABEL[activeRole]}. Change classroom role.`}
        onClick={() => setOpen((v) => !v)}
        disabled={!activeClassroom}
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
                <span className="role-pill__option-chip" data-role={role} aria-hidden="true" />
                <span className="role-pill__option-copy">
                  <span className="role-pill__option-label">{ROLE_LABEL[role]}</span>
                  <span className="role-pill__option-hint">{ROLE_HINT[role]}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
