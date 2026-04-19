import React from "react";

interface StudentAvatarProps {
  alias: string;
  selected: boolean;
  onToggle: (alias: string) => void;
  disabled?: boolean;
  /**
   * Follow-up signal derived from the Today snapshot. "priority" renders
   * an amber corner dot; "stale" renders a red corner dot. Name-only
   * visuals are preserved — the dot is a small affordance, not a label.
   * 2026-04-19 OPS audit phase 7.1.
   */
  flag?: "priority" | "stale";
}

function flagLabel(alias: string, flag?: "priority" | "stale"): string {
  if (flag === "stale") return `${alias} — stale follow-up`;
  if (flag === "priority") return `${alias} — priority follow-up`;
  return alias;
}

export default function StudentAvatar({
  alias,
  selected,
  onToggle,
  disabled,
  flag,
}: StudentAvatarProps): React.ReactElement {
  const trimmed = alias.trim();
  const initial = trimmed.length > 0 ? trimmed[0].toUpperCase() : "?";
  const described = flagLabel(alias, flag);
  const label = selected ? `Unselect ${described}` : `Select ${described}`;

  return (
    <button
      type="button"
      className={`student-avatar${selected ? " student-avatar--selected" : ""}${flag ? ` student-avatar--${flag}` : ""}`}
      aria-pressed={selected}
      aria-label={label}
      onClick={() => onToggle(alias)}
      disabled={disabled}
      data-flag={flag}
    >
      <span className="student-avatar__initial" aria-hidden="true">
        {initial}
      </span>
      <span className="student-avatar__name">{alias}</span>
      {flag ? (
        <span
          className={`student-avatar__dot student-avatar__dot--${flag}`}
          aria-hidden="true"
        />
      ) : null}
    </button>
  );
}
