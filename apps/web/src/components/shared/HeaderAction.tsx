import type { ReactNode } from "react";
import "./HeaderAction.css";

interface Props {
  label: string;
  onClick: () => void;
  kbd?: string;
  iconOnly?: boolean;
  children?: ReactNode;
  "data-testid"?: string;
}

export default function HeaderAction({
  label,
  onClick,
  kbd,
  iconOnly = false,
  children,
  "data-testid": testId,
}: Props) {
  return (
    <button
      type="button"
      className={`header-action${iconOnly ? " header-action--icon-only" : ""}`}
      onClick={onClick}
      aria-label={iconOnly ? label : undefined}
      title={label}
      data-testid={testId}
    >
      {children ? (
        <span className="header-action__icon" aria-hidden="true">
          {children}
        </span>
      ) : null}
      {!iconOnly ? <span className="header-action__label">{label}</span> : null}
      {kbd ? (
        <kbd className="header-action__kbd" aria-hidden="true">
          {kbd}
        </kbd>
      ) : null}
    </button>
  );
}
