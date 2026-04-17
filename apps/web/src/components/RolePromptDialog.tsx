import { useRef, useState } from "react";
import { useApp } from "../AppContext";
import { CLASSROOM_ROLES, type ClassroomRole } from "../appReducer";
import { useFocusTrap } from "../hooks/useFocusTrap";
import "./RolePromptDialog.css";

const ROLE_LABEL: Record<ClassroomRole, string> = {
  teacher: "Teacher",
  ea: "EA",
  substitute: "Substitute",
  reviewer: "Reviewer",
};

const ROLE_DESCRIPTION: Record<ClassroomRole, string> = {
  teacher: "Full planning, approval, and intervention access",
  ea: "Support and logging only; no message approvals or schedule edits",
  substitute: "Today view and logging; approvals restricted",
  reviewer: "Read-only access; no write actions",
};

interface Props {
  classroomId: string;
}

export default function RolePromptDialog({ classroomId }: Props) {
  const { setClassroomRole, dispatch } = useApp();
  const [selected, setSelected] = useState<ClassroomRole>("teacher");
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);

  function handleConfirm() {
    setClassroomRole(classroomId, selected);
    dispatch({ type: "CLOSE_ROLE_PROMPT" });
  }

  function handleSkip() {
    setClassroomRole(classroomId, "teacher");
    dispatch({ type: "CLOSE_ROLE_PROMPT" });
  }

  return (
    <div className="role-prompt-overlay" aria-hidden="false">
      <div
        className="role-prompt-dialog"
        ref={dialogRef}
        role="dialog"
        aria-label="Choose your role"
        aria-modal="true"
      >
        <h2 className="role-prompt-dialog__title">What is your role in this classroom?</h2>
        <p className="role-prompt-dialog__subtitle">
          Your role controls which write actions you can take. You can change it anytime from the header pill.
        </p>

        <fieldset className="role-prompt-dialog__options">
          <legend className="sr-only">Classroom role</legend>
          {CLASSROOM_ROLES.map((role) => (
            <label key={role} className={`role-prompt-dialog__option${selected === role ? " role-prompt-dialog__option--selected" : ""}`}>
              <input
                type="radio"
                name="role"
                value={role}
                checked={selected === role}
                onChange={() => setSelected(role)}
                className="role-prompt-dialog__radio"
              />
              <span className="role-prompt-dialog__option-chip" data-role={role} aria-hidden="true" />
              <span className="role-prompt-dialog__option-copy">
                <span className="role-prompt-dialog__option-label">{ROLE_LABEL[role]}</span>
                <span className="role-prompt-dialog__option-desc">{ROLE_DESCRIPTION[role]}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="role-prompt-dialog__actions">
          <button
            type="button"
            className="btn btn--primary role-prompt-dialog__confirm"
            onClick={handleConfirm}
          >
            Confirm role
          </button>
          <button
            type="button"
            className="btn btn--ghost role-prompt-dialog__skip"
            onClick={handleSkip}
            data-testid="role-prompt-skip"
          >
            Skip (default to Teacher)
          </button>
        </div>
      </div>
    </div>
  );
}
