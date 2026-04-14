import React from "react";

interface StudentAvatarProps {
  alias: string;
  selected: boolean;
  onToggle: (alias: string) => void;
  disabled?: boolean;
}

export default function StudentAvatar({
  alias,
  selected,
  onToggle,
  disabled,
}: StudentAvatarProps): React.ReactElement {
  const trimmed = alias.trim();
  const initial = trimmed.length > 0 ? trimmed[0].toUpperCase() : "?";
  const label = selected ? `Unselect ${alias}` : `Select ${alias}`;

  return (
    <button
      type="button"
      className={`student-avatar${selected ? " student-avatar--selected" : ""}`}
      aria-pressed={selected}
      aria-label={label}
      onClick={() => onToggle(alias)}
      disabled={disabled}
    >
      <span className="student-avatar__initial" aria-hidden="true">
        {initial}
      </span>
      <span className="student-avatar__name">{alias}</span>
    </button>
  );
}
